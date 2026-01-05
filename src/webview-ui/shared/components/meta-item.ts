import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { sharedStyles } from '../styles';

@customElement('meta-item')
export class MetaItem extends LitElement {
  static styles = [
    sharedStyles,
    css`
      :host {
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

      .empty {
        color: var(--vscode-descriptionForeground);
        font-style: italic;
      }
    `,
  ];

  @property({ type: String }) label = '';
  @property({ type: String }) emptyText = '';

  render() {
    return html`
      <div class="meta-label">${this.label}</div>
      <div class="meta-value">
        <slot><span class="empty">${this.emptyText}</span></slot>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'meta-item': MetaItem;
  }
}


