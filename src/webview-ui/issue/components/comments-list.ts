import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { sharedStyles } from '../../shared/styles';
import { formatRelativeTime, formatFullDate } from '../../shared/utils/format';
import '../../shared/components/empty-state';
import '../../shared/adf-renderer';
import type { JiraComment } from '@shared/models';

@customElement('comments-list')
export class CommentsList extends LitElement {
  static styles = [
    sharedStyles,
    css`
      :host {
        display: block;
      }

      .comments-section {
        margin-top: 24px;
      }

      .section-title {
        font-size: 0.85em;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: var(--vscode-descriptionForeground);
        margin-bottom: 12px;
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
    `,
  ];

  @property({ type: Array }) comments: JiraComment[] = [];
  @property({ type: Object }) imageMap: Record<string, string> = {};

  render() {
    return html`
      <div class="comments-section">
        <div class="section-title">Comments (${this.comments.length})</div>
        ${this.comments.length > 0 ? html`
          <div class="comments-list">
            ${this.comments.map((comment) => html`
              <div class="comment-item">
                <div class="comment-header">
                  <span class="comment-author">${comment.author.displayName}</span>
                  <span class="comment-timestamp" title="${formatFullDate(comment.created)}">
                    ${formatRelativeTime(comment.created)}
                  </span>
                </div>
                <div class="comment-body">
                  <adf-renderer .adf=${comment.body} .imageMap=${this.imageMap}></adf-renderer>
                </div>
              </div>
            `)}
          </div>
        ` : html`<empty-state message="No comments"></empty-state>`}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'comments-list': CommentsList;
  }
}

