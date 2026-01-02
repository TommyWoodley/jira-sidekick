import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { sharedStyles } from '../styles';

@customElement('empty-state')
export class EmptyState extends LitElement {
  static styles = [
    sharedStyles,
    css`
      :host {
        display: block;
      }

      .empty-state {
        color: var(--vscode-descriptionForeground);
        font-style: italic;
      }
    `,
  ];

  @property({ type: String }) message = 'No items';

  render() {
    return html`
      <span class="empty-state">
        <slot name="icon"></slot>
        ${this.message}
      </span>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'empty-state': EmptyState;
  }
}

