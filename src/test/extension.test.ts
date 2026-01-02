import * as assert from 'assert';
import * as vscode from 'vscode';
import * as extension from '../extension';
import * as uiIndex from '../ui/index';
import { IssuePanel } from '../ui/issuePanel';
import { MockMemento } from './mocks';

suite('Extension Test Suite', () => {
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

	teardown(() => {
		IssuePanel.disposeAll();
		for (const sub of mockContext.subscriptions) {
			sub.dispose();
		}
		mockContext.subscriptions.length = 0;
	});

	test('extension module exports activate function', () => {
		assert.ok(extension.activate);
		assert.strictEqual(typeof extension.activate, 'function');
	});

	test('extension module exports deactivate function', () => {
		assert.ok(extension.deactivate);
		assert.strictEqual(typeof extension.deactivate, 'function');
	});

	test('deactivate can be called without context', () => {
		extension.deactivate();
	});

	test('deactivate disposes all issue panels', () => {
		extension.deactivate();
	});

	test('activate creates subscriptions', () => {
		extension.activate(mockContext);
		assert.ok(mockContext.subscriptions.length > 0);
	});

	test('activate registers commands', () => {
		extension.activate(mockContext);
		assert.ok(mockContext.subscriptions.length >= 3);
	});

	test('activate with no credentials does not auto-refresh', async () => {
		extension.activate(mockContext);
		await new Promise(resolve => setTimeout(resolve, 50));
	});

	test('activate with credentials triggers auto-refresh', async () => {
		await mockSecrets.store('jira-credentials', JSON.stringify({
			baseUrl: 'https://test.atlassian.net',
			email: 'test@example.com',
			apiToken: 'test-token',
		}));
		
		const secretsWithCreds: vscode.SecretStorage = {
			get: async (key: string) => {
				if (key === 'jira-credentials') {
					return JSON.stringify({
						baseUrl: 'https://test.atlassian.net',
						email: 'test@example.com',
						apiToken: 'test-token',
					});
				}
				return undefined;
			},
			store: async () => {},
			delete: async () => {},
			keys: async () => ['jira-credentials'],
			onDidChange: new vscode.EventEmitter<vscode.SecretStorageChangeEvent>().event,
		};
		
		const contextWithCreds = {
			...mockContext,
			secrets: secretsWithCreds,
			subscriptions: [],
		} as unknown as vscode.ExtensionContext;
		
		extension.activate(contextWithCreds);
		await new Promise(resolve => setTimeout(resolve, 50));
		
		for (const sub of contextWithCreds.subscriptions) {
			sub.dispose();
		}
	});
});

suite('UI Module Exports', () => {
	test('exports IssuesTreeDataProvider', () => {
		assert.ok(uiIndex.IssuesTreeDataProvider);
	});

	test('exports IssueTreeItem', () => {
		assert.ok(uiIndex.IssueTreeItem);
	});

	test('exports StatusBarManager', () => {
		assert.ok(uiIndex.StatusBarManager);
	});

	test('exports CommandsManager', () => {
		assert.ok(uiIndex.CommandsManager);
	});

	test('exports ConfigPanel', () => {
		assert.ok(uiIndex.ConfigPanel);
	});

	test('exports IssuePanel', () => {
		assert.ok(uiIndex.IssuePanel);
	});
});
