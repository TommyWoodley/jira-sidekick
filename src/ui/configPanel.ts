import * as vscode from 'vscode';
import { AuthService } from '../jira/auth';
import { JiraClient } from '../jira/client';
import { JiraCredentials } from '../jira/types';

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
        this.panel.webview.postMessage({
            command: 'loadCredentials',
            data: credentials ? {
                baseUrl: credentials.baseUrl,
                email: credentials.email,
                apiToken: ''
            } : null
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
    }

    private async handleSave(data: JiraCredentials): Promise<void> {
        await this.authService.setCredentials(data);
        const result = await this.client.testConnection();
        
        if (result.success) {
            vscode.window.showInformationMessage('Jira credentials saved successfully!');
            this.onSuccess();
            this.panel.dispose();
        } else {
            this.panel.webview.postMessage({
                command: 'saveResult',
                success: false,
                message: result.error || 'Connection failed. Please check your credentials.'
            });
        }
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
        h1 {
            font-size: 1.5em;
            margin-bottom: 0.5em;
            color: var(--vscode-foreground);
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
            margin-top: 2em;
        }
        button {
            padding: 8px 16px;
            border: none;
            border-radius: 4px;
            font-size: 14px;
            cursor: pointer;
            font-weight: 500;
        }
        .primary {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }
        .primary:hover {
            background: var(--vscode-button-hoverBackground);
        }
        .secondary {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }
        .secondary:hover {
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
        .step-indicator {
            display: flex;
            gap: 8px;
            margin-bottom: 2em;
        }
        .step {
            flex: 1;
            height: 4px;
            background: var(--vscode-input-border);
            border-radius: 2px;
        }
        .step.active {
            background: var(--vscode-button-background);
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
            <button type="submit" class="primary" id="saveBtn">Save & Connect</button>
        </div>
    </form>

    <div id="message" class="message"></div>

    <script>
        const vscode = acquireVsCodeApi();
        
        const form = document.getElementById('configForm');
        const baseUrlInput = document.getElementById('baseUrl');
        const emailInput = document.getElementById('email');
        const apiTokenInput = document.getElementById('apiToken');
        const testBtn = document.getElementById('testBtn');
        const messageDiv = document.getElementById('message');

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

        function showMessage(text, isSuccess) {
            messageDiv.textContent = text;
            messageDiv.className = 'message ' + (isSuccess ? 'success' : 'error');
        }

        testBtn.addEventListener('click', () => {
            const data = getFormData();
            if (!data.baseUrl || !data.email || !data.apiToken) {
                showMessage('Please fill in all fields', false);
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
                showMessage('Please fill in all fields', false);
                return;
            }
            document.getElementById('saveBtn').disabled = true;
            document.getElementById('saveBtn').textContent = 'Connecting...';
            vscode.postMessage({ command: 'save', data });
        });

        window.addEventListener('message', (event) => {
            const message = event.data;
            switch (message.command) {
                case 'loadCredentials':
                    if (message.data) {
                        baseUrlInput.value = message.data.baseUrl || '';
                        emailInput.value = message.data.email || '';
                    }
                    break;
                case 'testResult':
                    testBtn.disabled = false;
                    testBtn.textContent = 'Test Connection';
                    showMessage(message.message, message.success);
                    break;
                case 'saveResult':
                    document.getElementById('saveBtn').disabled = false;
                    document.getElementById('saveBtn').textContent = 'Save & Connect';
                    showMessage(message.message, message.success);
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

