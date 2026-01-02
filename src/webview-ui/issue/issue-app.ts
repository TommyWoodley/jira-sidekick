import { LitElement, html, css } from 'lit';
import { customElement, state, property } from 'lit/decorators.js';
import '@vscode-elements/elements/dist/vscode-button/index.js';
import '@vscode-elements/elements/dist/vscode-badge/index.js';
import '@vscode-elements/elements/dist/vscode-divider/index.js';
import '../shared/adf-renderer';
import '../shared/components/status-badge';
import '../shared/components/meta-item';
import '../shared/components/loading-spinner';
import '../shared/components/error-box';
import './components/transition-dropdown';
import './components/attachments-list';
import './components/comments-list';
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

      .status-container {
        position: relative;
        display: inline-block;
      }

      .labels {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
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

      .no-labels {
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

  private async handleStatusClick() {
    if (this.isTransitioning) {
      return;
    }

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

  private async handleTransition(e: CustomEvent<{ transition: JiraTransition }>) {
    const transition = e.detail.transition;
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

  private handleAttachmentOpen(e: CustomEvent<{ attachment: JiraAttachment }>) {
    api.openAttachment(e.detail.attachment.content);
  }

  private async handleAttachmentSave(e: CustomEvent<{ attachment: JiraAttachment }>) {
    const attachment = e.detail.attachment;
    await api.saveAttachment({
      id: attachment.id,
      filename: attachment.filename,
      content: attachment.content
    });
  }

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

  render() {
    if (this.isLoading) {
      return html`<loading-spinner fullscreen message="Loading ${this.issueKey || 'issue'}..."></loading-spinner>`;
    }

    if (this.error) {
      return html`
        <error-box
          title="Failed to load ${this.error.issueKey}"
          message="${this.error.message}"
          @retry=${this.handleRefresh}
        ></error-box>
      `;
    }

    if (!this.issue) {
      return html`<loading-spinner message="No issue loaded"></loading-spinner>`;
    }

    const labels = this.issue.fields.labels || [];

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
        <meta-item label="Status">
          <div class="status-container">
            <status-badge
              .status=${this.issue.fields.status}
              clickable
              showArrow
              ?transitioning=${this.isTransitioning}
              @status-click=${this.handleStatusClick}
            ></status-badge>
            ${this.showTransitionDropdown ? html`
              <transition-dropdown
                .transitions=${this.transitions}
                ?loading=${this.transitionsLoading}
                .error=${this.transitionsError}
                @transition-select=${this.handleTransition}
              ></transition-dropdown>
            ` : ''}
          </div>
        </meta-item>

        <meta-item label="Assignee" emptyText="Unassigned">
          ${this.issue.fields.assignee ? this.issue.fields.assignee.displayName : ''}
        </meta-item>

        ${this.issue.fields.priority ? html`
          <meta-item label="Priority">${this.issue.fields.priority.name}</meta-item>
        ` : ''}

        <meta-item label="Labels" emptyText="No labels">
          ${labels.length > 0 ? html`
            <div class="labels">
              ${labels.map((label) => html`<vscode-badge>${label}</vscode-badge>`)}
            </div>
          ` : ''}
        </meta-item>
      </div>

      <div class="content">
        <div class="section-title">Description</div>
        <div class="description-container">
          ${this.issue.fields.description
            ? html`<adf-renderer .adf=${this.issue.fields.description} .imageMap=${this.imageMap}></adf-renderer>`
            : html`<span class="no-description">No description</span>`}
        </div>

        <attachments-list
          .attachments=${this.issue.fields.attachment || []}
          @attachment-open=${this.handleAttachmentOpen}
          @attachment-save=${this.handleAttachmentSave}
        ></attachments-list>

        <comments-list
          .comments=${this.comments}
          .imageMap=${this.imageMap}
        ></comments-list>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'issue-app': IssueApp;
  }
}
