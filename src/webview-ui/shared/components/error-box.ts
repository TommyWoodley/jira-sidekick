import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import '@vscode-elements/elements/dist/vscode-button/index.js';
import { sharedStyles } from '../styles';

@customElement('error-box')
export class ErrorBox extends LitElement {
  static styles = [
    sharedStyles,
    css`
      :host {
        display: block;
        padding: 40px;
      }

      .error-box {
        background: var(--vscode-inputValidation-errorBackground);
        border: 1px solid var(--vscode-inputValidation-errorBorder);
        padding: 20px;
        border-radius: 4px;
      }

      h1 {
        color: var(--vscode-errorForeground);
        margin-top: 0;
        font-size: 1.2em;
      }

      p {
        margin-bottom: 16px;
      }
    `,
  ];

  @property({ type: String }) title = 'Error';
  @property({ type: String }) message = '';
  @property({ type: Boolean }) showRetry = true;

  private handleRetry() {
    this.dispatchEvent(new CustomEvent('retry', { bubbles: true, composed: true }));
  }

  render() {
    return html`
      <div class="error-box">
        <h1>${this.title}</h1>
        <p>${this.message}</p>
        ${this.showRetry ? html`
          <vscode-button @click=${this.handleRetry}>Retry</vscode-button>
        ` : ''}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'error-box': ErrorBox;
  }
}


