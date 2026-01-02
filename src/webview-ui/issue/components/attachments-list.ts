import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { sharedStyles } from '../../shared/styles';
import { formatFileSize, getFileTypeIcon } from '../../shared/utils/format';
import '../../shared/components/empty-state';
import type { JiraAttachment } from '@shared/models';

@customElement('attachments-list')
export class AttachmentsList extends LitElement {
  static styles = [
    sharedStyles,
    css`
      :host {
        display: block;
      }

      .attachments-section {
        margin-top: 24px;
      }

      .section-title {
        font-size: 0.85em;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: var(--vscode-descriptionForeground);
        margin-bottom: 12px;
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
    `,
  ];

  @property({ type: Array }) attachments: JiraAttachment[] = [];

  private handleOpen(attachment: JiraAttachment) {
    this.dispatchEvent(new CustomEvent('attachment-open', {
      detail: { attachment },
      bubbles: true,
      composed: true,
    }));
  }

  private handleSave(e: MouseEvent, attachment: JiraAttachment) {
    e.preventDefault();
    this.dispatchEvent(new CustomEvent('attachment-save', {
      detail: { attachment },
      bubbles: true,
      composed: true,
    }));
  }

  render() {
    return html`
      <div class="attachments-section">
        <div class="section-title">Attachments (${this.attachments.length})</div>
        ${this.attachments.length > 0 ? html`
          <div class="attachments-list">
            ${this.attachments.map((attachment) => html`
              <div 
                class="attachment-item" 
                @click=${() => this.handleOpen(attachment)}
                @contextmenu=${(e: MouseEvent) => this.handleSave(e, attachment)}
                title="Click to open • Right-click to save to workspace"
              >
                <span class="attachment-icon">${getFileTypeIcon(attachment.mimeType)}</span>
                <span class="attachment-name">${attachment.filename}</span>
                <span class="attachment-meta">${formatFileSize(attachment.size)}</span>
              </div>
            `)}
          </div>
        ` : html`<empty-state message="No attachments"></empty-state>`}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'attachments-list': AttachmentsList;
  }
}

