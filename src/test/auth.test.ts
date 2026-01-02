import * as assert from 'assert';
import { AuthService } from '../jira/auth';
import { JiraCredentials } from '../jira/types';
import * as jiraExports from '../jira/index';

class MockSecretStorage {
    private storage = new Map<string, string>();

    async get(key: string): Promise<string | undefined> {
        return this.storage.get(key);
    }

    async store(key: string, value: string): Promise<void> {
        this.storage.set(key, value);
    }

    async delete(key: string): Promise<void> {
        this.storage.delete(key);
    }

    onDidChange = {
        dispose: () => {},
    };
}

suite('Jira Module Exports', () => {
    test('exports AuthService from index', () => {
        assert.strictEqual(jiraExports.AuthService, AuthService);
    });

    test('exports JiraClient from index', () => {
        assert.strictEqual(typeof jiraExports.JiraClient, 'function');
    });

    test('exports JiraClientError from index', () => {
        assert.strictEqual(typeof jiraExports.JiraClientError, 'function');
    });
});

suite('AuthService Test Suite', () => {
    let authService: AuthService;
    let mockStorage: MockSecretStorage;

    const testCredentials: JiraCredentials = {
        baseUrl: 'https://test.atlassian.net',
        email: 'test@example.com',
        apiToken: 'test-api-token',
    };

    setup(() => {
        mockStorage = new MockSecretStorage();
        authService = new AuthService(mockStorage as any);
    });

    suite('setCredentials()', () => {
        test('stores credentials in secret storage', async () => {
            await authService.setCredentials(testCredentials);
            const stored = await mockStorage.get('jira-sidekick.credentials');
            assert.ok(stored);
            assert.deepStrictEqual(JSON.parse(stored), testCredentials);
        });
    });

    suite('getCredentials()', () => {
        test('returns null when no credentials stored', async () => {
            const result = await authService.getCredentials();
            assert.strictEqual(result, null);
        });

        test('returns stored credentials', async () => {
            await authService.setCredentials(testCredentials);
            const result = await authService.getCredentials();
            assert.deepStrictEqual(result, testCredentials);
        });

        test('returns null for invalid JSON', async () => {
            await mockStorage.store('jira-sidekick.credentials', 'invalid-json');
            const result = await authService.getCredentials();
            assert.strictEqual(result, null);
        });
    });

    suite('clearCredentials()', () => {
        test('removes stored credentials', async () => {
            await authService.setCredentials(testCredentials);
            await authService.clearCredentials();
            const result = await authService.getCredentials();
            assert.strictEqual(result, null);
        });

        test('does not throw when no credentials exist', async () => {
            await assert.doesNotReject(async () => {
                await authService.clearCredentials();
            });
        });
    });

    suite('hasCredentials()', () => {
        test('returns false when no credentials', async () => {
            const result = await authService.hasCredentials();
            assert.strictEqual(result, false);
        });

        test('returns true when credentials exist', async () => {
            await authService.setCredentials(testCredentials);
            const result = await authService.hasCredentials();
            assert.strictEqual(result, true);
        });
    });

    suite('setSelectedFilter()', () => {
        test('stores filter ID', async () => {
            await authService.setSelectedFilter('12345');
            const stored = await mockStorage.get('jira-sidekick.selectedFilter');
            assert.strictEqual(stored, '12345');
        });

        test('deletes filter when null is passed', async () => {
            await authService.setSelectedFilter('12345');
            await authService.setSelectedFilter(null);
            const stored = await mockStorage.get('jira-sidekick.selectedFilter');
            assert.strictEqual(stored, undefined);
        });
    });

    suite('getSelectedFilter()', () => {
        test('returns null when no filter selected', async () => {
            const result = await authService.getSelectedFilter();
            assert.strictEqual(result, null);
        });

        test('returns stored filter ID', async () => {
            await authService.setSelectedFilter('12345');
            const result = await authService.getSelectedFilter();
            assert.strictEqual(result, '12345');
        });
    });
});

