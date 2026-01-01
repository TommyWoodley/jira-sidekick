import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import '@vscode-elements/elements/dist/vscode-button/index.js';
import '@vscode-elements/elements/dist/vscode-badge/index.js';
import '@vscode-elements/elements/dist/vscode-divider/index.js';
import '@vscode-elements/elements/dist/vscode-progress-ring/index.js';
import '../shared/adf-renderer';
import { postMessage } from '../shared/vscode-api';
import { sharedStyles } from '../shared/styles';
import type { JiraIssue, JiraAttachment } from '../shared/types';

@customElement('issue-app')
export class IssueApp extends LitElement {
  static styles = [
    sharedStyles,
    css`
      :host {
        display: block;
      }

      .loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 80vh;
        gap: 20px;
      }

      .error {
        padding: 40px;
      }

      .error-box {
        background: var(--vscode-inputValidation-errorBackground);
        border: 1px solid var(--vscode-inputValidation-errorBorder);
        padding: 20px;
        border-radius: 4px;
      }

      .error-box h1 {
        color: var(--vscode-errorForeground);
        margin-top: 0;
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
        cursor: pointer;
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
        color: white;
        border-radius: 3px;
        font-size: 0.85em;
        font-weight: 500;
        width: fit-content;
      }

      .status-done { background: #36B37E; }
      .status-inprogress { background: #0065FF; }
      .status-todo { background: #6B778C; }

      .labels {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
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

      .description-container {
        background: var(--vscode-textBlockQuote-background);
        padding: 16px;
        border-radius: 4px;
        border-left: 3px solid var(--vscode-textBlockQuote-border);
      }

      .no-description {
        color: var(--vscode-descriptionForeground);
        font-style: italic;
      }

      .attachments-section {
        margin-top: 24px;
      }

      .attachments-list {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .attachment-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 12px;
        background: var(--vscode-sideBar-background);
        border-radius: 4px;
        cursor: pointer;
        transition: background 0.15s;
      }

      .attachment-item:hover {
        background: var(--vscode-list-hoverBackground);
      }

      .attachment-icon {
        font-size: 1.2em;
        width: 24px;
        text-align: center;
      }

      .attachment-name {
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: var(--vscode-textLink-foreground);
      }

      .attachment-meta {
        font-size: 0.85em;
        color: var(--vscode-descriptionForeground);
      }

      .no-attachments {
        color: var(--vscode-descriptionForeground);
        font-style: italic;
      }
    `,
  ];

  @state() private issue: JiraIssue | null = null;
  @state() private isLoading = true;
  @state() private error: { issueKey: string; message: string } | null = null;
  @state() private loadingIssueKey = '';

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('message', this.handleMessage);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('message', this.handleMessage);
  }

  private handleMessage = (event: MessageEvent) => {
    const message = event.data;
    switch (message.command) {
      case 'loading':
        this.isLoading = true;
        this.loadingIssueKey = message.issueKey;
        this.error = null;
        break;
      case 'loadIssue':
        this.isLoading = false;
        this.issue = message.issue;
        this.error = null;
        break;
      case 'error':
        this.isLoading = false;
        this.error = { issueKey: message.issueKey, message: message.message };
        break;
    }
  };

  private handleRefresh() {
    postMessage({ command: 'refresh' });
  }

  private handleOpenInBrowser() {
    postMessage({ command: 'openInBrowser' });
  }

  private getStatusClass(categoryKey: string): string {
    switch (categoryKey) {
      case 'done': return 'status-done';
      case 'indeterminate': return 'status-inprogress';
      default: return 'status-todo';
    }
  }

  private formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  private getFileTypeIcon(mimeType: string): string {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.startsWith('video/')) return '🎬';
    if (mimeType.startsWith('audio/')) return '🎵';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('zip') || mimeType.includes('archive')) return '📦';
    if (mimeType.includes('text') || mimeType.includes('document')) return '📝';
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return '📊';
    return '📎';
  }

  private handleOpenAttachment(attachment: JiraAttachment) {
    postMessage({ command: 'openAttachment', url: attachment.content });
  }

  private handleSaveAttachment(e: MouseEvent, attachment: JiraAttachment) {
    e.preventDefault();
    postMessage({
      command: 'saveAttachment',
      attachment: {
        id: attachment.id,
        filename: attachment.filename,
        content: attachment.content
      }
    });
  }

  render() {
    if (this.isLoading) {
      return html`
        <div class="loading">
          <vscode-progress-ring></vscode-progress-ring>
          <div>Loading ${this.loadingIssueKey}...</div>
        </div>
      `;
    }

    if (this.error) {
      return html`
        <div class="error">
          <div class="error-box">
            <h1>Failed to load ${this.error.issueKey}</h1>
            <p>${this.error.message}</p>
            <vscode-button @click=${this.handleRefresh}>Retry</vscode-button>
          </div>
        </div>
      `;
    }

    if (!this.issue) {
      return html`<div class="loading">No issue loaded</div>`;
    }

    const labels = this.issue.fields.labels || [];
    const statusClass = this.getStatusClass(this.issue.fields.status.statusCategory.key);

    return html`
      <div class="header">
        <div class="header-left">
          <div class="issue-key">
            <a @click=${this.handleOpenInBrowser}>${this.issue.key}</a>
            · ${this.issue.fields.issuetype.name}
          </div>
          <h1>${this.issue.fields.summary}</h1>
        </div>
        <div class="header-actions">
          <vscode-button secondary @click=${this.handleRefresh}>↻ Refresh</vscode-button>
          <vscode-button secondary @click=${this.handleOpenInBrowser}>↗ Browser</vscode-button>
        </div>
      </div>

      <div class="meta">
        <div class="meta-item">
          <div class="meta-label">Status</div>
          <div class="meta-value">
            <span class="status-badge ${statusClass}">
              ${this.issue.fields.status.name}
            </span>
          </div>
        </div>

        <div class="meta-item">
          <div class="meta-label">Assignee</div>
          <div class="meta-value">
            ${this.issue.fields.assignee
              ? this.issue.fields.assignee.displayName
              : html`<span class="no-labels">Unassigned</span>`}
          </div>
        </div>

        ${this.issue.fields.priority ? html`
          <div class="meta-item">
            <div class="meta-label">Priority</div>
            <div class="meta-value">${this.issue.fields.priority.name}</div>
          </div>
        ` : ''}

        <div class="meta-item">
          <div class="meta-label">Labels</div>
          <div class="meta-value">
            ${labels.length > 0 ? html`
              <div class="labels">
                ${labels.map((label) => html`
                  <vscode-badge>${label}</vscode-badge>
                `)}
              </div>
            ` : html`<span class="no-labels">No labels</span>`}
          </div>
        </div>
      </div>

      <div class="content">
        <div class="section-title">Description</div>
        <div class="description-container">
          ${this.issue.fields.description
        ? html`<adf-renderer .adf=${this.issue.fields.description}></adf-renderer>`
        : html`<span class="no-description">No description</span>`}
        </div>

        ${this.renderAttachments()}
      </div>
    `;
  }

  private renderAttachments() {
    const attachments = this.issue?.fields.attachment || [];

    return html`
      <div class="attachments-section">
        <div class="section-title">Attachments (${attachments.length})</div>
        ${attachments.length > 0 ? html`
          <div class="attachments-list">
            ${attachments.map((attachment) => html`
              <div 
                class="attachment-item" 
                @click=${() => this.handleOpenAttachment(attachment)}
                @contextmenu=${(e: MouseEvent) => this.handleSaveAttachment(e, attachment)}
                title="Click to open • Right-click to save to workspace"
              >
                <span class="attachment-icon">${this.getFileTypeIcon(attachment.mimeType)}</span>
                <span class="attachment-name">${attachment.filename}</span>
                <span class="attachment-meta">${this.formatFileSize(attachment.size)}</span>
              </div>
            `)}
          </div>
        ` : html`<span class="no-attachments">No attachments</span>`}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'issue-app': IssueApp;
  }
}


