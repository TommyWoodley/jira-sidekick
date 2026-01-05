import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import '@vscode-elements/elements/dist/vscode-progress-ring/index.js';
import { sharedStyles } from '../styles';

@customElement('loading-spinner')
export class LoadingSpinner extends LitElement {
  static styles = [
    sharedStyles,
    css`
      :host {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 20px;
      }

      :host([fullscreen]) {
        height: 80vh;
      }

      .message {
        color: var(--vscode-foreground);
      }
    `,
  ];

  @property({ type: String }) message = '';
  @property({ type: Boolean, reflect: true }) fullscreen = false;

  render() {
    return html`
      <vscode-progress-ring></vscode-progress-ring>
      ${this.message ? html`<div class="message">${this.message}</div>` : ''}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'loading-spinner': LoadingSpinner;
  }
}


