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
        private readonly extensionUri: vscode.Uri,
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
                retainContextWhenHidden: true,
                localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'out', 'webview-ui')]
            }
        );

        ConfigPanel.currentPanel = new ConfigPanel(panel, extensionUri, authService, client, onSuccess);
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
        const webview = this.panel.webview;
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionUri, 'out', 'webview-ui', 'config-app.js')
        );

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Configure Jira Sidekick</title>
</head>
<body>
    <config-app></config-app>
    <script src="${scriptUri}"></script>
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
