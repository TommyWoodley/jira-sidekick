import * as vscode from 'vscode';
import { AuthService } from '../jira/auth';
import { JiraClient } from '../jira/client';
import { JiraCredentials, JiraFilter } from '../jira/types';

export class ConfigPanel {
    public static currentPanel: ConfigPanel | undefined;
    private readonly panel: vscode.WebviewPanel;
    private disposables: vscode.Disposable[] = [];

    private constructor(
        panel: vscode.WebviewPanel,
        private readonly authService: AuthService,
        private readonly client: JiraClient,
        private readonly onSuccess: () => void
    ) {
        this.panel = panel;
        this.panel.webview.html = this.getWebviewContent();

        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

        this.panel.webview.onDidReceiveMessage(
            async (message) => {
                switch (message.command) {
                    case 'save':
                        await this.handleSave(message.data);
                        break;
                    case 'test':
                        await this.handleTest(message.data);
                        break;
                    case 'openTokenPage':
                        vscode.env.openExternal(
                            vscode.Uri.parse('https://id.atlassian.com/manage-profile/security/api-tokens')
                        );
                        break;
                    case 'load':
                        await this.sendExistingCredentials();
                        break;
                    case 'loadFilters':
                        await this.handleLoadFilters();
                        break;
                    case 'saveFilter':
                        await this.handleSaveFilter(message.filterId);
                        break;
                }
            },
            null,
            this.disposables
        );
    }

    public static async show(
        extensionUri: vscode.Uri,
        authService: AuthService,
        client: JiraClient,
        onSuccess: () => void
    ): Promise<void> {
        if (ConfigPanel.currentPanel) {
            ConfigPanel.currentPanel.panel.reveal();
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'jiraSidekickConfig',
            'Jira Sidekick - Configure',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        ConfigPanel.currentPanel = new ConfigPanel(panel, authService, client, onSuccess);
    }

    private async sendExistingCredentials(): Promise<void> {
        const credentials = await this.authService.getCredentials();
        const selectedFilter = await this.authService.getSelectedFilter();
        this.panel.webview.postMessage({
            command: 'loadCredentials',
            data: credentials ? {
                baseUrl: credentials.baseUrl,
                email: credentials.email,
                apiToken: ''
            } : null,
            selectedFilter
        });
    }

    private async handleTest(data: JiraCredentials): Promise<void> {
        await this.authService.setCredentials(data);
        const result = await this.client.testConnection();
        this.panel.webview.postMessage({
            command: 'testResult',
            success: result.success,
            message: result.success ? 'Connection successful!' : result.error || 'Connection failed.'
        });

        if (result.success) {
            await this.handleLoadFilters();
        }
    }

    private async handleSave(data: JiraCredentials): Promise<void> {
        await this.authService.setCredentials(data);
        const result = await this.client.testConnection();
        
        if (result.success) {
            this.panel.webview.postMessage({
                command: 'saveResult',
                success: true,
                message: 'Credentials saved! Now select a filter below.'
            });
            await this.handleLoadFilters();
        } else {
            this.panel.webview.postMessage({
                command: 'saveResult',
                success: false,
                message: result.error || 'Connection failed. Please check your credentials.'
            });
        }
    }

    private async handleLoadFilters(): Promise<void> {
        try {
            const filters = await this.client.getFilters();
            const selectedFilter = await this.authService.getSelectedFilter();
            this.panel.webview.postMessage({
                command: 'filtersLoaded',
                filters,
                selectedFilter
            });
        } catch (error) {
            this.panel.webview.postMessage({
                command: 'filtersError',
                message: `Failed to load filters: ${error}`
            });
        }
    }

    private async handleSaveFilter(filterId: string | null): Promise<void> {
        await this.authService.setSelectedFilter(filterId);
        vscode.window.showInformationMessage(
            filterId ? 'Filter saved!' : 'Using default "My Issues" view'
        );
        this.onSuccess();
        this.panel.dispose();
    }

    private getWebviewContent(): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Configure Jira Sidekick</title>
    <style>
        :root {
            --vscode-font: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
        }
        body {
            font-family: var(--vscode-font);
            padding: 20px;
            max-width: 500px;
            margin: 0 auto;
            color: var(--vscode-foreground);
            background: var(--vscode-editor-background);
        }
        h1, h2 {
            color: var(--vscode-foreground);
        }
        h1 {
            font-size: 1.5em;
            margin-bottom: 0.5em;
        }
        h2 {
            font-size: 1.2em;
            margin-top: 2em;
            margin-bottom: 1em;
            padding-top: 1.5em;
            border-top: 1px solid var(--vscode-input-border);
        }
        .subtitle {
            color: var(--vscode-descriptionForeground);
            margin-bottom: 2em;
        }
        .form-group {
            margin-bottom: 1.5em;
        }
        label {
            display: block;
            margin-bottom: 0.5em;
            font-weight: 500;
        }
        input {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid var(--vscode-input-border);
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border-radius: 4px;
            font-size: 14px;
            box-sizing: border-box;
        }
        input:focus {
            outline: none;
            border-color: var(--vscode-focusBorder);
        }
        .help-text {
            font-size: 0.85em;
            color: var(--vscode-descriptionForeground);
            margin-top: 0.5em;
        }
        .help-text a {
            color: var(--vscode-textLink-foreground);
            text-decoration: none;
        }
        .help-text a:hover {
            text-decoration: underline;
        }
        .button-row {
            display: flex;
            gap: 10px;
            margin-top: 1.5em;
        }
        button {
            padding: 8px 16px;
            border: none;
            border-radius: 4px;
            font-size: 14px;
            cursor: pointer;
            font-weight: 500;
        }
        button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }
        .primary {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }
        .primary:hover:not(:disabled) {
            background: var(--vscode-button-hoverBackground);
        }
        .secondary {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }
        .secondary:hover:not(:disabled) {
            background: var(--vscode-button-secondaryHoverBackground);
        }
        .message {
            padding: 10px;
            border-radius: 4px;
            margin-top: 1em;
            display: none;
        }
        .message.success {
            background: var(--vscode-testing-iconPassed);
            color: white;
            display: block;
        }
        .message.error {
            background: var(--vscode-testing-iconFailed);
            color: white;
            display: block;
        }
        .token-link {
            display: inline-block;
            margin-bottom: 1em;
            padding: 8px 12px;
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border-radius: 4px;
            text-decoration: none;
            font-size: 14px;
        }
        .token-link:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }

        /* Filter picker styles */
        #filterSection {
            display: none;
        }
        #filterSection.visible {
            display: block;
        }
        .filter-search {
            position: relative;
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
        .loading {
            padding: 20px;
            text-align: center;
            color: var(--vscode-descriptionForeground);
        }
    </style>
</head>
<body>
    <h1>Configure Jira Sidekick</h1>
    <p class="subtitle">Connect to your Jira Cloud instance</p>

    <form id="configForm">
        <div class="form-group">
            <label for="baseUrl">Jira URL</label>
            <input type="url" id="baseUrl" placeholder="https://your-domain.atlassian.net" required>
            <p class="help-text">Your Jira Cloud instance URL</p>
        </div>

        <div class="form-group">
            <label for="email">Email</label>
            <input type="email" id="email" placeholder="you@example.com" required>
            <p class="help-text">The email you use to log in to Jira</p>
        </div>

        <div class="form-group">
            <label for="apiToken">API Token</label>
            <a href="#" class="token-link" id="getTokenLink">Get API Token from Atlassian →</a>
            <input type="password" id="apiToken" placeholder="Paste your API token here" required>
            <p class="help-text">Create a token at <a href="#" id="tokenHelpLink">id.atlassian.com</a>, copy it, and paste above</p>
        </div>

        <div class="button-row">
            <button type="button" class="secondary" id="testBtn">Test Connection</button>
            <button type="submit" class="primary" id="saveBtn">Save Credentials</button>
        </div>
    </form>

    <div id="credMessage" class="message"></div>

    <div id="filterSection">
        <h2>Select Filter</h2>
        <p class="help-text">Choose which issues to display in the sidebar</p>

        <div class="form-group filter-search">
            <input type="text" id="filterSearch" placeholder="Search filters...">
        </div>

        <div id="filterList" class="filter-list">
            <div class="loading">Loading filters...</div>
        </div>

        <div class="button-row">
            <button type="button" class="primary" id="saveFilterBtn" disabled>Save & Close</button>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        
        const form = document.getElementById('configForm');
        const baseUrlInput = document.getElementById('baseUrl');
        const emailInput = document.getElementById('email');
        const apiTokenInput = document.getElementById('apiToken');
        const testBtn = document.getElementById('testBtn');
        const credMessageDiv = document.getElementById('credMessage');
        const filterSection = document.getElementById('filterSection');
        const filterSearchInput = document.getElementById('filterSearch');
        const filterListDiv = document.getElementById('filterList');
        const saveFilterBtn = document.getElementById('saveFilterBtn');

        let allFilters = [];
        let selectedFilterId = null;

        document.getElementById('getTokenLink').addEventListener('click', (e) => {
            e.preventDefault();
            vscode.postMessage({ command: 'openTokenPage' });
        });

        document.getElementById('tokenHelpLink').addEventListener('click', (e) => {
            e.preventDefault();
            vscode.postMessage({ command: 'openTokenPage' });
        });

        function getFormData() {
            return {
                baseUrl: baseUrlInput.value.trim().replace(/\\/$/, ''),
                email: emailInput.value.trim(),
                apiToken: apiTokenInput.value.trim()
            };
        }

        function showCredMessage(text, isSuccess) {
            credMessageDiv.textContent = text;
            credMessageDiv.className = 'message ' + (isSuccess ? 'success' : 'error');
        }

        testBtn.addEventListener('click', () => {
            const data = getFormData();
            if (!data.baseUrl || !data.email || !data.apiToken) {
                showCredMessage('Please fill in all fields', false);
                return;
            }
            testBtn.disabled = true;
            testBtn.textContent = 'Testing...';
            vscode.postMessage({ command: 'test', data });
        });

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const data = getFormData();
            if (!data.baseUrl || !data.email || !data.apiToken) {
                showCredMessage('Please fill in all fields', false);
                return;
            }
            document.getElementById('saveBtn').disabled = true;
            document.getElementById('saveBtn').textContent = 'Saving...';
            vscode.postMessage({ command: 'save', data });
        });

        filterSearchInput.addEventListener('input', () => {
            renderFilterList();
        });

        saveFilterBtn.addEventListener('click', () => {
            vscode.postMessage({ command: 'saveFilter', filterId: selectedFilterId });
        });

        function renderFilterList() {
            const searchTerm = filterSearchInput.value.toLowerCase();
            const filtered = allFilters.filter(f =>
                f.name.toLowerCase().includes(searchTerm)
            );

            let html = '';

            // Default option
            const defaultSelected = selectedFilterId === null;
            if ('my issues'.includes(searchTerm) || searchTerm === '') {
                html += '<div class="filter-item default' + (defaultSelected ? ' selected' : '') + '" data-filter-id="">'+
                    '<span class="filter-name">My Issues (Default)</span>'+
                    '</div>';
            }

            if (filtered.length === 0 && searchTerm !== '') {
                html += '<div class="no-filters">No filters match your search</div>';
            } else {
                filtered.forEach(filter => {
                    const isSelected = selectedFilterId === filter.id;
                    html += '<div class="filter-item' + (isSelected ? ' selected' : '') + '" data-filter-id="' + filter.id + '">' +
                        '<span class="filter-name">' + escapeHtml(filter.name) + '</span>' +
                        (filter.favourite ? '<span class="filter-fav">★</span>' : '') +
                        '</div>';
                });
            }

            filterListDiv.innerHTML = html;

            // Add click handlers
            filterListDiv.querySelectorAll('.filter-item').forEach(item => {
                item.addEventListener('click', () => {
                    const filterId = item.dataset.filterId;
                    selectedFilterId = filterId === '' ? null : filterId;
                    renderFilterList();
                    saveFilterBtn.disabled = false;
                });
            });
        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        window.addEventListener('message', (event) => {
            const message = event.data;
            switch (message.command) {
                case 'loadCredentials':
                    if (message.data) {
                        baseUrlInput.value = message.data.baseUrl || '';
                        emailInput.value = message.data.email || '';
                    }
                    if (message.selectedFilter) {
                        selectedFilterId = message.selectedFilter;
                    }
                    // If we have credentials, try to load filters
                    if (message.data && message.data.baseUrl && message.data.email) {
                        vscode.postMessage({ command: 'loadFilters' });
                    }
                    break;
                case 'testResult':
                    testBtn.disabled = false;
                    testBtn.textContent = 'Test Connection';
                    showCredMessage(message.message, message.success);
                    if (message.success) {
                        filterSection.classList.add('visible');
                    }
                    break;
                case 'saveResult':
                    document.getElementById('saveBtn').disabled = false;
                    document.getElementById('saveBtn').textContent = 'Save Credentials';
                    showCredMessage(message.message, message.success);
                    if (message.success) {
                        filterSection.classList.add('visible');
                    }
                    break;
                case 'filtersLoaded':
                    allFilters = message.filters || [];
                    if (message.selectedFilter) {
                        selectedFilterId = message.selectedFilter;
                    }
                    filterSection.classList.add('visible');
                    renderFilterList();
                    saveFilterBtn.disabled = false;
                    break;
                case 'filtersError':
                    filterListDiv.innerHTML = '<div class="no-filters">' + message.message + '</div>';
                    break;
            }
        });

        vscode.postMessage({ command: 'load' });
    </script>
</body>
</html>`;
    }

    public dispose(): void {
        ConfigPanel.currentPanel = undefined;
        this.panel.dispose();
        while (this.disposables.length) {
            const x = this.disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }
}
