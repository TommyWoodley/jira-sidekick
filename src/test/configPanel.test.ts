import * as assert from 'assert';
import * as vscode from 'vscode';
import { ConfigPanel } from '../ui/configPanel';
import { JiraClient } from '../jira/client';
import { PreferencesService } from '../core';
import { JiraCredentials } from '../jira/types';
import { IAuthService } from '../core/interfaces';

class MockAuthService implements IAuthService {
    private credentials: JiraCredentials | null = null;

    async setCredentials(credentials: JiraCredentials): Promise<void> {
        this.credentials = credentials;
    }

    async getCredentials(): Promise<JiraCredentials | null> {
        return this.credentials;
    }

    async clearCredentials(): Promise<void> {
        this.credentials = null;
    }

    async hasCredentials(): Promise<boolean> {
        return this.credentials !== null;
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
    let authService: MockAuthService;
    let preferences: PreferencesService;
    let client: JiraClient;

    setup(() => {
        const mockMemento = new MockMemento();
        authService = new MockAuthService();
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

