import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
import { JiraClient } from '../jira/client';
import type { IssueApi } from '../shared/api';
import type { JiraIssue } from '../shared/models';
import { exposeApi } from '../shared/rpc';

export class IssuePanel {
    public static currentPanel: IssuePanel | undefined;
    private readonly panel: vscode.WebviewPanel;
    private disposables: vscode.Disposable[] = [];
    private currentIssue: JiraIssue | undefined;
    private currentIssueKey: string;

    private constructor(
        panel: vscode.WebviewPanel,
        private readonly extensionUri: vscode.Uri,
        private readonly client: JiraClient,
        private readonly onOpenInBrowser: (issue: JiraIssue) => void,
        issueKey: string
    ) {
        this.panel = panel;
        this.currentIssueKey = issueKey;
        this.panel.webview.html = this.getWebviewContent();
        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

        const apiDisposable = exposeApi<IssueApi>(this.panel.webview, this.createApi());
        this.disposables.push(apiDisposable);
    }

    private createApi(): IssueApi {
        return {
            loadIssue: async (issueKey: string) => {
                this.currentIssueKey = issueKey;
                const issue = await this.client.getIssue(issueKey);
                this.currentIssue = issue;

                const maxLength = vscode.workspace.getConfiguration('jira-sidekick').get<number>('maxTabTitleLength', 30);
                const truncatedSummary = this.truncateText(issue.fields.summary, maxLength);
                this.panel.title = `${issue.key}: ${truncatedSummary}`;

                const attachmentMaps = this.buildAttachmentMaps(issue);
                const mediaInfo = this.extractMediaInfo(issue.fields.description);
                const imageMap = await this.prefetchImages(mediaInfo, attachmentMaps, 3);

                return { issue, imageMap };
            },

            refresh: async () => {
                if (!this.currentIssueKey) {
                    throw new Error('No issue loaded');
                }
                const issue = await this.client.getIssue(this.currentIssueKey);
                this.currentIssue = issue;

                const attachmentMaps = this.buildAttachmentMaps(issue);
                const mediaInfo = this.extractMediaInfo(issue.fields.description);
                const imageMap = await this.prefetchImages(mediaInfo, attachmentMaps, 3);

                return { issue, imageMap };
            },

            openInBrowser: () => {
                if (this.currentIssue) {
                    this.onOpenInBrowser(this.currentIssue);
                }
            },

            openAttachment: (url: string) => {
                vscode.env.openExternal(vscode.Uri.parse(url));
            },

            saveAttachment: async (attachment: { id: string; filename: string; content: string }) => {
                await this.handleSaveAttachment(attachment);
            },
        };
    }

    public static async show(
        extensionUri: vscode.Uri,
        client: JiraClient,
        issueKey: string,
        onOpenInBrowser: (issue: JiraIssue) => void
    ): Promise<void> {
        if (IssuePanel.currentPanel) {
            IssuePanel.currentPanel.panel.reveal();
            IssuePanel.currentPanel.currentIssueKey = issueKey;
            IssuePanel.currentPanel.panel.webview.html = IssuePanel.currentPanel.getWebviewContent();
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

        IssuePanel.currentPanel = new IssuePanel(panel, extensionUri, client, onOpenInBrowser, issueKey);
    }

    private getWebviewContent(): string {
        const webview = this.panel.webview;
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionUri, 'out', 'webview-ui', 'issue-app.js')
        );

        const issueKey = this.currentIssueKey || '';

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Issue Panel</title>
</head>
<body>
    <issue-app data-issue-key="${issueKey}"></issue-app>
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

    private extractMediaInfo(adf: unknown): Array<{ id: string; filename?: string }> {
        const mediaInfo: Array<{ id: string; filename?: string }> = [];

        const traverse = (node: unknown) => {
            if (!node || typeof node !== 'object') return;

            const n = node as { type?: string; attrs?: { id?: string; alt?: string }; content?: unknown[] };

            if (n.type === 'media' && n.attrs) {
                const id = n.attrs.id;
                const filename = n.attrs.alt;
                if (id) {
                    mediaInfo.push({ id, filename });
                }
            }

            if (n.content && Array.isArray(n.content)) {
                for (const child of n.content) {
                    traverse(child);
                }
            }
        };

        traverse(adf);
        return mediaInfo;
    }

    private buildAttachmentMaps(issue: JiraIssue): {
        byId: Record<string, string>;
        byFilename: Record<string, string>;
    } {
        const byId: Record<string, string> = {};
        const byFilename: Record<string, string> = {};

        for (const att of issue.fields.attachment || []) {
            byId[att.id] = att.content;
            byFilename[att.filename.toLowerCase()] = att.content;
        }

        return { byId, byFilename };
    }

    private async prefetchImages(
        mediaInfo: Array<{ id: string; filename?: string }>,
        attachmentMaps: { byId: Record<string, string>; byFilename: Record<string, string> },
        maxCount: number
    ): Promise<Record<string, string>> {
        const imageMap: Record<string, string> = {};
        const toFetch = mediaInfo.slice(0, maxCount);

        const results = await Promise.allSettled(
            toFetch.map(async ({ id, filename }) => {
                let contentUrl = attachmentMaps.byId[id];
                if (!contentUrl && filename) {
                    contentUrl = attachmentMaps.byFilename[filename.toLowerCase()];
                }

                if (!contentUrl) {
                    return { id, dataUrl: null };
                }

                try {
                    const buffer = await this.client.downloadAttachment(contentUrl);
                    const mimeType = this.getMimeType(contentUrl);
                    const base64 = buffer.toString('base64');
                    return { id, dataUrl: `data:${mimeType};base64,${base64}` };
                } catch {
                    return { id, dataUrl: null };
                }
            })
        );

        for (const result of results) {
            if (result.status === 'fulfilled' && result.value.dataUrl) {
                imageMap[result.value.id] = result.value.dataUrl;
            }
        }

        return imageMap;
    }

    private getMimeType(url: string): string {
        const urlLower = url.toLowerCase();
        if (urlLower.includes('.jpg') || urlLower.includes('.jpeg')) {
            return 'image/jpeg';
        } else if (urlLower.includes('.gif')) {
            return 'image/gif';
        } else if (urlLower.includes('.webp')) {
            return 'image/webp';
        } else if (urlLower.includes('.svg')) {
            return 'image/svg+xml';
        } else if (urlLower.includes('.png')) {
            return 'image/png';
        }
        return 'image/png';
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
