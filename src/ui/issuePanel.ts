import * as vscode from 'vscode';
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
        private readonly client: JiraClient,
        private readonly onOpenInBrowser: (issue: JiraIssue) => void
    ) {
        this.panel = panel;
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
                }
            },
            null,
            this.disposables
        );
    }

    public static async show(
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
                retainContextWhenHidden: true
            }
        );

        IssuePanel.currentPanel = new IssuePanel(panel, client, onOpenInBrowser);
        await IssuePanel.currentPanel.loadIssue(issueKey);
    }

    private async loadIssue(issueKey: string): Promise<void> {
        this.panel.webview.html = this.getLoadingContent(issueKey);

        try {
            const issue = await this.client.getIssue(issueKey);
            this.currentIssue = issue;
            this.panel.title = `${issue.key}: ${issue.fields.summary}`;
            this.panel.webview.html = this.getIssueContent(issue);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.panel.webview.html = this.getErrorContent(issueKey, message);
        }
    }

    private getLoadingContent(issueKey: string): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Loading...</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            padding: 40px;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 80vh;
            color: var(--vscode-foreground);
        }
        .loading {
            text-align: center;
        }
        .spinner {
            width: 40px;
            height: 40px;
            border: 3px solid var(--vscode-input-border);
            border-top-color: var(--vscode-button-background);
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="loading">
        <div class="spinner"></div>
        <div>Loading ${this.escapeHtml(issueKey)}...</div>
    </div>
</body>
</html>`;
    }

    private getErrorContent(issueKey: string, error: string): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Error</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            padding: 40px;
            color: var(--vscode-foreground);
        }
        .error {
            background: var(--vscode-inputValidation-errorBackground);
            border: 1px solid var(--vscode-inputValidation-errorBorder);
            padding: 20px;
            border-radius: 4px;
        }
        h1 {
            color: var(--vscode-errorForeground);
            margin-top: 0;
        }
        button {
            margin-top: 20px;
            padding: 8px 16px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }
        button:hover {
            background: var(--vscode-button-hoverBackground);
        }
    </style>
</head>
<body>
    <div class="error">
        <h1>Failed to load ${this.escapeHtml(issueKey)}</h1>
        <p>${this.escapeHtml(error)}</p>
        <button onclick="vscode.postMessage({ command: 'refresh' })">Retry</button>
    </div>
    <script>
        const vscode = acquireVsCodeApi();
    </script>
</body>
</html>`;
    }

    private getIssueContent(issue: JiraIssue): string {
        const description = issue.fields.description 
            ? adfToMarkdown(issue.fields.description)
            : 'No description';

        const statusColor = this.getStatusColor(issue.fields.status.statusCategory.key);
        const labels = issue.fields.labels || [];

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.escapeHtml(issue.key)}</title>
    <style>
        :root {
            --status-color: ${statusColor};
        }
        body {
            font-family: var(--vscode-font-family);
            padding: 0;
            margin: 0;
            color: var(--vscode-foreground);
            background: var(--vscode-editor-background);
            line-height: 1.6;
        }
        .header {
            padding: 16px 24px;
            border-bottom: 1px solid var(--vscode-panel-border);
            background: var(--vscode-sideBar-background);
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 16px;
        }
        .header-left {
            flex: 1;
            min-width: 0;
        }
        .issue-key {
            font-size: 0.85em;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 4px;
        }
        .issue-key a {
            color: var(--vscode-textLink-foreground);
            text-decoration: none;
        }
        .issue-key a:hover {
            text-decoration: underline;
        }
        h1 {
            margin: 0;
            font-size: 1.4em;
            font-weight: 600;
            word-wrap: break-word;
        }
        .header-actions {
            display: flex;
            gap: 8px;
            flex-shrink: 0;
        }
        .icon-btn {
            padding: 6px 10px;
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .icon-btn:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }
        .meta {
            padding: 16px 24px;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }
        .meta-item {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }
        .meta-label {
            font-size: 0.75em;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: var(--vscode-descriptionForeground);
        }
        .meta-value {
            font-size: 0.95em;
        }
        .status-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 4px 10px;
            background: var(--status-color);
            color: white;
            border-radius: 3px;
            font-size: 0.85em;
            font-weight: 500;
            width: fit-content;
        }
        .labels {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
        }
        .label {
            padding: 2px 8px;
            background: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            border-radius: 3px;
            font-size: 0.85em;
        }
        .no-labels {
            color: var(--vscode-descriptionForeground);
            font-style: italic;
        }
        .content {
            padding: 24px;
        }
        .section-title {
            font-size: 0.85em;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 12px;
        }
        .description {
            background: var(--vscode-textBlockQuote-background);
            padding: 16px;
            border-radius: 4px;
            border-left: 3px solid var(--vscode-textBlockQuote-border);
        }
        .description pre {
            background: var(--vscode-textCodeBlock-background);
            padding: 12px;
            border-radius: 4px;
            overflow-x: auto;
        }
        .description code {
            background: var(--vscode-textCodeBlock-background);
            padding: 2px 6px;
            border-radius: 3px;
            font-family: var(--vscode-editor-font-family);
        }
        .description pre code {
            background: none;
            padding: 0;
        }
        .description a {
            color: var(--vscode-textLink-foreground);
        }
        .description blockquote {
            margin: 12px 0;
            padding-left: 16px;
            border-left: 3px solid var(--vscode-textBlockQuote-border);
            color: var(--vscode-descriptionForeground);
        }
        .description ul, .description ol {
            margin: 12px 0;
            padding-left: 24px;
        }
        .description h1, .description h2, .description h3 {
            margin: 16px 0 8px;
        }
        .description table {
            border-collapse: collapse;
            margin: 12px 0;
        }
        .description th, .description td {
            border: 1px solid var(--vscode-panel-border);
            padding: 8px 12px;
        }
        .description th {
            background: var(--vscode-sideBar-background);
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-left">
            <div class="issue-key">
                <a href="#" onclick="vscode.postMessage({ command: 'openInBrowser' }); return false;">${this.escapeHtml(issue.key)}</a>
                · ${this.escapeHtml(issue.fields.issuetype.name)}
            </div>
            <h1>${this.escapeHtml(issue.fields.summary)}</h1>
        </div>
        <div class="header-actions">
            <button class="icon-btn" onclick="vscode.postMessage({ command: 'refresh' })" title="Refresh">
                ↻ Refresh
            </button>
            <button class="icon-btn" onclick="vscode.postMessage({ command: 'openInBrowser' })" title="Open in Browser">
                ↗ Browser
            </button>
        </div>
    </div>

    <div class="meta">
        <div class="meta-item">
            <div class="meta-label">Status</div>
            <div class="meta-value">
                <span class="status-badge">${this.escapeHtml(issue.fields.status.name)}</span>
            </div>
        </div>

        <div class="meta-item">
            <div class="meta-label">Assignee</div>
            <div class="meta-value">
                ${issue.fields.assignee 
                    ? this.escapeHtml(issue.fields.assignee.displayName)
                    : '<span class="no-labels">Unassigned</span>'}
            </div>
        </div>

        ${issue.fields.priority ? `
        <div class="meta-item">
            <div class="meta-label">Priority</div>
            <div class="meta-value">${this.escapeHtml(issue.fields.priority.name)}</div>
        </div>
        ` : ''}

        <div class="meta-item">
            <div class="meta-label">Labels</div>
            <div class="meta-value">
                ${labels.length > 0 
                    ? `<div class="labels">${labels.map(l => `<span class="label">${this.escapeHtml(l)}</span>`).join('')}</div>`
                    : '<span class="no-labels">No labels</span>'}
            </div>
        </div>
    </div>

    <div class="content">
        <div class="section-title">Description</div>
        <div class="description">
            ${this.markdownToHtml(description)}
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
    </script>
</body>
</html>`;
    }

    private getStatusColor(categoryKey: string): string {
        switch (categoryKey) {
            case 'done':
                return '#36B37E';
            case 'indeterminate':
                return '#0065FF';
            default:
                return '#6B778C';
        }
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

