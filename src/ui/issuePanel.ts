import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
import { IJiraClient } from '../core/interfaces';
import type { IssueApi } from '../shared/api';
import type { JiraIssue } from '../shared/models';
import { exposeApi } from '../shared/rpc';
import { markdownToAdf } from '../jira/markdownToAdf';

export class IssuePanel {
    private static previewPanel: IssuePanel | undefined;
    private static pinnedPanels: Map<string, IssuePanel> = new Map();
    
    private readonly panel: vscode.WebviewPanel;
    private disposables: vscode.Disposable[] = [];
    private currentIssue: JiraIssue | undefined;
    private currentIssueKey: string;
    private isPinned: boolean = false;
    private attachmentMaps: { byId: Record<string, string>; byFilename: Record<string, string> } = { byId: {}, byFilename: {} };
    private mediaIdToUrl: Record<string, string> = {};

    private constructor(
        panel: vscode.WebviewPanel,
        private readonly extensionUri: vscode.Uri,
        private readonly client: IJiraClient,
        private readonly onOpenInBrowser: (issue: JiraIssue) => void,
        issueKey: string,
        pinned: boolean
    ) {
        this.panel = panel;
        this.currentIssueKey = issueKey;
        this.isPinned = pinned;
        this.panel.webview.html = this.getWebviewContent();
        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

        const apiDisposable = exposeApi<IssueApi>(this.panel.webview, this.createApi());
        this.disposables.push(apiDisposable);
    }

    private createApi(): IssueApi {
        return {
            loadIssue: async (issueKey: string) => {
                this.currentIssueKey = issueKey;
                const [issueResult, commentsResult] = await Promise.all([
                    this.client.getIssue(issueKey),
                    this.client.getComments(issueKey)
                ]);
                if (!issueResult.success) {
                    throw new Error(issueResult.error.message);
                }
                const issue = issueResult.data;
                const comments = commentsResult.success ? commentsResult.data : [];
                this.currentIssue = issue;

                this.panel.title = IssuePanel.formatTitle(issue.key, issue.fields.summary, !this.isPinned);

                this.attachmentMaps = this.buildAttachmentMaps(issue);
                this.mediaIdToUrl = this.buildMediaIdToUrl(issue);

                return { issue, imageMap: {} as Record<string, string>, comments };
            },

            refresh: async () => {
                if (!this.currentIssueKey) {
                    throw new Error('No issue loaded');
                }
                const [issueResult, commentsResult] = await Promise.all([
                    this.client.getIssue(this.currentIssueKey),
                    this.client.getComments(this.currentIssueKey)
                ]);
                if (!issueResult.success) {
                    throw new Error(issueResult.error.message);
                }
                const issue = issueResult.data;
                const comments = commentsResult.success ? commentsResult.data : [];
                this.currentIssue = issue;

                this.attachmentMaps = this.buildAttachmentMaps(issue);
                this.mediaIdToUrl = this.buildMediaIdToUrl(issue);

                return { issue, imageMap: {} as Record<string, string>, comments };
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

            loadImage: async (id: string) => {
                return this.loadSingleImage(id);
            },

            getTransitions: async () => {
                if (!this.currentIssueKey) {
                    throw new Error('No issue loaded');
                }
                const result = await this.client.getTransitions(this.currentIssueKey);
                if (!result.success) {
                    throw new Error(result.error.message);
                }
                return result.data;
            },

            transitionIssue: async (transitionId: string) => {
                if (!this.currentIssueKey) {
                    throw new Error('No issue loaded');
                }
                const transitionResult = await this.client.transitionIssue(this.currentIssueKey, transitionId);
                if (!transitionResult.success) {
                    throw new Error(transitionResult.error.message);
                }
                const issueResult = await this.client.getIssue(this.currentIssueKey);
                if (!issueResult.success) {
                    throw new Error(issueResult.error.message);
                }
                const issue = issueResult.data;
                this.currentIssue = issue;
                this.attachmentMaps = this.buildAttachmentMaps(issue);
                this.mediaIdToUrl = this.buildMediaIdToUrl(issue);
                return { issue };
            },

            addComment: async (markdown: string) => {
                if (!this.currentIssueKey) {
                    throw new Error('No issue loaded');
                }
                const adfBody = markdownToAdf(markdown);
                const result = await this.client.addComment(this.currentIssueKey, adfBody);
                if (!result.success) {
                    throw new Error(result.error.message);
                }
                return result.data;
            },
        };
    }

    public static async showPreview(
        extensionUri: vscode.Uri,
        client: IJiraClient,
        issueKey: string,
        summary: string,
        onOpenInBrowser: (issue: JiraIssue) => void
    ): Promise<void> {
        const existingPinned = IssuePanel.pinnedPanels.get(issueKey);
        if (existingPinned) {
            existingPinned.panel.reveal();
            return;
        }

        const title = IssuePanel.formatTitle(issueKey, summary, true);

        if (IssuePanel.previewPanel) {
            IssuePanel.previewPanel.panel.reveal();
            IssuePanel.previewPanel.currentIssueKey = issueKey;
            IssuePanel.previewPanel.panel.title = title;
            IssuePanel.previewPanel.panel.webview.html = IssuePanel.previewPanel.getWebviewContent();
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'jiraSidekickIssue',
            title,
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'out', 'webview-ui')]
            }
        );

        IssuePanel.previewPanel = new IssuePanel(panel, extensionUri, client, onOpenInBrowser, issueKey, false);
    }

    public static async showPinned(
        extensionUri: vscode.Uri,
        client: IJiraClient,
        issueKey: string,
        summary: string,
        onOpenInBrowser: (issue: JiraIssue) => void
    ): Promise<void> {
        const existingPinned = IssuePanel.pinnedPanels.get(issueKey);
        if (existingPinned) {
            existingPinned.panel.reveal();
            return;
        }

        if (IssuePanel.previewPanel && IssuePanel.previewPanel.currentIssueKey === issueKey) {
            IssuePanel.previewPanel.pin();
            return;
        }

        const title = IssuePanel.formatTitle(issueKey, summary, false);

        const panel = vscode.window.createWebviewPanel(
            'jiraSidekickIssue',
            title,
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'out', 'webview-ui')]
            }
        );

        const issuePanel = new IssuePanel(panel, extensionUri, client, onOpenInBrowser, issueKey, true);
        IssuePanel.pinnedPanels.set(issueKey, issuePanel);
    }

    private static formatTitle(issueKey: string, summary: string, isPreview: boolean): string {
        const maxLength = vscode.workspace.getConfiguration('jira-sidekick').get<number>('maxTabTitleLength', 30);
        const truncatedSummary = IssuePanel.truncateText(summary, maxLength);
        const prefix = isPreview ? '~ ' : '';
        return `${prefix}${issueKey}: ${truncatedSummary}`;
    }

    private static truncateText(text: string, maxLength: number): string {
        if (maxLength <= 0 || text.length <= maxLength) {
            return text;
        }
        return text.slice(0, maxLength) + '...';
    }

    private pin(): void {
        if (this.isPinned) {
            return;
        }
        this.isPinned = true;
        IssuePanel.previewPanel = undefined;
        IssuePanel.pinnedPanels.set(this.currentIssueKey, this);
        
        const currentTitle = this.panel.title;
        if (currentTitle.startsWith('~ ')) {
            this.panel.title = currentTitle.substring(2);
        }
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

    private buildMediaIdToUrl(issue: JiraIssue): Record<string, string> {
        const mediaIdToUrl: Record<string, string> = {};
        const attachmentMaps = this.attachmentMaps;

        const traverse = (node: unknown) => {
            if (!node || typeof node !== 'object') {return;}

            const n = node as { type?: string; attrs?: { id?: string; alt?: string }; content?: unknown[] };

            if (n.type === 'media' && n.attrs?.id) {
                const mediaId = n.attrs.id;
                const filename = n.attrs.alt;

                let contentUrl = attachmentMaps.byId[mediaId];
                if (!contentUrl && filename) {
                    contentUrl = attachmentMaps.byFilename[filename.toLowerCase()];
                }
                if (contentUrl) {
                    mediaIdToUrl[mediaId] = contentUrl;
                }
            }

            if (n.content && Array.isArray(n.content)) {
                for (const child of n.content) {
                    traverse(child);
                }
            }
        };

        traverse(issue.fields.description);
        return mediaIdToUrl;
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

    private async loadSingleImage(id: string): Promise<string | null> {
        const contentUrl = this.mediaIdToUrl[id];
        if (!contentUrl) {
            return null;
        }

        const result = await this.client.downloadAttachment(contentUrl);
        if (!result.success) {
            return null;
        }

        const mimeType = this.getMimeType(contentUrl);
        const base64 = result.data.toString('base64');
        return `data:${mimeType};base64,${base64}`;
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
                    const result = await this.client.downloadAttachment(attachment.content);
                    if (!result.success) {
                        throw new Error(result.error.message);
                    }
                    await fs.writeFile(targetPath, result.data);
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
        if (this.isPinned) {
            IssuePanel.pinnedPanels.delete(this.currentIssueKey);
        } else {
            IssuePanel.previewPanel = undefined;
        }
        
        this.panel.dispose();
        while (this.disposables.length) {
            const x = this.disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    public static disposeAll(): void {
        if (IssuePanel.previewPanel) {
            IssuePanel.previewPanel.dispose();
        }
        for (const panel of IssuePanel.pinnedPanels.values()) {
            panel.dispose();
        }
    }
}
