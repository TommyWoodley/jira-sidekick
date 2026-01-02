import * as assert from 'assert';
import * as vscode from 'vscode';
import { CommandsManager } from '../ui/commands';
import { AuthService } from '../jira/auth';
import { JiraClient } from '../jira/client';
import { IssueCache } from '../core/cache';
import { JiraIssue } from '../jira/types';

const mockIssue: JiraIssue = {
    id: '1',
    key: 'TEST-1',
    self: 'https://test.atlassian.net/rest/api/3/issue/1',
    fields: {
        summary: 'Test Issue',
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
    },
};

const mockIssue2: JiraIssue = {
    id: '2',
    key: 'TEST-2',
    self: 'https://test.atlassian.net/rest/api/3/issue/2',
    fields: {
        summary: 'Another Test Issue',
        status: {
            id: '2',
            name: 'In Progress',
            statusCategory: { id: 4, key: 'indeterminate', name: 'In Progress', colorName: 'blue' },
        },
        issuetype: { id: '10001', name: 'Task' },
        priority: { id: '2', name: 'High' },
        assignee: { accountId: '123', displayName: 'Test User' },
        reporter: { accountId: '456', displayName: 'Reporter' },
        created: '2024-01-02T00:00:00.000Z',
        updated: '2024-01-02T00:00:00.000Z',
    },
};

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

suite('CommandsManager Test Suite', () => {
    let authService: AuthService;
    let client: JiraClient;
    let cache: IssueCache;
    let commandsManager: CommandsManager;

    setup(() => {
        const mockSecretStorage = new MockSecretStorage();
        authService = new AuthService(mockSecretStorage);
        client = new JiraClient(authService);
        cache = new IssueCache();
        commandsManager = new CommandsManager(authService, client, cache);
    });

    teardown(() => {
        cache.dispose();
    });

    suite('openInBrowser()', () => {
        test('does nothing when issue is null', () => {
            commandsManager.openInBrowser(null as unknown as JiraIssue);
        });

        test('does nothing when issue is undefined', () => {
            commandsManager.openInBrowser(undefined as unknown as JiraIssue);
        });

        test('opens browser with valid issue', () => {
            commandsManager.openInBrowser(mockIssue);
        });

        test('opens browser with issue having different self URL format', () => {
            const issueWithDifferentUrl: JiraIssue = {
                ...mockIssue,
                self: 'https://test.atlassian.net/rest/api/3/issue/12345',
            };
            commandsManager.openInBrowser(issueWithDifferentUrl);
        });
    });

    suite('transitionIssue()', () => {
        test('shows warning when no issues in cache and no issue provided', async () => {
            cache.clear();
            await commandsManager.transitionIssue();
        });

        test('uses provided issue without showing picker', async () => {
            await commandsManager.transitionIssue(mockIssue);
        });

        test('uses provided issue with different status', async () => {
            await commandsManager.transitionIssue(mockIssue2);
        });
    });

    suite('openIssuePreview()', () => {
        test('does nothing when issue is null', async () => {
            await commandsManager.openIssuePreview(null as unknown as JiraIssue);
        });

        test('does nothing when issue is undefined', async () => {
            await commandsManager.openIssuePreview(undefined as unknown as JiraIssue);
        });
    });

    suite('openIssuePinned()', () => {
        test('does nothing when issue is null', async () => {
            await commandsManager.openIssuePinned(null as unknown as JiraIssue);
        });

        test('does nothing when issue is undefined', async () => {
            await commandsManager.openIssuePinned(undefined as unknown as JiraIssue);
        });
    });

    suite('configure()', () => {
        test('does nothing when extensionUri is not set', async () => {
            await commandsManager.configure();
        });
    });
});

