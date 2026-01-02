import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { sharedStyles } from '../styles';
import type { JiraStatus } from '@shared/models';

@customElement('status-badge')
export class StatusBadge extends LitElement {
  static styles = [
    sharedStyles,
    css`
      :host {
        display: inline-block;
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

      .status-badge.transitioning {
        opacity: 0.7;
        pointer-events: none;
      }

      .dropdown-arrow {
        margin-left: 4px;
        font-size: 0.7em;
      }
    `,
  ];

  @property({ type: Object }) status: JiraStatus | null = null;
  @property({ type: Boolean }) clickable = false;
  @property({ type: Boolean }) showArrow = false;
  @property({ type: Boolean }) transitioning = false;

  private getStatusClass(categoryKey: string): string {
    switch (categoryKey) {
      case 'done': return 'status-done';
      case 'indeterminate': return 'status-inprogress';
      default: return 'status-todo';
    }
  }

  private handleClick(e: MouseEvent) {
    if (!this.clickable || this.transitioning) {
      return;
    }
    e.stopPropagation();
    this.dispatchEvent(new CustomEvent('status-click', { bubbles: true, composed: true }));
  }

  render() {
    if (!this.status) {
      return html``;
    }

    const statusClass = this.getStatusClass(this.status.statusCategory.key);
    const classes = [
      'status-badge',
      statusClass,
      this.clickable ? 'clickable' : '',
      this.transitioning ? 'transitioning' : '',
    ].filter(Boolean).join(' ');

    return html`
      <span 
        class="${classes}"
        @click=${this.handleClick}
        title=${this.clickable ? 'Click to change status' : ''}
      >
        ${this.status.name}
        ${this.showArrow ? html`<span class="dropdown-arrow">▼</span>` : ''}
      </span>
    `;
  }
}

export function getStatusDotClass(categoryKey: string): string {
  switch (categoryKey) {
    case 'done': return 'done';
    case 'indeterminate': return 'inprogress';
    default: return 'todo';
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'status-badge': StatusBadge;
  }
}

