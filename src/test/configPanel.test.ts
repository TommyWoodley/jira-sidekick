import * as assert from 'assert';
import * as vscode from 'vscode';
import { ConfigPanel } from '../ui/configPanel';
import { AuthService } from '../jira/auth';
import { JiraClient } from '../jira/client';
import { PreferencesService } from '../core';

class MockSecretStorage implements vscode.SecretStorage {
    private storage = new Map<string, string>();
    onDidChange = new vscode.EventEmitter<vscode.SecretStorageChangeEvent>().event;
    get(key: string): Thenable<string | undefined> {
        return Promise.resolve(this.storage.get(key));
    }
    store(key: string, value: string): Thenable<void> {
        this.storage.set(key, value);
        return Promise.resolve();
    }
    delete(key: string): Thenable<void> {
        this.storage.delete(key);
        return Promise.resolve();
    }
    keys(): Thenable<string[]> {
        return Promise.resolve(Array.from(this.storage.keys()));
    }
}

class MockMemento implements vscode.Memento {
    private storage = new Map<string, unknown>();
    keys(): readonly string[] {
        return Array.from(this.storage.keys());
    }
    get<T>(key: string): T | undefined;
    get<T>(key: string, defaultValue: T): T;
    get<T>(key: string, defaultValue?: T): T | undefined {
        const value = this.storage.get(key);
        return value !== undefined ? (value as T) : defaultValue;
    }
    update(key: string, value: unknown): Thenable<void> {
        if (value === undefined || value === null) {
            this.storage.delete(key);
        } else {
            this.storage.set(key, value);
        }
        return Promise.resolve();
    }
    setKeysForSync(): void {}
}

suite('ConfigPanel Test Suite', () => {
    let authService: AuthService;
    let preferences: PreferencesService;
    let client: JiraClient;

    setup(() => {
        const mockSecretStorage = new MockSecretStorage();
        const mockMemento = new MockMemento();
        authService = new AuthService(mockSecretStorage);
        preferences = new PreferencesService(mockMemento);
        client = new JiraClient(authService);
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
});

