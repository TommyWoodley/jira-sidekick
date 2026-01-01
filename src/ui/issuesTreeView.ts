import * as vscode from 'vscode';
import { JiraIssue } from '../jira/types';
import { IssueCache } from '../core/cache';

export class IssueTreeItem extends vscode.TreeItem {
    constructor(public readonly issue: JiraIssue) {
        super(issue.key, vscode.TreeItemCollapsibleState.None);

        this.description = issue.fields.summary;
        this.tooltip = this.createTooltip();
        this.contextValue = 'issue';

        this.command = {
            command: 'jira-sidekick.openIssue',
            title: 'Open Issue',
            arguments: [issue]
        };

        this.iconPath = this.getStatusIcon();
    }

    private createTooltip(): vscode.MarkdownString {
        const md = new vscode.MarkdownString();
        md.appendMarkdown(`**${this.issue.key}**: ${this.issue.fields.summary}\n\n`);
        md.appendMarkdown(`**Status:** ${this.issue.fields.status.name}\n\n`);
        if (this.issue.fields.assignee) {
            md.appendMarkdown(`**Assignee:** ${this.issue.fields.assignee.displayName}\n\n`);
        }
        if (this.issue.fields.priority) {
            md.appendMarkdown(`**Priority:** ${this.issue.fields.priority.name}\n\n`);
        }
        return md;
    }

    private getStatusIcon(): vscode.ThemeIcon {
        const category = this.issue.fields.status.statusCategory.key;
        switch (category) {
            case 'done':
                return new vscode.ThemeIcon('check', new vscode.ThemeColor('charts.green'));
            case 'indeterminate':
                return new vscode.ThemeIcon('sync', new vscode.ThemeColor('charts.blue'));
            default:
                return new vscode.ThemeIcon('circle-outline');
        }
    }
}

export class IssuesTreeDataProvider implements vscode.TreeDataProvider<IssueTreeItem> {
    private readonly _onDidChangeTreeData = new vscode.EventEmitter<IssueTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    constructor(private readonly cache: IssueCache) {
        cache.onDidChange(() => this.refresh());
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: IssueTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(): IssueTreeItem[] {
        const issues = this.cache.getIssues();
        return issues.map(issue => new IssueTreeItem(issue));
    }

    dispose(): void {
        this._onDidChangeTreeData.dispose();
    }
}

