import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
import { JiraIssue } from '../jira/types';
import { JiraClient } from '../jira/client';

export class IssuePanel {
    public static currentPanel: IssuePanel | undefined;
    private readonly panel: vscode.WebviewPanel;
    private disposables: vscode.Disposable[] = [];
    private currentIssue: JiraIssue | undefined;

    private constructor(
        panel: vscode.WebviewPanel,
        private readonly extensionUri: vscode.Uri,
        private readonly client: JiraClient,
        private readonly onOpenInBrowser: (issue: JiraIssue) => void
    ) {
        this.panel = panel;
        this.panel.webview.html = this.getWebviewContent();
        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

        this.panel.webview.onDidReceiveMessage(
            async (message) => {
                switch (message.command) {
                    case 'refresh':
                        if (this.currentIssue) {
                            await this.loadIssue(this.currentIssue.key);
                        }
                        break;
                    case 'openInBrowser':
                        if (this.currentIssue) {
                            this.onOpenInBrowser(this.currentIssue);
                        }
                        break;
                    case 'openAttachment':
                        if (message.url) {
                            vscode.env.openExternal(vscode.Uri.parse(message.url));
                        }
                        break;
                    case 'saveAttachment':
                        if (message.attachment) {
                            await this.handleSaveAttachment(message.attachment);
                        }
                        break;
                }
            },
            null,
            this.disposables
        );
    }

    public static async show(
        extensionUri: vscode.Uri,
        client: JiraClient,
        issueKey: string,
        onOpenInBrowser: (issue: JiraIssue) => void
    ): Promise<void> {
        if (IssuePanel.currentPanel) {
            IssuePanel.currentPanel.panel.reveal();
            await IssuePanel.currentPanel.loadIssue(issueKey);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'jiraSidekickIssue',
            `Loading ${issueKey}...`,
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'out', 'webview-ui')]
            }
        );

        IssuePanel.currentPanel = new IssuePanel(panel, extensionUri, client, onOpenInBrowser);
        await IssuePanel.currentPanel.loadIssue(issueKey);
    }

    private async loadIssue(issueKey: string): Promise<void> {
        this.panel.webview.postMessage({ command: 'loading', issueKey });

        try {
            const issue = await this.client.getIssue(issueKey);
            this.currentIssue = issue;
            const maxLength = vscode.workspace.getConfiguration('jira-sidekick').get<number>('maxTabTitleLength', 30);
            const truncatedSummary = this.truncateText(issue.fields.summary, maxLength);
            this.panel.title = `${issue.key}: ${truncatedSummary}`;

            // Pass issue with raw ADF description directly to webview
            this.panel.webview.postMessage({
                command: 'loadIssue',
                issue
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.panel.webview.postMessage({ command: 'error', issueKey, message });
        }
    }

    private getWebviewContent(): string {
        const webview = this.panel.webview;
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionUri, 'out', 'webview-ui', 'issue-app.js')
        );

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Issue Panel</title>
</head>
<body>
    <issue-app></issue-app>
    <script src="${scriptUri}"></script>
</body>
</html>`;
    }

    private truncateText(text: string, maxLength: number): string {
        if (maxLength <= 0 || text.length <= maxLength) {
            return text;
        }
        return text.slice(0, maxLength) + '...';
    }

    private async handleSaveAttachment(attachment: { id: string; filename: string; content: string }): Promise<void> {
        const folderUri = await vscode.window.showOpenDialog({
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            openLabel: 'Save here',
            title: `Save ${attachment.filename} to...`
        });

        if (!folderUri || folderUri.length === 0) {
            return;
        }

        const targetFolder = folderUri[0].fsPath;
        const targetPath = path.join(targetFolder, attachment.filename);

        try {
            await vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: `Downloading ${attachment.filename}...`,
                    cancellable: false
                },
                async () => {
                    const buffer = await this.client.downloadAttachment(attachment.content);
                    await fs.writeFile(targetPath, buffer);
                }
            );

            const openFile = await vscode.window.showInformationMessage(
                `Saved ${attachment.filename}`,
                'Open File',
                'Open Folder'
            );

            if (openFile === 'Open File') {
                const doc = await vscode.workspace.openTextDocument(targetPath);
                await vscode.window.showTextDocument(doc);
            } else if (openFile === 'Open Folder') {
                await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(targetPath));
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`Failed to save attachment: ${message}`);
        }
    }

    public dispose(): void {
        IssuePanel.currentPanel = undefined;
        this.panel.dispose();
        while (this.disposables.length) {
            const x = this.disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }
}

