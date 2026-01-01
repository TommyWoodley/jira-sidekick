import * as vscode from 'vscode';
import { IssueCache } from '../core/cache';

export class StatusBarManager {
    private readonly statusBarItem: vscode.StatusBarItem;

    constructor(private readonly cache: IssueCache) {
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Left,
            100
        );
        this.statusBarItem.command = 'jira-sidekick.refresh';
        this.statusBarItem.tooltip = 'Click to refresh Jira issues';

        cache.onDidChange(() => this.update());
        this.update();
    }

    update(): void {
        const count = this.cache.getIssueCount();
        if (count === 0) {
            this.statusBarItem.text = '$(issues) Jira: No issues';
        } else {
            this.statusBarItem.text = `$(issues) Jira: ${count} issue${count === 1 ? '' : 's'}`;
        }
    }

    show(): void {
        this.statusBarItem.show();
    }

    hide(): void {
        this.statusBarItem.hide();
    }

    dispose(): void {
        this.statusBarItem.dispose();
    }
}

