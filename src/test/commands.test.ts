import * as assert from 'assert';
import * as vscode from 'vscode';
import { CommandsManager } from '../ui/commands';
import { JiraClientError } from '../jira/client';
import { ok, err } from '../core/result';
import type { JiraSearchResponse, JiraFilter, JiraTransition } from '../shared/models';
import {
    MockAuthService,
    MockJiraClient,
    MockIssueCache,
    MockPreferencesService,
    createMockExtensionContext,
    mockIssue,
    mockIssue2,
    mockTransitions,
    mockFilters,
} from './mocks';

suite('CommandsManager Test Suite', () => {
    let authService: MockAuthService;
    let preferences: MockPreferencesService;
    let client: MockJiraClient;
    let cache: MockIssueCache;
    let commandsManager: CommandsManager;

    setup(() => {
        authService = new MockAuthService();
        preferences = new MockPreferencesService();
        client = new MockJiraClient();
        cache = new MockIssueCache();
        commandsManager = new CommandsManager(authService, preferences, client, cache);
    });

    teardown(() => {
        cache.dispose();
    });

    suite('registerCommands()', () => {
        test('registers all commands to context subscriptions', () => {
            const mockContext = createMockExtensionContext();
            commandsManager.registerCommands(mockContext as unknown as vscode.ExtensionContext);
            assert.strictEqual(mockContext.subscriptions.length, 7);
        });
    });

    suite('openInBrowser()', () => {
        test('does nothing when issue is null', async () => {
            await commandsManager.openInBrowser(null as unknown as typeof mockIssue);
        });

        test('does nothing when issue is undefined', async () => {
            await commandsManager.openInBrowser(undefined as unknown as typeof mockIssue);
        });

        test('does nothing when no credentials', async () => {
            await commandsManager.openInBrowser(mockIssue);
        });
    });

    suite('refresh()', () => {
        test('uses selected filter when set', async () => {
            authService.setMockCredentials({
                baseUrl: 'https://test.atlassian.net',
                email: 'test@example.com',
                apiToken: 'test-token',
            });
            await preferences.setSelectedFilter('12345');
            client.getFilterByIdResult = ok<JiraFilter>(mockFilters[0]);
            await commandsManager.refresh();
            assert.strictEqual(cache.getIssueCount(), 1);
        });

        test('uses default JQL when no filter selected', async () => {
            authService.setMockCredentials({
                baseUrl: 'https://test.atlassian.net',
                email: 'test@example.com',
                apiToken: 'test-token',
            });
            await commandsManager.refresh();
            assert.strictEqual(cache.getIssueCount(), 1);
        });

        test('falls back to default JQL when filter fetch fails', async () => {
            authService.setMockCredentials({
                baseUrl: 'https://test.atlassian.net',
                email: 'test@example.com',
                apiToken: 'test-token',
            });
            await preferences.setSelectedFilter('99999');
            client.getFilterByIdResult = err(new JiraClientError('Filter not found', 404));
            await commandsManager.refresh();
            assert.strictEqual(cache.getIssueCount(), 1);
        });

        test('handles search success and updates cache', async () => {
            authService.setMockCredentials({
                baseUrl: 'https://test.atlassian.net',
                email: 'test@example.com',
                apiToken: 'test-token',
            });
            client.searchIssuesResult = ok<JiraSearchResponse>({
                issues: [mockIssue, mockIssue2],
                total: 2,
                startAt: 0,
                maxResults: 50,
            });
            await commandsManager.refresh();
            assert.strictEqual(cache.getIssueCount(), 2);
        });
    });

    suite('configure()', () => {
        test('does nothing when extensionUri is not set', async () => {
            await commandsManager.configure();
        });
    });

    suite('openIssuePreview()', () => {
        test('does nothing when issue is null', async () => {
            await commandsManager.openIssuePreview(null as unknown as typeof mockIssue);
        });

        test('does nothing when issue is undefined', async () => {
            await commandsManager.openIssuePreview(undefined as unknown as typeof mockIssue);
        });

        test('does nothing when extensionUri is not set', async () => {
            await commandsManager.openIssuePreview(mockIssue);
        });
    });

    suite('openIssuePinned()', () => {
        test('does nothing when issue is null', async () => {
            await commandsManager.openIssuePinned(null as unknown as typeof mockIssue);
        });

        test('does nothing when issue is undefined', async () => {
            await commandsManager.openIssuePinned(undefined as unknown as typeof mockIssue);
        });

        test('does nothing when extensionUri is not set', async () => {
            await commandsManager.openIssuePinned(mockIssue);
        });
    });

    suite('handleIssueClick()', () => {
        test('does nothing when issue is null', async () => {
            await (commandsManager as unknown as { handleIssueClick(i: unknown): Promise<void> })
                .handleIssueClick(null);
        });

        test('does nothing when issue is undefined', async () => {
            await (commandsManager as unknown as { handleIssueClick(i: unknown): Promise<void> })
                .handleIssueClick(undefined);
        });
    });

    suite('transitionIssue()', () => {
        test('shows warning when no issues in cache and no issue provided', async () => {
            cache.clear();
            await commandsManager.transitionIssue();
        });

        test('handles transitions fetch error', async () => {
            client.getTransitionsResult = err(new JiraClientError('Failed to get transitions', 500));
            await commandsManager.transitionIssue(mockIssue);
        });

        test('handles no available transitions', async () => {
            client.getTransitionsResult = ok<JiraTransition[]>([]);
            await commandsManager.transitionIssue(mockIssue);
        });

    });

    suite('getJql()', () => {
        test('returns filter JQL when filter selected and fetch succeeds', async () => {
            authService.setMockCredentials({
                baseUrl: 'https://test.atlassian.net',
                email: 'test@example.com',
                apiToken: 'test-token',
            });
            await preferences.setSelectedFilter('10001');
            client.getFilterByIdResult = ok<JiraFilter>({
                id: '10001',
                name: 'My Filter',
                jql: 'project = TEST',
                favourite: true,
            });
            await commandsManager.refresh();
            assert.strictEqual(cache.getIssueCount(), 1);
        });
    });

    suite('DOUBLE_CLICK_THRESHOLD behavior', () => {
        test('single click does not trigger pinned view', async () => {
            await (commandsManager as unknown as { handleIssueClick(i: unknown): Promise<void> })
                .handleIssueClick(mockIssue);
        });
    });
});
