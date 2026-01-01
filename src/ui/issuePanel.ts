import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
import { JiraIssue } from '../jira/types';
import { JiraClient } from '../jira/client';
import { adfToMarkdown } from '../jira/adfToMarkdown';

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

            const description = issue.fields.description
                ? this.markdownToHtml(adfToMarkdown(issue.fields.description))
                : 'No description';

            const issueForWebview = {
                ...issue,
                fields: {
                    ...issue.fields,
                    description
                }
            };

            this.panel.webview.postMessage({ command: 'loadIssue', issue: issueForWebview });
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

    private markdownToHtml(markdown: string): string {
        return markdown
            .split('\n\n')
            .map(block => {
                block = block.trim();
                if (!block) {
                    return '';
                }

                if (block.startsWith('```')) {
                    const lines = block.split('\n');
                    const lang = lines[0].slice(3);
                    const code = lines.slice(1, -1).join('\n');
                    return `<pre><code class="language-${this.escapeHtml(lang)}">${this.escapeHtml(code)}</code></pre>`;
                }

                if (block.startsWith('#')) {
                    const match = block.match(/^(#{1,6})\s+(.+)$/);
                    if (match) {
                        const level = match[1].length;
                        return `<h${level}>${this.formatInline(match[2])}</h${level}>`;
                    }
                }

                if (block.startsWith('- ') || block.startsWith('* ')) {
                    const items = block.split('\n').map(line => {
                        const content = line.replace(/^[-*]\s+/, '');
                        return `<li>${this.formatInline(content)}</li>`;
                    });
                    return `<ul>${items.join('')}</ul>`;
                }

                if (/^\d+\.\s/.test(block)) {
                    const items = block.split('\n').map(line => {
                        const content = line.replace(/^\d+\.\s+/, '');
                        return `<li>${this.formatInline(content)}</li>`;
                    });
                    return `<ol>${items.join('')}</ol>`;
                }

                if (block.startsWith('> ')) {
                    const content = block.split('\n').map(line => line.replace(/^>\s?/, '')).join('\n');
                    return `<blockquote>${this.formatInline(content)}</blockquote>`;
                }

                if (block.startsWith('|')) {
                    return this.parseTable(block);
                }

                if (block === '---') {
                    return '<hr>';
                }

                return `<p>${this.formatInline(block)}</p>`;
            })
            .filter(Boolean)
            .join('\n');
    }

    private formatInline(text: string): string {
        return text
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
            .replace(/\*([^*]+)\*/g, '<em>$1</em>')
            .replace(/~~([^~]+)~~/g, '<del>$1</del>')
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
            .replace(/\n/g, '<br>');
    }

    private parseTable(block: string): string {
        const lines = block.split('\n').filter(line => line.trim());
        if (lines.length < 2) {
            return `<p>${this.escapeHtml(block)}</p>`;
        }

        const parseRow = (line: string) => 
            line.split('|').slice(1, -1).map(cell => cell.trim());

        const headers = parseRow(lines[0]);
        const isHeaderSeparator = lines[1].includes('---');
        const dataStartIndex = isHeaderSeparator ? 2 : 1;
        const rows = lines.slice(dataStartIndex).map(parseRow);

        let html = '<table>';
        if (isHeaderSeparator) {
            html += '<thead><tr>';
            headers.forEach(h => { html += `<th>${this.formatInline(h)}</th>`; });
            html += '</tr></thead>';
        }
        html += '<tbody>';
        rows.forEach(row => {
            html += '<tr>';
            row.forEach(cell => { html += `<td>${this.formatInline(cell)}</td>`; });
            html += '</tr>';
        });
        html += '</tbody></table>';

        return html;
    }

    private escapeHtml(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
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

