import { LitElement, html, css } from 'lit';
import { customElement, state, property } from 'lit/decorators.js';
import '@vscode-elements/elements/dist/vscode-button/index.js';
import '@vscode-elements/elements/dist/vscode-badge/index.js';
import '@vscode-elements/elements/dist/vscode-divider/index.js';
import '@vscode-elements/elements/dist/vscode-progress-ring/index.js';
import '../shared/adf-renderer';
import { sharedStyles } from '../shared/styles';
import { createApiClient } from '../shared/rpc-client';
import type { IssueApi } from '@shared/api';
import type { JiraIssue, JiraAttachment, JiraTransition, JiraComment } from '@shared/models';

const api = createApiClient<IssueApi>();

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

      .status-container {
        position: relative;
        display: inline-block;
      }

      .status-badge.clickable {
        cursor: pointer;
        transition: filter 0.15s, transform 0.1s;
      }

      .status-badge.clickable:hover {
        filter: brightness(1.1);
      }

      .status-badge.clickable:active {
        transform: scale(0.98);
      }

      .status-badge .dropdown-arrow {
        margin-left: 4px;
        font-size: 0.7em;
      }

      .transition-dropdown {
        position: absolute;
        top: 100%;
        left: 0;
        margin-top: 4px;
        background: var(--vscode-dropdown-background);
        border: 1px solid var(--vscode-dropdown-border);
        border-radius: 4px;
        min-width: 180px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        z-index: 100;
        overflow: hidden;
      }

      .transition-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        cursor: pointer;
        color: var(--vscode-dropdown-foreground);
        transition: background 0.1s;
      }

      .transition-item:hover {
        background: var(--vscode-list-hoverBackground);
      }

      .transition-item .status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        flex-shrink: 0;
      }

      .transition-item .status-dot.done { background: #36B37E; }
      .transition-item .status-dot.inprogress { background: #0065FF; }
      .transition-item .status-dot.todo { background: #6B778C; }

      .transition-loading {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
        gap: 8px;
        color: var(--vscode-descriptionForeground);
      }

      .transition-error {
        padding: 12px;
        color: var(--vscode-errorForeground);
        font-size: 0.9em;
      }

      .status-badge.transitioning {
        opacity: 0.7;
        pointer-events: none;
      }

      .comments-section {
        margin-top: 24px;
      }

      .comments-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .comment-item {
        background: var(--vscode-sideBar-background);
        border-radius: 6px;
        padding: 12px 16px;
        border-left: 3px solid var(--vscode-textLink-foreground);
      }

      .comment-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
      }

      .comment-author {
        font-weight: 500;
        color: var(--vscode-foreground);
      }

      .comment-timestamp {
        font-size: 0.8em;
        color: var(--vscode-descriptionForeground);
      }

      .comment-body {
        font-size: 0.95em;
      }

      .no-comments {
        color: var(--vscode-descriptionForeground);
        font-style: italic;
      }
    `,
  ];

  @property({ attribute: 'data-issue-key' }) issueKey = '';

  @state() private issue: JiraIssue | null = null;
  @state() private isLoading = true;
  @state() private error: { issueKey: string; message: string } | null = null;
  @state() private imageMap: Record<string, string> = {};
  @state() private showTransitionDropdown = false;
  @state() private transitions: JiraTransition[] = [];
  @state() private transitionsLoading = false;
  @state() private transitionsError: string | null = null;
  @state() private isTransitioning = false;
  @state() private comments: JiraComment[] = [];

  private async loadIssue(issueKey: string) {
    this.isLoading = true;
    this.error = null;
    try {
      const { issue, imageMap, comments } = await api.loadIssue(issueKey);
      this.issue = issue;
      this.imageMap = imageMap;
      this.comments = comments;
      this.isLoading = false;
    } catch (err) {
      this.isLoading = false;
      this.error = { issueKey, message: String(err) };
    }
  }

  private async handleRefresh() {
    this.isLoading = true;
    this.error = null;
    try {
      const { issue, imageMap, comments } = await api.refresh();
      this.issue = issue;
      this.imageMap = imageMap;
      this.comments = comments;
      this.isLoading = false;
    } catch (err) {
      this.isLoading = false;
      this.error = { issueKey: this.issue?.key || '', message: String(err) };
    }
  }

  private handleOpenInBrowser() {
    api.openInBrowser();
  }

  private getStatusClass(categoryKey: string): string {
    switch (categoryKey) {
      case 'done': return 'status-done';
      case 'indeterminate': return 'status-inprogress';
      default: return 'status-todo';
    }
  }

  private getStatusDotClass(categoryKey: string): string {
    switch (categoryKey) {
      case 'done': return 'done';
      case 'indeterminate': return 'inprogress';
      default: return 'todo';
    }
  }

  private async handleStatusClick(e: MouseEvent) {
    e.stopPropagation();
    if (this.isTransitioning) {return;}
    
    if (this.showTransitionDropdown) {
      this.showTransitionDropdown = false;
      return;
    }

    this.showTransitionDropdown = true;
    this.transitionsLoading = true;
    this.transitionsError = null;
    this.transitions = [];

    try {
      this.transitions = await api.getTransitions();
      this.transitionsLoading = false;
    } catch (err) {
      this.transitionsLoading = false;
      this.transitionsError = String(err);
    }
  }

  private async handleTransition(transition: JiraTransition) {
    this.showTransitionDropdown = false;
    this.isTransitioning = true;

    try {
      const { issue } = await api.transitionIssue(transition.id);
      this.issue = issue;
      this.isTransitioning = false;
    } catch (err) {
      this.isTransitioning = false;
      this.error = { issueKey: this.issue?.key || '', message: `Failed to transition: ${String(err)}` };
    }
  }

  private handleDocumentClick = () => {
    if (this.showTransitionDropdown) {
      this.showTransitionDropdown = false;
    }
  };

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener('click', this.handleDocumentClick);
    if (this.issueKey) {
      this.loadIssue(this.issueKey);
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('click', this.handleDocumentClick);
  }

  private formatFileSize(bytes: number): string {
    if (bytes < 1024) {return `${bytes} B`;}
    if (bytes < 1024 * 1024) {return `${(bytes / 1024).toFixed(1)} KB`;}
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  private getFileTypeIcon(mimeType: string): string {
    if (mimeType.startsWith('image/')) {return '🖼️';}
    if (mimeType.startsWith('video/')) {return '🎬';}
    if (mimeType.startsWith('audio/')) {return '🎵';}
    if (mimeType.includes('pdf')) {return '📄';}
    if (mimeType.includes('zip') || mimeType.includes('archive')) {return '📦';}
    if (mimeType.includes('text') || mimeType.includes('document')) {return '📝';}
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) {return '📊';}
    return '📎';
  }

  private handleOpenAttachment(attachment: JiraAttachment) {
    api.openAttachment(attachment.content);
  }

  private async handleSaveAttachment(e: MouseEvent, attachment: JiraAttachment) {
    e.preventDefault();
    await api.saveAttachment({
      id: attachment.id,
      filename: attachment.filename,
      content: attachment.content
    });
  }

  render() {
    if (this.isLoading) {
      return html`
        <div class="loading">
          <vscode-progress-ring></vscode-progress-ring>
          <div>Loading ${this.issueKey || 'issue'}...</div>
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
            <div class="status-container">
              <span 
                class="status-badge ${statusClass} clickable ${this.isTransitioning ? 'transitioning' : ''}"
                @click=${this.handleStatusClick}
                title="Click to change status"
              >
                ${this.issue.fields.status.name}
                <span class="dropdown-arrow">▼</span>
              </span>
              ${this.showTransitionDropdown ? this.renderTransitionDropdown() : ''}
            </div>
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
            ? html`<adf-renderer .adf=${this.issue.fields.description} .imageMap=${this.imageMap}></adf-renderer>`
            : html`<span class="no-description">No description</span>`}
        </div>

        ${this.renderAttachments()}
        ${this.renderComments()}
      </div>
    `;
  }

  private renderTransitionDropdown() {
    if (this.transitionsLoading) {
      return html`
        <div class="transition-dropdown" @click=${(e: MouseEvent) => e.stopPropagation()}>
          <div class="transition-loading">
            <vscode-progress-ring></vscode-progress-ring>
            Loading...
          </div>
        </div>
      `;
    }

    if (this.transitionsError) {
      return html`
        <div class="transition-dropdown" @click=${(e: MouseEvent) => e.stopPropagation()}>
          <div class="transition-error">${this.transitionsError}</div>
        </div>
      `;
    }

    if (this.transitions.length === 0) {
      return html`
        <div class="transition-dropdown" @click=${(e: MouseEvent) => e.stopPropagation()}>
          <div class="transition-loading">No transitions available</div>
        </div>
      `;
    }

    return html`
      <div class="transition-dropdown" @click=${(e: MouseEvent) => e.stopPropagation()}>
        ${this.transitions.map((transition) => html`
          <div 
            class="transition-item" 
            @click=${() => this.handleTransition(transition)}
          >
            <span class="status-dot ${this.getStatusDotClass(transition.to.statusCategory.key)}"></span>
            ${transition.name}
          </div>
        `)}
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

  private formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) { return 'just now'; }
    if (diffMins < 60) { return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`; }
    if (diffHours < 24) { return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`; }
    if (diffDays < 30) { return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`; }
    return date.toLocaleDateString();
  }

  private formatFullDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString();
  }

  private renderComments() {
    return html`
      <div class="comments-section">
        <div class="section-title">Comments (${this.comments.length})</div>
        ${this.comments.length > 0 ? html`
          <div class="comments-list">
            ${this.comments.map((comment) => html`
              <div class="comment-item">
                <div class="comment-header">
                  <span class="comment-author">${comment.author.displayName}</span>
                  <span class="comment-timestamp" title="${this.formatFullDate(comment.created)}">
                    ${this.formatRelativeTime(comment.created)}
                  </span>
                </div>
                <div class="comment-body">
                  <adf-renderer .adf=${comment.body} .imageMap=${this.imageMap}></adf-renderer>
                </div>
              </div>
            `)}
          </div>
        ` : html`<span class="no-comments">No comments</span>`}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'issue-app': IssueApp;
  }
}
