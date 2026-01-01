import * as vscode from 'vscode';
import { JiraClient, JiraClientError } from '../jira/client';
import { AuthService } from '../jira/auth';
import { JiraCredentials, JiraIssue } from '../jira/types';
import { IssueCache } from '../core/cache';

export class CommandsManager {
    constructor(
        private readonly authService: AuthService,
        private readonly client: JiraClient,
        private readonly cache: IssueCache
    ) {}

    registerCommands(context: vscode.ExtensionContext): void {
        context.subscriptions.push(
            vscode.commands.registerCommand('jira-sidekick.refresh', () => this.refresh()),
            vscode.commands.registerCommand('jira-sidekick.configure', () => this.configure()),
            vscode.commands.registerCommand('jira-sidekick.openInBrowser', (issue: JiraIssue) => this.openInBrowser(issue))
        );
    }

    async refresh(): Promise<void> {
        const hasCredentials = await this.authService.hasCredentials();
        if (!hasCredentials) {
            const action = await vscode.window.showWarningMessage(
                'Jira credentials not configured.',
                'Configure'
            );
            if (action === 'Configure') {
                await this.configure();
            }
            return;
        }

        try {
            const jql = vscode.workspace.getConfiguration('jira-sidekick').get<string>('jql') 
                || 'assignee = currentUser() ORDER BY updated DESC';
            
            const response = await this.client.searchIssues(jql);
            this.cache.setIssues(response.issues);
            
            vscode.window.setStatusBarMessage(`Jira: Loaded ${response.issues.length} issues`, 3000);
        } catch (error) {
            if (error instanceof JiraClientError) {
                const action = await vscode.window.showErrorMessage(
                    `Jira Error: ${error.message}`,
                    error.statusCode === 401 ? 'Configure' : 'Retry'
                );
                if (action === 'Configure') {
                    await this.configure();
                } else if (action === 'Retry') {
                    await this.refresh();
                }
            } else {
                vscode.window.showErrorMessage(`Failed to fetch issues: ${error}`);
            }
        }
    }

    async configure(): Promise<void> {
        const existingCredentials = await this.authService.getCredentials();

        const baseUrl = await vscode.window.showInputBox({
            prompt: 'Enter your Jira Cloud URL',
            placeHolder: 'https://your-domain.atlassian.net',
            value: existingCredentials?.baseUrl || '',
            validateInput: (value) => {
                if (!value) {
                    return 'URL is required';
                }
                try {
                    new URL(value);
                    return null;
                } catch {
                    return 'Please enter a valid URL';
                }
            }
        });
        if (!baseUrl) {
            return;
        }

        const email = await vscode.window.showInputBox({
            prompt: 'Enter your Jira email',
            placeHolder: 'you@example.com',
            value: existingCredentials?.email || '',
            validateInput: (value) => value ? null : 'Email is required'
        });
        if (!email) {
            return;
        }

        const apiToken = await vscode.window.showInputBox({
            prompt: 'Enter your Jira API token',
            placeHolder: 'Your API token from id.atlassian.com',
            password: true,
            validateInput: (value) => value ? null : 'API token is required'
        });
        if (!apiToken) {
            return;
        }

        const credentials: JiraCredentials = { baseUrl, email, apiToken };
        await this.authService.setCredentials(credentials);

        const isValid = await this.client.testConnection();
        if (isValid) {
            vscode.window.showInformationMessage('Jira credentials saved successfully!');
            await this.refresh();
        } else {
            const action = await vscode.window.showErrorMessage(
                'Failed to connect to Jira. Please check your credentials.',
                'Try Again',
                'Keep Anyway'
            );
            if (action === 'Try Again') {
                await this.authService.clearCredentials();
                await this.configure();
            }
        }
    }

    openInBrowser(issue: JiraIssue): void {
        if (!issue) {
            return;
        }
        const url = issue.self.replace('/rest/api/3/issue/', '/browse/').replace(/\/\d+$/, `/${issue.key}`);
        vscode.env.openExternal(vscode.Uri.parse(url));
    }
}

