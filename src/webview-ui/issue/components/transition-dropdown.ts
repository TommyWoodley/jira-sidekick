import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import '@vscode-elements/elements/dist/vscode-progress-ring/index.js';
import { sharedStyles } from '../../shared/styles';
import { getStatusDotClass } from '../../shared/components/status-badge';
import type { JiraTransition } from '@shared/models';

@customElement('transition-dropdown')
export class TransitionDropdown extends LitElement {
  static styles = [
    sharedStyles,
    css`
      :host {
        display: block;
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

      .status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        flex-shrink: 0;
      }

      .status-dot.done { background: #36B37E; }
      .status-dot.inprogress { background: #0065FF; }
      .status-dot.todo { background: #6B778C; }

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
    `,
  ];

  @property({ type: Array }) transitions: JiraTransition[] = [];
  @property({ type: Boolean }) loading = false;
  @property({ type: String }) error: string | null = null;

  private handleTransitionClick(transition: JiraTransition) {
    this.dispatchEvent(new CustomEvent('transition-select', {
      detail: { transition },
      bubbles: true,
      composed: true,
    }));
  }

  private handleClick(e: MouseEvent) {
    e.stopPropagation();
  }

  render() {
    if (this.loading) {
      return html`
        <div class="transition-dropdown" @click=${this.handleClick}>
          <div class="transition-loading">
            <vscode-progress-ring></vscode-progress-ring>
            Loading...
          </div>
        </div>
      `;
    }

    if (this.error) {
      return html`
        <div class="transition-dropdown" @click=${this.handleClick}>
          <div class="transition-error">${this.error}</div>
        </div>
      `;
    }

    if (this.transitions.length === 0) {
      return html`
        <div class="transition-dropdown" @click=${this.handleClick}>
          <div class="transition-loading">No transitions available</div>
        </div>
      `;
    }

    return html`
      <div class="transition-dropdown" @click=${this.handleClick}>
        ${this.transitions.map((transition) => html`
          <div 
            class="transition-item" 
            @click=${() => this.handleTransitionClick(transition)}
          >
            <span class="status-dot ${getStatusDotClass(transition.to.statusCategory.key)}"></span>
            ${transition.name}
          </div>
        `)}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'transition-dropdown': TransitionDropdown;
  }
}

