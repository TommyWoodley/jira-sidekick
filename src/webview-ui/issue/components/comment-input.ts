import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import '@vscode-elements/elements/dist/vscode-button/index.js';
import { sharedStyles } from '../../shared/styles';

@customElement('comment-input')
export class CommentInput extends LitElement {
  static styles = [
    sharedStyles,
    css`
      :host {
        display: block;
      }

      .comment-form {
        background: var(--vscode-sideBar-background);
        border-radius: 6px;
        padding: 16px;
        border: 1px solid var(--vscode-panel-border);
      }

      .textarea-container {
        margin-bottom: 12px;
      }

      textarea {
        width: 100%;
        min-height: 120px;
        padding: 10px;
        border: 1px solid var(--vscode-input-border);
        border-radius: 4px;
        background: var(--vscode-input-background);
        color: var(--vscode-input-foreground);
        font-family: var(--vscode-font-family);
        font-size: 13px;
        resize: vertical;
        box-sizing: border-box;
      }

      textarea:focus {
        outline: none;
        border-color: var(--vscode-focusBorder);
      }

      textarea::placeholder {
        color: var(--vscode-input-placeholderForeground);
      }

      .markdown-hint {
        font-size: 0.8em;
        color: var(--vscode-descriptionForeground);
        margin-top: 6px;
      }

      .button-row {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
      }

      .character-count {
        font-size: 0.75em;
        color: var(--vscode-descriptionForeground);
        margin-top: 4px;
        text-align: right;
      }
    `,
  ];

  @property({ type: Boolean }) disabled = false;
  @state() private commentText = '';

  private handleInput(e: Event) {
    const textarea = e.target as HTMLTextAreaElement;
    this.commentText = textarea.value;
  }

  private handleSubmit() {
    const trimmedText = this.commentText.trim();
    if (!trimmedText) {
      return;
    }

    this.dispatchEvent(new CustomEvent('add-comment', {
      detail: { markdown: trimmedText },
      bubbles: true,
      composed: true
    }));
  }

  private handleCancel() {
    this.commentText = '';
    this.dispatchEvent(new CustomEvent('cancel-comment', {
      bubbles: true,
      composed: true
    }));
  }

  private handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      this.handleSubmit();
    }
  }

  clear() {
    this.commentText = '';
  }

  render() {
    const canSubmit = this.commentText.trim().length > 0 && !this.disabled;

    return html`
      <div class="comment-form">
        <div class="textarea-container">
          <textarea
            placeholder="Write a comment... (Markdown supported)"
            .value=${this.commentText}
            @input=${this.handleInput}
            @keydown=${this.handleKeyDown}
            ?disabled=${this.disabled}
          ></textarea>
          <div class="markdown-hint">
            Supports **bold**, *italic*, \`code\`, [links](url), lists, and code blocks. Press Ctrl+Enter to submit.
          </div>
        </div>
        <div class="button-row">
          <vscode-button secondary @click=${this.handleCancel} ?disabled=${this.disabled}>
            Cancel
          </vscode-button>
          <vscode-button @click=${this.handleSubmit} ?disabled=${!canSubmit}>
            Add Comment
          </vscode-button>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'comment-input': CommentInput;
  }
}

