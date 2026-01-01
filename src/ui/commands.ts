import * as vscode from 'vscode';
import { JiraClient } from '../jira/client';
import { AuthService } from '../jira/auth';
import { JiraIssue } from '../jira/types';
import { IssueCache } from '../core/cache';
import { ConfigPanel } from './configPanel';
import { IssuePanel } from './issuePanel';

export class CommandsManager {
    private static readonly DOUBLE_CLICK_THRESHOLD = 400;
    private extensionUri: vscode.Uri | undefined;
    private lastClickTime = 0;
    private lastClickedKey: string | null = null;

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
            vscode.commands.registerCommand('jira-sidekick.openInBrowser', (issue: JiraIssue) => this.openInBrowser(issue)),
            vscode.commands.registerCommand('jira-sidekick.handleIssueClick', (issue: JiraIssue) => this.handleIssueClick(issue)),
            vscode.commands.registerCommand('jira-sidekick.openIssue', (issue: JiraIssue) => this.openIssuePreview(issue)),
            vscode.commands.registerCommand('jira-sidekick.openIssuePinned', (issue: JiraIssue) => this.openIssuePinned(issue))
        );
    }

    private async handleIssueClick(issue: JiraIssue): Promise<void> {
        if (!issue) {
            return;
        }

        const now = Date.now();
        const isDoubleClick =
            this.lastClickedKey === issue.key &&
            (now - this.lastClickTime) < CommandsManager.DOUBLE_CLICK_THRESHOLD;

        if (isDoubleClick) {
            this.lastClickedKey = null;
            this.lastClickTime = 0;
            await this.openIssuePinned(issue);
        } else {
            this.lastClickedKey = issue.key;
            this.lastClickTime = now;
            await this.openIssuePreview(issue);
        }
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

        let jql: string;
        const selectedFilterId = await this.authService.getSelectedFilter();

        if (selectedFilterId) {
            const filterResult = await this.client.getFilterById(selectedFilterId);
            if (filterResult.success) {
                jql = filterResult.data.jql;
            } else {
                jql = vscode.workspace.getConfiguration('jira-sidekick').get<string>('jql')
                    || 'assignee = currentUser() ORDER BY updated DESC';
            }
        } else {
            jql = vscode.workspace.getConfiguration('jira-sidekick').get<string>('jql')
                || 'assignee = currentUser() ORDER BY updated DESC';
        }

        const searchResult = await this.client.searchIssues(jql);
        if (searchResult.success) {
            this.cache.setIssues(searchResult.data.issues);
            vscode.window.setStatusBarMessage(`Jira: Loaded ${searchResult.data.issues.length} issues`, 3000);
        } else {
            const error = searchResult.error;
            const action = await vscode.window.showErrorMessage(
                `Jira Error: ${error.message}`,
                error.statusCode === 401 ? 'Configure' : 'Retry'
            );
            if (action === 'Configure') {
                await this.configure();
            } else if (action === 'Retry') {
                await this.refresh();
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

    async openIssuePreview(issue: JiraIssue): Promise<void> {
        if (!issue || !this.extensionUri) {
            return;
        }
        await IssuePanel.showPreview(
            this.extensionUri,
            this.client,
            issue.key,
            issue.fields.summary,
            (i) => this.openInBrowser(i)
        );
    }

    async openIssuePinned(issue: JiraIssue): Promise<void> {
        if (!issue || !this.extensionUri) {
            return;
        }
        await IssuePanel.showPinned(
            this.extensionUri,
            this.client,
            issue.key,
            issue.fields.summary,
            (i) => this.openInBrowser(i)
        );
    }
}
