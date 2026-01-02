import * as vscode from 'vscode';
import { JiraClient } from '../jira/client';
import { AuthService } from '../jira/auth';
import { JiraIssue } from '../jira/types';
import { IssueCache } from '../core/cache';
import { ConfigPanel } from './configPanel';
import { IssuePanel } from './issuePanel';

export class CommandsManager {
    private static readonly DOUBLE_CLICK_THRESHOLD = 400;
    private static readonly DEFAULT_JQL = 'assignee = currentUser() ORDER BY updated DESC';
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
            vscode.commands.registerCommand('jira-sidekick.openIssuePinned', (issue: JiraIssue) => this.openIssuePinned(issue)),
            vscode.commands.registerCommand('jira-sidekick.transitionIssue', (issue?: JiraIssue) => this.transitionIssue(issue))
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

    private async getJql(): Promise<string> {
        const selectedFilterId = await this.authService.getSelectedFilter();
        if (selectedFilterId) {
            const filterResult = await this.client.getFilterById(selectedFilterId);
            if (filterResult.success) {
                return filterResult.data.jql;
            }
        }
        return vscode.workspace.getConfiguration('jira-sidekick').get<string>('jql')
            || CommandsManager.DEFAULT_JQL;
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

        const jql = await this.getJql();
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

    async transitionIssue(issue?: JiraIssue): Promise<void> {
        let selectedIssue = issue;

        if (!selectedIssue) {
            const issues = this.cache.getIssues();
            if (issues.length === 0) {
                vscode.window.showWarningMessage('No issues available. Please refresh first.');
                return;
            }

            const issueItems = issues.map(i => ({
                label: i.key,
                description: i.fields.summary,
                detail: `Status: ${i.fields.status.name}`,
                issue: i
            }));

            const selected = await vscode.window.showQuickPick(issueItems, {
                placeHolder: 'Select an issue to transition',
                matchOnDescription: true
            });

            if (!selected) {
                return;
            }
            selectedIssue = selected.issue;
        }

        const transitionsResult = await this.client.getTransitions(selectedIssue.key);
        if (!transitionsResult.success) {
            vscode.window.showErrorMessage(`Failed to get transitions: ${transitionsResult.error.message}`);
            return;
        }

        const transitions = transitionsResult.data;
        if (transitions.length === 0) {
            vscode.window.showInformationMessage('No transitions available for this issue.');
            return;
        }

        const transitionItems = transitions.map(t => ({
            label: t.name,
            description: `→ ${t.to.name}`,
            transition: t
        }));

        const selectedTransition = await vscode.window.showQuickPick(transitionItems, {
            placeHolder: `Transition ${selectedIssue.key} to...`
        });

        if (!selectedTransition) {
            return;
        }

        const result = await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: `Transitioning ${selectedIssue.key} to ${selectedTransition.transition.to.name}...`,
                cancellable: false
            },
            async () => {
                return await this.client.transitionIssue(selectedIssue!.key, selectedTransition.transition.id);
            }
        );

        if (result.success) {
            vscode.window.showInformationMessage(
                `${selectedIssue.key} transitioned to ${selectedTransition.transition.to.name}`
            );
            await this.refresh();
        } else {
            vscode.window.showErrorMessage(`Failed to transition: ${result.error.message}`);
        }
    }
}
