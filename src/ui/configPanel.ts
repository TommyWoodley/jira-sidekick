import * as vscode from 'vscode';
import { AuthService } from '../jira/auth';
import { JiraClient } from '../jira/client';
import type { ConfigApi } from '../shared/api';
import type { JiraCredentials } from '../shared/models';
import { exposeApi } from '../shared/rpc';

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

        const apiDisposable = exposeApi<ConfigApi>(this.panel.webview, this.createApi());
        this.disposables.push(apiDisposable);
    }

    private createApi(): ConfigApi {
        return {
            getCredentials: async () => {
                const credentials = await this.authService.getCredentials();
                const selectedFilter = await this.authService.getSelectedFilter();
                return {
                    credentials: credentials ? {
                        baseUrl: credentials.baseUrl,
                        email: credentials.email,
                    } : null,
                    selectedFilter,
                };
            },

            testConnection: async (credentials: JiraCredentials) => {
                await this.authService.setCredentials(credentials);
                const result = await this.client.testConnection();
                return {
                    success: result.success,
                    message: result.success ? 'Connection successful!' : result.error.message,
                };
            },

            saveCredentials: async (credentials: JiraCredentials) => {
                await this.authService.setCredentials(credentials);
                const result = await this.client.testConnection();
                return {
                    success: result.success,
                    message: result.success
                        ? 'Credentials saved! Now select a filter below.'
                        : result.error.message,
                };
            },

            loadFilters: async () => {
                const result = await this.client.getFilters();
                if (!result.success) {
                    throw new Error(result.error.message);
                }
                const selectedFilter = await this.authService.getSelectedFilter();
                return { filters: result.data, selectedFilter };
            },

            saveFilter: async (filterId: string | null) => {
                await this.authService.setSelectedFilter(filterId);
                vscode.window.showInformationMessage(
                    filterId ? 'Filter saved!' : 'Using default "My Issues" view'
                );
                this.onSuccess();
                this.panel.dispose();
            },

            openTokenPage: () => {
                vscode.env.openExternal(
                    vscode.Uri.parse('https://id.atlassian.com/manage-profile/security/api-tokens')
                );
            },
        };
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
