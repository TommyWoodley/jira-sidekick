import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import '@vscode-elements/elements/dist/vscode-button/index.js';
import '@vscode-elements/elements/dist/vscode-textfield/index.js';
import '@vscode-elements/elements/dist/vscode-label/index.js';
import '@vscode-elements/elements/dist/vscode-divider/index.js';
import { sharedStyles } from '../shared/styles';
import { createApiClient } from '../shared/rpc-client';
import type { ConfigApi } from '@shared/api';
import type { JiraCredentials, JiraFilter } from '@shared/models';

const api = createApiClient<ConfigApi>();

@customElement('config-app')
export class ConfigApp extends LitElement {
  static styles = [
    sharedStyles,
    css`
      :host {
        display: block;
        padding: 20px;
        max-width: 500px;
        margin: 0 auto;
      }

      h1 {
        font-size: 1.5em;
        margin-bottom: 0.5em;
      }

      h2 {
        font-size: 1.2em;
        margin-top: 2em;
        margin-bottom: 1em;
      }

      .subtitle {
        color: var(--vscode-descriptionForeground);
        margin-bottom: 2em;
      }

      .form-group {
        margin-bottom: 1.5em;
      }

      vscode-textfield {
        width: 100%;
      }

      .button-row {
        display: flex;
        gap: 10px;
        margin-top: 1.5em;
      }

      .token-link {
        display: block;
        margin-bottom: 0.5em;
      }

      .filter-list {
        max-height: 300px;
        overflow-y: auto;
        border: 1px solid var(--vscode-input-border);
        border-radius: 4px;
        margin-top: 0.5em;
      }

      .filter-item {
        padding: 10px 12px;
        cursor: pointer;
        border-bottom: 1px solid var(--vscode-input-border);
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .filter-item:last-child {
        border-bottom: none;
      }

      .filter-item:hover {
        background: var(--vscode-list-hoverBackground);
      }

      .filter-item.selected {
        background: var(--vscode-list-activeSelectionBackground);
        color: var(--vscode-list-activeSelectionForeground);
      }

      .filter-item.default {
        font-style: italic;
        color: var(--vscode-descriptionForeground);
      }

      .filter-item.default.selected {
        color: var(--vscode-list-activeSelectionForeground);
      }

      .filter-name {
        font-weight: 500;
      }

      .filter-fav {
        color: var(--vscode-charts-yellow);
      }

      .no-filters {
        padding: 20px;
        text-align: center;
        color: var(--vscode-descriptionForeground);
      }
    `,
  ];

  @state() private credentials: JiraCredentials = { baseUrl: '', email: '', apiToken: '' };
  @state() private message: { text: string; isSuccess: boolean } | null = null;
  @state() private isLoading = false;
  @state() private showFilters = false;
  @state() private filters: JiraFilter[] = [];
  @state() private selectedFilterId: string | null = null;
  @state() private filterSearch = '';
  @state() private filtersError: string | null = null;

  async connectedCallback() {
    super.connectedCallback();
    await this.loadCredentials();
  }

  private async loadCredentials() {
    try {
      const { credentials, selectedFilter } = await api.getCredentials();
      if (credentials) {
        this.credentials = {
          baseUrl: credentials.baseUrl || '',
          email: credentials.email || '',
          apiToken: '',
        };
      }
      if (selectedFilter) {
        this.selectedFilterId = selectedFilter;
      }
      if (credentials?.baseUrl && credentials?.email) {
        await this.loadFiltersQuietly();
      }
    } catch (error) {
      console.error('Failed to load credentials:', error);
    }
  }

  private async loadFiltersQuietly() {
    try {
      const { filters, selectedFilter } = await api.loadFilters();
      this.filters = filters;
      if (selectedFilter) {
        this.selectedFilterId = selectedFilter;
      }
      this.showFilters = true;
      this.filtersError = null;
    } catch (error) {
      this.filtersError = `Failed to load filters: ${error}`;
    }
  }

  private async handleTest() {
    if (!this.validateForm()) return;
    this.isLoading = true;
    try {
      const { success, message } = await api.testConnection(this.credentials);
      this.message = { text: message, isSuccess: success };
      if (success) {
        this.showFilters = true;
        await this.loadFiltersQuietly();
      }
    } catch (error) {
      this.message = { text: String(error), isSuccess: false };
    } finally {
      this.isLoading = false;
    }
  }

  private async handleSave(e: Event) {
    e.preventDefault();
    if (!this.validateForm()) return;
    this.isLoading = true;
    try {
      const { success, message } = await api.saveCredentials(this.credentials);
      this.message = { text: message, isSuccess: success };
      if (success) {
        this.showFilters = true;
        await this.loadFiltersQuietly();
      }
    } catch (error) {
      this.message = { text: String(error), isSuccess: false };
    } finally {
      this.isLoading = false;
    }
  }

  private validateForm(): boolean {
    if (!this.credentials.baseUrl || !this.credentials.email || !this.credentials.apiToken) {
      this.message = { text: 'Please fill in all fields', isSuccess: false };
      return false;
    }
    return true;
  }

  private handleOpenTokenPage() {
    api.openTokenPage();
  }

  private handleSelectFilter(filterId: string | null) {
    this.selectedFilterId = filterId;
  }

  private async handleSaveFilter() {
    await api.saveFilter(this.selectedFilterId);
  }

  private get filteredFilters() {
    const search = this.filterSearch.toLowerCase();
    return this.filters.filter((f) => f.name.toLowerCase().includes(search));
  }

  private get showDefaultOption() {
    return this.filterSearch === '' || 'my issues'.includes(this.filterSearch.toLowerCase());
  }

  render() {
    return html`
      <h1>Configure Jira Sidekick</h1>
      <p class="subtitle">Connect to your Jira Cloud instance</p>

      <form @submit=${this.handleSave}>
        <div class="form-group">
          <vscode-label>Jira URL</vscode-label>
          <vscode-textfield
            placeholder="https://your-domain.atlassian.net"
            .value=${this.credentials.baseUrl}
            @input=${(e: Event) => {
              const target = e.target as HTMLInputElement;
              this.credentials = { ...this.credentials, baseUrl: target.value.trim().replace(/\/$/, '') };
            }}
          ></vscode-textfield>
          <p class="help-text">Your Jira Cloud instance URL</p>
        </div>

        <div class="form-group">
          <vscode-label>Email</vscode-label>
          <vscode-textfield
            placeholder="you@example.com"
            .value=${this.credentials.email}
            @input=${(e: Event) => {
              const target = e.target as HTMLInputElement;
              this.credentials = { ...this.credentials, email: target.value.trim() };
            }}
          ></vscode-textfield>
          <p class="help-text">The email you use to log in to Jira</p>
        </div>

        <div class="form-group">
          <vscode-label>API Token</vscode-label>
          <vscode-button class="token-link" secondary @click=${this.handleOpenTokenPage}>
            Get API Token from Atlassian →
          </vscode-button>
          <vscode-textfield
            type="password"
            placeholder="Paste your API token here"
            .value=${this.credentials.apiToken}
            @input=${(e: Event) => {
              const target = e.target as HTMLInputElement;
              this.credentials = { ...this.credentials, apiToken: target.value.trim() };
            }}
          ></vscode-textfield>
          <p class="help-text">
            Create a token at
            <a href="#" @click=${(e: Event) => { e.preventDefault(); this.handleOpenTokenPage(); }}>
              id.atlassian.com
            </a>, copy it, and paste above
          </p>
        </div>

        <div class="button-row">
          <vscode-button secondary ?disabled=${this.isLoading} @click=${this.handleTest}>
            ${this.isLoading ? 'Testing...' : 'Test Connection'}
          </vscode-button>
          <vscode-button type="submit" ?disabled=${this.isLoading}>
            ${this.isLoading ? 'Saving...' : 'Save Credentials'}
          </vscode-button>
        </div>
      </form>

      ${this.message ? html`
        <div class="message ${this.message.isSuccess ? 'success' : 'error'}">
          ${this.message.text}
        </div>
      ` : ''}

      ${this.showFilters ? html`
        <vscode-divider></vscode-divider>
        <h2>Select Filter</h2>
        <p class="help-text">Choose which issues to display in the sidebar</p>

        <div class="form-group">
          <vscode-textfield
            placeholder="Search filters..."
            .value=${this.filterSearch}
            @input=${(e: Event) => {
              const target = e.target as HTMLInputElement;
              this.filterSearch = target.value;
            }}
          ></vscode-textfield>
        </div>

        <div class="filter-list">
          ${this.filtersError ? html`
            <div class="no-filters">${this.filtersError}</div>
          ` : html`
            ${this.showDefaultOption ? html`
              <div
                class="filter-item default ${this.selectedFilterId === null ? 'selected' : ''}"
                @click=${() => this.handleSelectFilter(null)}
              >
                <span class="filter-name">My Issues (Default)</span>
              </div>
            ` : ''}
            ${this.filteredFilters.length === 0 && this.filterSearch !== '' ? html`
              <div class="no-filters">No filters match your search</div>
            ` : this.filteredFilters.map((filter) => html`
              <div
                class="filter-item ${this.selectedFilterId === filter.id ? 'selected' : ''}"
                @click=${() => this.handleSelectFilter(filter.id)}
              >
                <span class="filter-name">${filter.name}</span>
                ${filter.favourite ? html`<span class="filter-fav">★</span>` : ''}
              </div>
            `)}
          `}
        </div>

        <div class="button-row">
          <vscode-button @click=${this.handleSaveFilter}>
            Save & Close
          </vscode-button>
        </div>
      ` : ''}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'config-app': ConfigApp;
  }
}
