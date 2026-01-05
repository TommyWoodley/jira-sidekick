import * as assert from 'assert';
import * as vscode from 'vscode';
import { createServiceContainer, ServiceContainer } from '../core/container';
import { MockMemento } from './mocks';

suite('Container Test Suite', () => {
    let mockContext: vscode.ExtensionContext;
    let mockSecrets: vscode.SecretStorage;

    setup(() => {
        mockSecrets = {
            get: async () => undefined,
            store: async () => {},
            delete: async () => {},
            keys: async () => [],
            onDidChange: new vscode.EventEmitter<vscode.SecretStorageChangeEvent>().event,
        };

        mockContext = {
            extensionUri: vscode.Uri.file('/mock/extension'),
            subscriptions: [],
            workspaceState: new MockMemento(),
            globalState: new MockMemento(),
            extensionPath: '/mock/extension',
            asAbsolutePath: (relativePath: string) => `/mock/extension/${relativePath}`,
            storagePath: '/mock/storage',
            globalStoragePath: '/mock/global-storage',
            logPath: '/mock/log',
            extensionMode: vscode.ExtensionMode.Test,
            secrets: mockSecrets,
            storageUri: vscode.Uri.file('/mock/storage'),
            globalStorageUri: vscode.Uri.file('/mock/global-storage'),
            logUri: vscode.Uri.file('/mock/log'),
            extension: {} as vscode.Extension<unknown>,
            languageModelAccessInformation: {} as vscode.LanguageModelAccessInformation,
            environmentVariableCollection: {} as vscode.GlobalEnvironmentVariableCollection,
        } as vscode.ExtensionContext;
    });

    suite('createServiceContainer()', () => {
        test('creates container with all required services', () => {
            const container = createServiceContainer(mockContext);

            assert.ok(container);
            assert.ok(container.authService);
            assert.ok(container.jiraClient);
            assert.ok(container.cache);
            assert.ok(container.preferences);
            assert.ok(container.extensionUri);
        });

        test('authService has required methods', () => {
            const container = createServiceContainer(mockContext);

            assert.strictEqual(typeof container.authService.getCredentials, 'function');
            assert.strictEqual(typeof container.authService.setCredentials, 'function');
            assert.strictEqual(typeof container.authService.clearCredentials, 'function');
            assert.strictEqual(typeof container.authService.hasCredentials, 'function');
        });

        test('jiraClient has required methods', () => {
            const container = createServiceContainer(mockContext);

            assert.strictEqual(typeof container.jiraClient.searchIssues, 'function');
            assert.strictEqual(typeof container.jiraClient.testConnection, 'function');
            assert.strictEqual(typeof container.jiraClient.getFilters, 'function');
            assert.strictEqual(typeof container.jiraClient.getIssue, 'function');
            assert.strictEqual(typeof container.jiraClient.getTransitions, 'function');
            assert.strictEqual(typeof container.jiraClient.transitionIssue, 'function');
        });

        test('cache has required methods', () => {
            const container = createServiceContainer(mockContext);

            assert.strictEqual(typeof container.cache.setIssues, 'function');
            assert.strictEqual(typeof container.cache.getIssues, 'function');
            assert.strictEqual(typeof container.cache.getIssueCount, 'function');
            assert.strictEqual(typeof container.cache.clear, 'function');
            assert.ok(container.cache.onDidChange);
        });

        test('preferences has required methods', () => {
            const container = createServiceContainer(mockContext);

            assert.strictEqual(typeof container.preferences.getSelectedFilter, 'function');
            assert.strictEqual(typeof container.preferences.setSelectedFilter, 'function');
        });

        test('extensionUri matches context extensionUri', () => {
            const container = createServiceContainer(mockContext);

            assert.strictEqual(container.extensionUri.fsPath, mockContext.extensionUri.fsPath);
        });

        test('cache can store and retrieve issues', () => {
            const container = createServiceContainer(mockContext);
            const mockIssue = {
                id: '1',
                key: 'TEST-1',
                self: 'https://test.atlassian.net/rest/api/3/issue/1',
                fields: {
                    summary: 'Test Issue',
                    description: null,
                    status: {
                        id: '1',
                        name: 'To Do',
                        statusCategory: { id: 2, key: 'new', name: 'To Do', colorName: 'blue-gray' },
                    },
                    issuetype: { id: '10001', name: 'Task' },
                    priority: { id: '3', name: 'Medium' },
                    assignee: null,
                    reporter: null,
                    created: '2024-01-01T00:00:00.000Z',
                    updated: '2024-01-01T00:00:00.000Z',
                    attachment: [],
                },
            };

            container.cache.setIssues([mockIssue]);
            assert.strictEqual(container.cache.getIssueCount(), 1);
            assert.strictEqual(container.cache.getIssues()[0].key, 'TEST-1');
        });

        test('preferences can store and retrieve filter', async () => {
            const container = createServiceContainer(mockContext);

            assert.strictEqual(container.preferences.getSelectedFilter(), null);
            await container.preferences.setSelectedFilter('filter-123');
            assert.strictEqual(container.preferences.getSelectedFilter(), 'filter-123');
        });
    });

    suite('ServiceContainer interface', () => {
        test('container satisfies ServiceContainer interface', () => {
            const container: ServiceContainer = createServiceContainer(mockContext);
            assert.ok(container);
        });
    });
});


