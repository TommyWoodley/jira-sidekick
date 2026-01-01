import * as vscode from 'vscode';
import { JiraClient, JiraClientError } from '../jira/client';
import { AuthService } from '../jira/auth';
import { JiraIssue } from '../jira/types';
import { IssueCache } from '../core/cache';
import { ConfigPanel } from './configPanel';

export class CommandsManager {
    private extensionUri: vscode.Uri | undefined;

    constructor(
        private readonly authService: AuthService,
        private readonly client: JiraClient,
        private readonly cache: IssueCache
    ) {}

    registerCommands(context: vscode.ExtensionContext): void {
        this.extensionUri = context.extensionUri;

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
        if (!this.extensionUri) {
            return;
        }

        await ConfigPanel.show(
            this.extensionUri,
            this.authService,
            this.client,
            () => this.refresh()
        );
    }

    openInBrowser(issue: JiraIssue): void {
        if (!issue) {
            return;
        }
        const url = issue.self.replace('/rest/api/3/issue/', '/browse/').replace(/\/\d+$/, `/${issue.key}`);
        vscode.env.openExternal(vscode.Uri.parse(url));
    }
}
