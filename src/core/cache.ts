import * as vscode from 'vscode';
import { JiraIssue } from '../jira/types';
import { IIssueCache } from './interfaces';

export class IssueCache implements IIssueCache {
    private issues: JiraIssue[] = [];
    private readonly _onDidChange = new vscode.EventEmitter<JiraIssue[]>();
    readonly onDidChange = this._onDidChange.event;

    setIssues(issues: JiraIssue[]): void {
        this.issues = issues;
        this._onDidChange.fire(this.issues);
    }

    getIssues(): JiraIssue[] {
        return this.issues;
    }

    getIssueCount(): number {
        return this.issues.length;
    }

    clear(): void {
        this.issues = [];
        this._onDidChange.fire(this.issues);
    }

    dispose(): void {
        this._onDidChange.dispose();
    }
}

