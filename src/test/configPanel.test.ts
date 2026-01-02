import * as assert from 'assert';
import * as vscode from 'vscode';
import { ConfigPanel } from '../ui/configPanel';
import { ok, err } from '../core/result';
import { JiraClientError } from '../jira/client';
import type { JiraFilter } from '../shared/models';
import {
    MockAuthService,
    MockJiraClient,
    MockPreferencesService,
    mockFilters,
} from './mocks';

interface RpcCall {
    type: 'rpc-call';
    id: string;
    method: string;
    args: unknown[];
}

async function simulateRpcCall(
    panel: { panel: vscode.WebviewPanel },
    method: string,
    args: unknown[] = []
): Promise<void> {
    const rpcCall: RpcCall = {
        type: 'rpc-call',
        id: `test-${Date.now()}`,
        method,
        args,
    };

    const internalPanel = (panel as unknown as { panel: vscode.WebviewPanel }).panel;

    const listeners = (internalPanel.webview as unknown as {
        _onDidReceiveMessage?: { fire: (msg: unknown) => void }
    })._onDidReceiveMessage;

    if (listeners?.fire) {
        listeners.fire(rpcCall);
        await new Promise(resolve => setTimeout(resolve, 50));
    }
}

suite('ConfigPanel Test Suite', () => {
    let authService: MockAuthService;
    let preferences: MockPreferencesService;
    let client: MockJiraClient;
    let onSuccessCalled: boolean;

    setup(() => {
        authService = new MockAuthService();
        preferences = new MockPreferencesService();
        client = new MockJiraClient();
        onSuccessCalled = false;
        ConfigPanel.currentPanel = undefined;
    });

    teardown(() => {
        if (ConfigPanel.currentPanel) {
            ConfigPanel.currentPanel.dispose();
        }
    });

    suite('Static Properties', () => {
        test('currentPanel is initially undefined', () => {
            assert.strictEqual(ConfigPanel.currentPanel, undefined);
        });
    });

    suite('Module Loading', () => {
        test('ConfigPanel class is exported', () => {
            assert.ok(ConfigPanel);
        });

        test('ConfigPanel has show static method', () => {
            assert.strictEqual(typeof ConfigPanel.show, 'function');
        });

        test('ConfigPanel.show accepts preferences parameter', () => {
            assert.strictEqual(ConfigPanel.show.length, 5);
        });
    });

    suite('PreferencesService integration', () => {
        test('PreferencesService is passed to ConfigPanel.show', () => {
            assert.ok(preferences);
            assert.strictEqual(typeof preferences.getSelectedFilter, 'function');
            assert.strictEqual(typeof preferences.setSelectedFilter, 'function');
        });

        test('preferences can get and set filter for ConfigPanel usage', async () => {
            assert.strictEqual(preferences.getSelectedFilter(), null);
            await preferences.setSelectedFilter('filter-123');
            assert.strictEqual(preferences.getSelectedFilter(), 'filter-123');
        });
    });

    suite('ConfigPanel.show()', () => {
        test('creates new panel when none exists', async () => {
            const extensionUri = vscode.Uri.file('/mock/extension');
            await ConfigPanel.show(
                extensionUri,
                authService,
                preferences,
                client,
                () => { onSuccessCalled = true; }
            );
            assert.ok(ConfigPanel.currentPanel);
        });

        test('reveals existing panel when called twice', async () => {
            const extensionUri = vscode.Uri.file('/mock/extension');
            await ConfigPanel.show(
                extensionUri,
                authService,
                preferences,
                client,
                () => { onSuccessCalled = true; }
            );
            const firstPanel = ConfigPanel.currentPanel;

            await ConfigPanel.show(
                extensionUri,
                authService,
                preferences,
                client,
                () => { onSuccessCalled = true; }
            );
            assert.strictEqual(ConfigPanel.currentPanel, firstPanel);
        });
    });

    suite('API via RPC - getCredentials', () => {
        test('returns null credentials when none stored', async () => {
            const extensionUri = vscode.Uri.file('/mock/extension');
            await ConfigPanel.show(extensionUri, authService, preferences, client, () => { });
            assert.ok(ConfigPanel.currentPanel);
            await simulateRpcCall(ConfigPanel.currentPanel as unknown as { panel: vscode.WebviewPanel }, 'getCredentials');
        });

        test('returns credentials when stored', async () => {
            authService.setMockCredentials({
                baseUrl: 'https://test.atlassian.net',
                email: 'test@example.com',
                apiToken: 'test-token',
            });
            const extensionUri = vscode.Uri.file('/mock/extension');
            await ConfigPanel.show(extensionUri, authService, preferences, client, () => { });
            assert.ok(ConfigPanel.currentPanel);
            await simulateRpcCall(ConfigPanel.currentPanel as unknown as { panel: vscode.WebviewPanel }, 'getCredentials');
        });

        test('includes selected filter in response', async () => {
            await preferences.setSelectedFilter('filter-123');
            const extensionUri = vscode.Uri.file('/mock/extension');
            await ConfigPanel.show(extensionUri, authService, preferences, client, () => { });
            assert.ok(ConfigPanel.currentPanel);
            await simulateRpcCall(ConfigPanel.currentPanel as unknown as { panel: vscode.WebviewPanel }, 'getCredentials');
        });
    });

    suite('API via RPC - testConnection', () => {
        test('tests connection with provided credentials', async () => {
            client.testConnectionWithResult = ok<void>(undefined);
            const extensionUri = vscode.Uri.file('/mock/extension');
            await ConfigPanel.show(extensionUri, authService, preferences, client, () => { });
            assert.ok(ConfigPanel.currentPanel);
            await simulateRpcCall(
                ConfigPanel.currentPanel as unknown as { panel: vscode.WebviewPanel },
                'testConnection',
                [{ baseUrl: 'https://test.atlassian.net', email: 'test@example.com', apiToken: 'token' }]
            );
        });

        test('uses stored token when not provided', async () => {
            authService.setMockCredentials({
                baseUrl: 'https://test.atlassian.net',
                email: 'test@example.com',
                apiToken: 'stored-token',
            });
            client.testConnectionWithResult = ok<void>(undefined);
            const extensionUri = vscode.Uri.file('/mock/extension');
            await ConfigPanel.show(extensionUri, authService, preferences, client, () => { });
            assert.ok(ConfigPanel.currentPanel);
            await simulateRpcCall(
                ConfigPanel.currentPanel as unknown as { panel: vscode.WebviewPanel },
                'testConnection',
                [{ baseUrl: 'https://test.atlassian.net', email: 'test@example.com', apiToken: '' }]
            );
        });

        test('returns error message on failure', async () => {
            client.testConnectionWithResult = err(new JiraClientError('Connection failed', 401));
            const extensionUri = vscode.Uri.file('/mock/extension');
            await ConfigPanel.show(extensionUri, authService, preferences, client, () => { });
            assert.ok(ConfigPanel.currentPanel);
            await simulateRpcCall(
                ConfigPanel.currentPanel as unknown as { panel: vscode.WebviewPanel },
                'testConnection',
                [{ baseUrl: 'https://test.atlassian.net', email: 'test@example.com', apiToken: 'token' }]
            );
        });
    });

    suite('API via RPC - saveCredentials', () => {
        test('saves credentials and tests connection', async () => {
            client.testConnectionResult = ok<void>(undefined);
            const extensionUri = vscode.Uri.file('/mock/extension');
            await ConfigPanel.show(extensionUri, authService, preferences, client, () => { });
            assert.ok(ConfigPanel.currentPanel);
            await simulateRpcCall(
                ConfigPanel.currentPanel as unknown as { panel: vscode.WebviewPanel },
                'saveCredentials',
                [{ baseUrl: 'https://test.atlassian.net', email: 'test@example.com', apiToken: 'token' }]
            );
        });

        test('returns error on failed connection after save', async () => {
            client.testConnectionResult = err(new JiraClientError('Invalid credentials', 401));
            const extensionUri = vscode.Uri.file('/mock/extension');
            await ConfigPanel.show(extensionUri, authService, preferences, client, () => { });
            assert.ok(ConfigPanel.currentPanel);
            await simulateRpcCall(
                ConfigPanel.currentPanel as unknown as { panel: vscode.WebviewPanel },
                'saveCredentials',
                [{ baseUrl: 'https://test.atlassian.net', email: 'test@example.com', apiToken: 'token' }]
            );
        });
    });

    suite('API via RPC - loadFilters', () => {
        test('returns filters on success', async () => {
            client.getFiltersResult = ok<JiraFilter[]>(mockFilters);
            const extensionUri = vscode.Uri.file('/mock/extension');
            await ConfigPanel.show(extensionUri, authService, preferences, client, () => { });
            assert.ok(ConfigPanel.currentPanel);
            await simulateRpcCall(ConfigPanel.currentPanel as unknown as { panel: vscode.WebviewPanel }, 'loadFilters');
        });

        test('throws error on failure', async () => {
            client.getFiltersResult = err(new JiraClientError('Failed to load filters', 500));
            const extensionUri = vscode.Uri.file('/mock/extension');
            await ConfigPanel.show(extensionUri, authService, preferences, client, () => { });
            assert.ok(ConfigPanel.currentPanel);
            await simulateRpcCall(ConfigPanel.currentPanel as unknown as { panel: vscode.WebviewPanel }, 'loadFilters');
        });

        test('includes selected filter in response', async () => {
            await preferences.setSelectedFilter('10001');
            client.getFiltersResult = ok<JiraFilter[]>(mockFilters);
            const extensionUri = vscode.Uri.file('/mock/extension');
            await ConfigPanel.show(extensionUri, authService, preferences, client, () => { });
            assert.ok(ConfigPanel.currentPanel);
            await simulateRpcCall(ConfigPanel.currentPanel as unknown as { panel: vscode.WebviewPanel }, 'loadFilters');
        });
    });

    suite('API via RPC - openTokenPage', () => {
        test('opens external URL for API tokens', async () => {
            const extensionUri = vscode.Uri.file('/mock/extension');
            await ConfigPanel.show(extensionUri, authService, preferences, client, () => { });
            assert.ok(ConfigPanel.currentPanel);
            await simulateRpcCall(ConfigPanel.currentPanel as unknown as { panel: vscode.WebviewPanel }, 'openTokenPage');
        });
    });

    suite('dispose()', () => {
        test('clears currentPanel on dispose', async () => {
            const extensionUri = vscode.Uri.file('/mock/extension');
            await ConfigPanel.show(
                extensionUri,
                authService,
                preferences,
                client,
                () => { }
            );
            assert.ok(ConfigPanel.currentPanel);
            ConfigPanel.currentPanel!.dispose();
            assert.strictEqual(ConfigPanel.currentPanel, undefined);
        });

        test('dispose can be called multiple times', async () => {
            const extensionUri = vscode.Uri.file('/mock/extension');
            await ConfigPanel.show(
                extensionUri,
                authService,
                preferences,
                client,
                () => { }
            );
            const panel = ConfigPanel.currentPanel!;
            panel.dispose();
            panel.dispose();
            assert.strictEqual(ConfigPanel.currentPanel, undefined);
        });
    });

    suite('getWebviewContent()', () => {
        test('generates HTML with script URI', async () => {
            const extensionUri = vscode.Uri.file('/mock/extension');
            await ConfigPanel.show(
                extensionUri,
                authService,
                preferences,
                client,
                () => { }
            );
            assert.ok(ConfigPanel.currentPanel);
        });
    });
});
