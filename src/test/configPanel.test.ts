import * as assert from 'assert';
import * as vscode from 'vscode';
import { ConfigPanel } from '../ui/configPanel';
import { ok, err } from '../core/result';
import { JiraClientError } from '../jira/client';
import type { JiraFilter } from '../shared/models';
import type { ConfigApi } from '../shared/api';
import {
    MockAuthService,
    MockJiraClient,
    MockPreferencesService,
    mockFilters,
} from './mocks';

interface InternalConfigPanel {
    panel: vscode.WebviewPanel;
    createApi(): ConfigApi;
    authService: MockAuthService;
    preferences: MockPreferencesService;
    client: MockJiraClient;
    onSuccess: () => void;
}

function getInternalPanel(panel: ConfigPanel): InternalConfigPanel {
    return panel as unknown as InternalConfigPanel;
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

    suiteTeardown(() => {
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

    suite('API - getCredentials', () => {
        test('returns null credentials when none stored', async () => {
            const extensionUri = vscode.Uri.file('/mock/extension');
            await ConfigPanel.show(extensionUri, authService, preferences, client, () => {});
            
            const internal = getInternalPanel(ConfigPanel.currentPanel!);
            const api = internal.createApi();
            const result = await api.getCredentials();
            assert.strictEqual(result.credentials, null);
        });

        test('returns credentials when stored', async () => {
            authService.setMockCredentials({
                baseUrl: 'https://test.atlassian.net',
                email: 'test@example.com',
                apiToken: 'test-token',
            });
            const extensionUri = vscode.Uri.file('/mock/extension');
            await ConfigPanel.show(extensionUri, authService, preferences, client, () => {});
            
            const internal = getInternalPanel(ConfigPanel.currentPanel!);
            const api = internal.createApi();
            const result = await api.getCredentials();
            assert.ok(result.credentials);
            assert.strictEqual(result.credentials.baseUrl, 'https://test.atlassian.net');
            assert.strictEqual(result.credentials.email, 'test@example.com');
        });

        test('includes selected filter in response', async () => {
            await preferences.setSelectedFilter('filter-123');
            const extensionUri = vscode.Uri.file('/mock/extension');
            await ConfigPanel.show(extensionUri, authService, preferences, client, () => {});
            
            const internal = getInternalPanel(ConfigPanel.currentPanel!);
            const api = internal.createApi();
            const result = await api.getCredentials();
            assert.strictEqual(result.selectedFilter, 'filter-123');
        });
    });

    suite('API - testConnection', () => {
        test('tests connection with provided credentials - success', async () => {
            client.testConnectionWithResult = ok<void>(undefined);
            const extensionUri = vscode.Uri.file('/mock/extension');
            await ConfigPanel.show(extensionUri, authService, preferences, client, () => {});
            
            const internal = getInternalPanel(ConfigPanel.currentPanel!);
            const api = internal.createApi();
            const result = await api.testConnection({
                baseUrl: 'https://test.atlassian.net',
                email: 'test@example.com',
                apiToken: 'token',
            });
            assert.strictEqual(result.success, true);
            assert.strictEqual(result.message, 'Connection successful!');
        });

        test('uses stored token when not provided in credentials', async () => {
            authService.setMockCredentials({
                baseUrl: 'https://test.atlassian.net',
                email: 'test@example.com',
                apiToken: 'stored-token',
            });
            client.testConnectionWithResult = ok<void>(undefined);
            const extensionUri = vscode.Uri.file('/mock/extension');
            await ConfigPanel.show(extensionUri, authService, preferences, client, () => {});
            
            const internal = getInternalPanel(ConfigPanel.currentPanel!);
            const api = internal.createApi();
            const result = await api.testConnection({
                baseUrl: 'https://test.atlassian.net',
                email: 'test@example.com',
                apiToken: '',
            });
            assert.strictEqual(result.success, true);
        });

        test('returns error message on failure', async () => {
            client.testConnectionWithResult = err(new JiraClientError('Connection failed', 401));
            const extensionUri = vscode.Uri.file('/mock/extension');
            await ConfigPanel.show(extensionUri, authService, preferences, client, () => {});
            
            const internal = getInternalPanel(ConfigPanel.currentPanel!);
            const api = internal.createApi();
            const result = await api.testConnection({
                baseUrl: 'https://test.atlassian.net',
                email: 'test@example.com',
                apiToken: 'token',
            });
            assert.strictEqual(result.success, false);
            assert.strictEqual(result.message, 'Connection failed');
        });
    });

    suite('API - saveCredentials', () => {
        test('saves credentials and tests connection - success', async () => {
            client.testConnectionResult = ok<void>(undefined);
            const extensionUri = vscode.Uri.file('/mock/extension');
            await ConfigPanel.show(extensionUri, authService, preferences, client, () => {});
            
            const internal = getInternalPanel(ConfigPanel.currentPanel!);
            const api = internal.createApi();
            const result = await api.saveCredentials({
                baseUrl: 'https://test.atlassian.net',
                email: 'test@example.com',
                apiToken: 'token',
            });
            assert.strictEqual(result.success, true);
            assert.ok(result.message.includes('saved'));
        });

        test('returns error on failed connection after save', async () => {
            client.testConnectionResult = err(new JiraClientError('Invalid credentials', 401));
            const extensionUri = vscode.Uri.file('/mock/extension');
            await ConfigPanel.show(extensionUri, authService, preferences, client, () => {});
            
            const internal = getInternalPanel(ConfigPanel.currentPanel!);
            const api = internal.createApi();
            const result = await api.saveCredentials({
                baseUrl: 'https://test.atlassian.net',
                email: 'test@example.com',
                apiToken: 'token',
            });
            assert.strictEqual(result.success, false);
            assert.strictEqual(result.message, 'Invalid credentials');
        });
    });

    suite('API - loadFilters', () => {
        test('returns filters on success', async () => {
            client.getFiltersResult = ok<JiraFilter[]>(mockFilters);
            const extensionUri = vscode.Uri.file('/mock/extension');
            await ConfigPanel.show(extensionUri, authService, preferences, client, () => {});
            
            const internal = getInternalPanel(ConfigPanel.currentPanel!);
            const api = internal.createApi();
            const result = await api.loadFilters();
            assert.strictEqual(result.filters.length, 2);
            assert.strictEqual(result.filters[0].name, 'My Issues');
        });

        test('throws error on failure', async () => {
            client.getFiltersResult = err(new JiraClientError('Failed to load filters', 500));
            const extensionUri = vscode.Uri.file('/mock/extension');
            await ConfigPanel.show(extensionUri, authService, preferences, client, () => {});
            
            const internal = getInternalPanel(ConfigPanel.currentPanel!);
            const api = internal.createApi();
            await assert.rejects(
                async () => await api.loadFilters(),
                { message: 'Failed to load filters' }
            );
        });

        test('includes selected filter in response', async () => {
            await preferences.setSelectedFilter('10001');
            client.getFiltersResult = ok<JiraFilter[]>(mockFilters);
            const extensionUri = vscode.Uri.file('/mock/extension');
            await ConfigPanel.show(extensionUri, authService, preferences, client, () => {});
            
            const internal = getInternalPanel(ConfigPanel.currentPanel!);
            const api = internal.createApi();
            const result = await api.loadFilters();
            assert.strictEqual(result.selectedFilter, '10001');
        });
    });

    suite('API - saveFilter', () => {
        test('saves filter and calls onSuccess', async () => {
            const extensionUri = vscode.Uri.file('/mock/extension');
            await ConfigPanel.show(extensionUri, authService, preferences, client, () => {
                onSuccessCalled = true;
            });
            
            const internal = getInternalPanel(ConfigPanel.currentPanel!);
            const api = internal.createApi();
            await api.saveFilter('10001');
            
            assert.strictEqual(preferences.getSelectedFilter(), '10001');
            assert.strictEqual(onSuccessCalled, true);
        });

        test('saves null filter for default view', async () => {
            await preferences.setSelectedFilter('10001');
            const extensionUri = vscode.Uri.file('/mock/extension');
            await ConfigPanel.show(extensionUri, authService, preferences, client, () => {
                onSuccessCalled = true;
            });
            
            const internal = getInternalPanel(ConfigPanel.currentPanel!);
            const api = internal.createApi();
            await api.saveFilter(null);
            
            assert.strictEqual(preferences.getSelectedFilter(), null);
            assert.strictEqual(onSuccessCalled, true);
        });
    });

    suite('API - openTokenPage', () => {
        test('opens external URL for API tokens', async () => {
            const extensionUri = vscode.Uri.file('/mock/extension');
            await ConfigPanel.show(extensionUri, authService, preferences, client, () => {});
            
            const internal = getInternalPanel(ConfigPanel.currentPanel!);
            const api = internal.createApi();
            api.openTokenPage();
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
                () => {}
            );
            assert.ok(ConfigPanel.currentPanel);
            ConfigPanel.currentPanel!.dispose();
            assert.strictEqual(ConfigPanel.currentPanel, undefined);
        });
    });

    suite('getWebviewContent()', () => {
        test('generates HTML with correct webview content', async () => {
            const extensionUri = vscode.Uri.file('/mock/extension');
            await ConfigPanel.show(
                extensionUri,
                authService,
                preferences,
                client,
                () => {}
            );
            const internal = getInternalPanel(ConfigPanel.currentPanel!);
            const html = internal.panel.webview.html;
            assert.ok(html.includes('<!DOCTYPE html>'));
            assert.ok(html.includes('config-app'));
        });
    });
});
