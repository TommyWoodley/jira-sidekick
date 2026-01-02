import * as assert from 'assert';
import { JiraClient, JiraClientError } from '../jira/client';
import { JiraCredentials, JiraTransition } from '../jira/types';
import { IAuthService } from '../core/interfaces';

const testCredentials: JiraCredentials = {
    baseUrl: 'https://test.atlassian.net',
    email: 'test@example.com',
    apiToken: 'test-api-token',
};

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

    setMockCredentials(creds: JiraCredentials | null): void {
        this.credentials = creds;
    }
}

let originalFetch: typeof globalThis.fetch;
let mockFetchResponse: { ok: boolean; status: number; json?: () => Promise<unknown>; arrayBuffer?: () => Promise<ArrayBuffer>; text?: () => Promise<string> };

function setupFetchMock(): void {
    originalFetch = globalThis.fetch;
    globalThis.fetch = async (): Promise<Response> => {
        const jsonFn = mockFetchResponse.json || (async () => ({}));
        const textFn = mockFetchResponse.text || (async () => JSON.stringify(await jsonFn()));
        return {
            ok: mockFetchResponse.ok,
            status: mockFetchResponse.status,
            json: jsonFn,
            text: textFn,
            arrayBuffer: mockFetchResponse.arrayBuffer || (async () => new ArrayBuffer(0)),
        } as Response;
    };
}

function restoreFetch(): void {
    globalThis.fetch = originalFetch;
}

suite('JiraClientError', () => {
    test('creates error with message only', () => {
        const error = new JiraClientError('Test error');
        assert.strictEqual(error.message, 'Test error');
        assert.strictEqual(error.name, 'JiraClientError');
        assert.strictEqual(error.statusCode, undefined);
        assert.strictEqual(error.jiraErrors, undefined);
    });

    test('creates error with status code', () => {
        const error = new JiraClientError('Test error', 401);
        assert.strictEqual(error.statusCode, 401);
    });

    test('creates error with jira errors', () => {
        const jiraErrors = { errorMessages: ['Error 1'], errors: {} };
        const error = new JiraClientError('Test error', 400, jiraErrors);
        assert.deepStrictEqual(error.jiraErrors, jiraErrors);
    });
});

suite('JiraClient Test Suite', () => {
    let client: JiraClient;
    let mockAuth: MockAuthService;

    setup(() => {
        mockAuth = new MockAuthService();
        client = new JiraClient(mockAuth);
        setupFetchMock();
    });

    teardown(() => {
        restoreFetch();
    });

    suite('searchIssues()', () => {
        test('returns error when no credentials', async () => {
            mockAuth.setMockCredentials(null);
            const result = await client.searchIssues('project = TEST');
            assert.strictEqual(result.success, false);
            if (!result.success) {
                assert.strictEqual(result.error.message, 'No credentials configured');
            }
        });

        test('returns search results on success', async () => {
            mockAuth.setMockCredentials(testCredentials);
            const mockResponse = { issues: [], total: 0, startAt: 0, maxResults: 50 };
            mockFetchResponse = { ok: true, status: 200, json: async () => mockResponse };

            const result = await client.searchIssues('project = TEST');
            assert.strictEqual(result.success, true);
            if (result.success) {
                assert.deepStrictEqual(result.data, mockResponse);
            }
        });

        test('returns error on 401 unauthorized', async () => {
            mockAuth.setMockCredentials(testCredentials);
            mockFetchResponse = { ok: false, status: 401, json: async () => ({ errorMessages: [] }) };

            const result = await client.searchIssues('project = TEST');
            assert.strictEqual(result.success, false);
            if (!result.success) {
                assert.ok(result.error.message.includes('Authentication failed'));
                assert.strictEqual(result.error.statusCode, 401);
            }
        });

        test('returns error on 403 forbidden', async () => {
            mockAuth.setMockCredentials(testCredentials);
            mockFetchResponse = { ok: false, status: 403, json: async () => ({ errorMessages: [] }) };

            const result = await client.searchIssues('project = TEST');
            assert.strictEqual(result.success, false);
            if (!result.success) {
                assert.ok(result.error.message.includes('Access denied'));
                assert.strictEqual(result.error.statusCode, 403);
            }
        });

        test('returns error with Jira error messages', async () => {
            mockAuth.setMockCredentials(testCredentials);
            mockFetchResponse = {
                ok: false,
                status: 400,
                json: async () => ({ errorMessages: ['Invalid JQL', 'Another error'], errors: {} }),
            };

            const result = await client.searchIssues('invalid jql');
            assert.strictEqual(result.success, false);
            if (!result.success) {
                assert.ok(result.error.message.includes('Invalid JQL'));
            }
        });

        test('handles non-JSON error response', async () => {
            mockAuth.setMockCredentials(testCredentials);
            mockFetchResponse = {
                ok: false,
                status: 500,
                json: async () => { throw new Error('Not JSON'); },
            };

            const result = await client.searchIssues('project = TEST');
            assert.strictEqual(result.success, false);
            if (!result.success) {
                assert.ok(result.error.message.includes('500'));
            }
        });

        test('handles network error', async () => {
            mockAuth.setMockCredentials(testCredentials);
            globalThis.fetch = async () => { throw new Error('Network error'); };

            const result = await client.searchIssues('project = TEST');
            assert.strictEqual(result.success, false);
            if (!result.success) {
                assert.strictEqual(result.error.message, 'Network error');
            }
        });

        test('handles non-Error thrown value', async () => {
            mockAuth.setMockCredentials(testCredentials);
            // eslint-disable-next-line no-throw-literal
            globalThis.fetch = async () => { throw 'string error'; };

            const result = await client.searchIssues('project = TEST');
            assert.strictEqual(result.success, false);
            if (!result.success) {
                assert.strictEqual(result.error.message, 'string error');
            }
        });
    });

    suite('testConnection()', () => {
        test('returns error when no credentials', async () => {
            mockAuth.setMockCredentials(null);
            const result = await client.testConnection();
            assert.strictEqual(result.success, false);
            if (!result.success) {
                assert.strictEqual(result.error.message, 'No credentials configured');
            }
        });

        test('returns success on 200', async () => {
            mockAuth.setMockCredentials(testCredentials);
            mockFetchResponse = { ok: true, status: 200 };

            const result = await client.testConnection();
            assert.strictEqual(result.success, true);
        });

        test('returns error on 401', async () => {
            mockAuth.setMockCredentials(testCredentials);
            mockFetchResponse = { ok: false, status: 401 };

            const result = await client.testConnection();
            assert.strictEqual(result.success, false);
            if (!result.success) {
                assert.ok(result.error.message.includes('Invalid credentials'));
            }
        });

        test('returns error on 403', async () => {
            mockAuth.setMockCredentials(testCredentials);
            mockFetchResponse = { ok: false, status: 403 };

            const result = await client.testConnection();
            assert.strictEqual(result.success, false);
            if (!result.success) {
                assert.ok(result.error.message.includes('Access denied'));
            }
        });

        test('returns error on 404', async () => {
            mockAuth.setMockCredentials(testCredentials);
            mockFetchResponse = { ok: false, status: 404 };

            const result = await client.testConnection();
            assert.strictEqual(result.success, false);
            if (!result.success) {
                assert.ok(result.error.message.includes('not found'));
            }
        });

        test('returns generic error on other status', async () => {
            mockAuth.setMockCredentials(testCredentials);
            mockFetchResponse = { ok: false, status: 500 };

            const result = await client.testConnection();
            assert.strictEqual(result.success, false);
            if (!result.success) {
                assert.ok(result.error.message.includes('500'));
            }
        });

        test('handles network error with fetch keyword', async () => {
            mockAuth.setMockCredentials(testCredentials);
            globalThis.fetch = async () => { throw new Error('fetch failed'); };

            const result = await client.testConnection();
            assert.strictEqual(result.success, false);
            if (!result.success) {
                assert.ok(result.error.message.includes('Network error'));
            }
        });

        test('handles generic error', async () => {
            mockAuth.setMockCredentials(testCredentials);
            globalThis.fetch = async () => { throw new Error('Something went wrong'); };

            const result = await client.testConnection();
            assert.strictEqual(result.success, false);
            if (!result.success) {
                assert.strictEqual(result.error.message, 'Something went wrong');
            }
        });

        test('handles non-Error thrown value', async () => {
            mockAuth.setMockCredentials(testCredentials);
            // eslint-disable-next-line no-throw-literal
            globalThis.fetch = async () => { throw 'string error'; };

            const result = await client.testConnection();
            assert.strictEqual(result.success, false);
            if (!result.success) {
                assert.strictEqual(result.error.message, 'string error');
            }
        });
    });

    suite('testConnectionWith()', () => {
        test('returns success on 200 with explicit credentials', async () => {
            mockFetchResponse = { ok: true, status: 200 };

            const result = await client.testConnectionWith(testCredentials);
            assert.strictEqual(result.success, true);
        });

        test('returns error on 401 with explicit credentials', async () => {
            mockFetchResponse = { ok: false, status: 401 };

            const result = await client.testConnectionWith(testCredentials);
            assert.strictEqual(result.success, false);
            if (!result.success) {
                assert.ok(result.error.message.includes('Invalid credentials'));
            }
        });

        test('does not require credentials from AuthService', async () => {
            mockAuth.setMockCredentials(null);
            mockFetchResponse = { ok: true, status: 200 };

            const result = await client.testConnectionWith(testCredentials);
            assert.strictEqual(result.success, true);
        });
    });

    suite('getFilters()', () => {
        test('returns error when no credentials', async () => {
            mockAuth.setMockCredentials(null);
            const result = await client.getFilters();
            assert.strictEqual(result.success, false);
        });

        test('returns filters on success', async () => {
            mockAuth.setMockCredentials(testCredentials);
            const mockFilters = [{ id: '1', name: 'My Filter', jql: 'project = TEST', favourite: true }];
            mockFetchResponse = { ok: true, status: 200, json: async () => mockFilters };

            const result = await client.getFilters();
            assert.strictEqual(result.success, true);
            if (result.success) {
                assert.deepStrictEqual(result.data, mockFilters);
            }
        });

        test('returns error on failure', async () => {
            mockAuth.setMockCredentials(testCredentials);
            mockFetchResponse = { ok: false, status: 500 };

            const result = await client.getFilters();
            assert.strictEqual(result.success, false);
        });

        test('handles network error', async () => {
            mockAuth.setMockCredentials(testCredentials);
            globalThis.fetch = async () => { throw new Error('Network error'); };

            const result = await client.getFilters();
            assert.strictEqual(result.success, false);
        });

        test('handles non-Error thrown value', async () => {
            mockAuth.setMockCredentials(testCredentials);
            // eslint-disable-next-line no-throw-literal
            globalThis.fetch = async () => { throw 'string error'; };

            const result = await client.getFilters();
            assert.strictEqual(result.success, false);
        });
    });

    suite('getFilterById()', () => {
        test('returns error when no credentials', async () => {
            mockAuth.setMockCredentials(null);
            const result = await client.getFilterById('12345');
            assert.strictEqual(result.success, false);
        });

        test('returns filter on success', async () => {
            mockAuth.setMockCredentials(testCredentials);
            const mockFilter = { id: '12345', name: 'My Filter', jql: 'project = TEST', favourite: true };
            mockFetchResponse = { ok: true, status: 200, json: async () => mockFilter };

            const result = await client.getFilterById('12345');
            assert.strictEqual(result.success, true);
            if (result.success) {
                assert.deepStrictEqual(result.data, mockFilter);
            }
        });

        test('returns error on 404', async () => {
            mockAuth.setMockCredentials(testCredentials);
            mockFetchResponse = { ok: false, status: 404 };

            const result = await client.getFilterById('99999');
            assert.strictEqual(result.success, false);
            if (!result.success) {
                assert.ok(result.error.message.includes('not found'));
            }
        });

        test('returns error on other failure', async () => {
            mockAuth.setMockCredentials(testCredentials);
            mockFetchResponse = { ok: false, status: 500 };

            const result = await client.getFilterById('12345');
            assert.strictEqual(result.success, false);
        });

        test('handles network error', async () => {
            mockAuth.setMockCredentials(testCredentials);
            globalThis.fetch = async () => { throw new Error('Network error'); };

            const result = await client.getFilterById('12345');
            assert.strictEqual(result.success, false);
        });

        test('handles non-Error thrown value', async () => {
            mockAuth.setMockCredentials(testCredentials);
            // eslint-disable-next-line no-throw-literal
            globalThis.fetch = async () => { throw 'string error'; };

            const result = await client.getFilterById('12345');
            assert.strictEqual(result.success, false);
        });
    });

    suite('getIssue()', () => {
        test('returns error when no credentials', async () => {
            mockAuth.setMockCredentials(null);
            const result = await client.getIssue('TEST-1');
            assert.strictEqual(result.success, false);
        });

        test('returns issue on success', async () => {
            mockAuth.setMockCredentials(testCredentials);
            const mockIssue = { id: '1', key: 'TEST-1', fields: { summary: 'Test' } };
            mockFetchResponse = { ok: true, status: 200, json: async () => mockIssue };

            const result = await client.getIssue('TEST-1');
            assert.strictEqual(result.success, true);
            if (result.success) {
                assert.strictEqual(result.data.key, 'TEST-1');
            }
        });

        test('returns error on 404', async () => {
            mockAuth.setMockCredentials(testCredentials);
            mockFetchResponse = { ok: false, status: 404, json: async () => ({ errorMessages: [] }) };

            const result = await client.getIssue('NOTFOUND-1');
            assert.strictEqual(result.success, false);
            if (!result.success) {
                assert.ok(result.error.message.includes('not found'));
            }
        });

        test('returns error with Jira error messages', async () => {
            mockAuth.setMockCredentials(testCredentials);
            mockFetchResponse = {
                ok: false,
                status: 400,
                json: async () => ({ errorMessages: ['Bad request'], errors: {} }),
            };

            const result = await client.getIssue('TEST-1');
            assert.strictEqual(result.success, false);
            if (!result.success) {
                assert.ok(result.error.message.includes('Bad request'));
            }
        });

        test('handles non-JSON error response', async () => {
            mockAuth.setMockCredentials(testCredentials);
            mockFetchResponse = {
                ok: false,
                status: 500,
                json: async () => { throw new Error('Not JSON'); },
            };

            const result = await client.getIssue('TEST-1');
            assert.strictEqual(result.success, false);
        });

        test('handles network error', async () => {
            mockAuth.setMockCredentials(testCredentials);
            globalThis.fetch = async () => { throw new Error('Network error'); };

            const result = await client.getIssue('TEST-1');
            assert.strictEqual(result.success, false);
        });

        test('handles non-Error thrown value', async () => {
            mockAuth.setMockCredentials(testCredentials);
            // eslint-disable-next-line no-throw-literal
            globalThis.fetch = async () => { throw 'string error'; };

            const result = await client.getIssue('TEST-1');
            assert.strictEqual(result.success, false);
        });
    });

    suite('downloadAttachment()', () => {
        test('returns error when no credentials', async () => {
            mockAuth.setMockCredentials(null);
            const result = await client.downloadAttachment('https://example.com/attachment');
            assert.strictEqual(result.success, false);
        });

        test('returns buffer on success', async () => {
            mockAuth.setMockCredentials(testCredentials);
            const testData = new Uint8Array([1, 2, 3, 4]);
            mockFetchResponse = {
                ok: true,
                status: 200,
                arrayBuffer: async () => testData.buffer,
            };

            const result = await client.downloadAttachment('https://example.com/attachment');
            assert.strictEqual(result.success, true);
            if (result.success) {
                assert.ok(Buffer.isBuffer(result.data));
            }
        });

        test('returns error on failure', async () => {
            mockAuth.setMockCredentials(testCredentials);
            mockFetchResponse = { ok: false, status: 404 };

            const result = await client.downloadAttachment('https://example.com/attachment');
            assert.strictEqual(result.success, false);
            if (!result.success) {
                assert.ok(result.error.message.includes('Failed to download'));
            }
        });

        test('handles network error', async () => {
            mockAuth.setMockCredentials(testCredentials);
            globalThis.fetch = async () => { throw new Error('Network error'); };

            const result = await client.downloadAttachment('https://example.com/attachment');
            assert.strictEqual(result.success, false);
        });

        test('handles non-Error thrown value', async () => {
            mockAuth.setMockCredentials(testCredentials);
            // eslint-disable-next-line no-throw-literal
            globalThis.fetch = async () => { throw 'string error'; };

            const result = await client.downloadAttachment('https://example.com/attachment');
            assert.strictEqual(result.success, false);
        });
    });

    suite('getTransitions()', () => {
        test('returns error when no credentials', async () => {
            mockAuth.setMockCredentials(null);
            const result = await client.getTransitions('TEST-1');
            assert.strictEqual(result.success, false);
            if (!result.success) {
                assert.strictEqual(result.error.message, 'No credentials configured');
            }
        });

        test('returns transitions on success', async () => {
            mockAuth.setMockCredentials(testCredentials);
            const mockTransitionsList: JiraTransition[] = [
                { id: '21', name: 'In Progress', to: { id: '3', name: 'In Progress', statusCategory: { id: 4, key: 'indeterminate', name: 'In Progress', colorName: 'blue' } } },
                { id: '31', name: 'Done', to: { id: '5', name: 'Done', statusCategory: { id: 3, key: 'done', name: 'Done', colorName: 'green' } } },
            ];
            const mockTransitions = { transitions: mockTransitionsList };
            mockFetchResponse = { ok: true, status: 200, json: async () => mockTransitions };

            const result = await client.getTransitions('TEST-1');
            assert.strictEqual(result.success, true);
            if (result.success) {
                assert.strictEqual(result.data.length, 2);
                assert.strictEqual(result.data[0].name, 'In Progress');
            }
        });

        test('returns error on 404', async () => {
            mockAuth.setMockCredentials(testCredentials);
            mockFetchResponse = { ok: false, status: 404, json: async () => ({ errorMessages: [] }) };

            const result = await client.getTransitions('NOTFOUND-1');
            assert.strictEqual(result.success, false);
            if (!result.success) {
                assert.ok(result.error.message.includes('not found'));
                assert.strictEqual(result.error.statusCode, 404);
            }
        });

        test('returns error on 403', async () => {
            mockAuth.setMockCredentials(testCredentials);
            mockFetchResponse = { ok: false, status: 403, json: async () => ({ errorMessages: [] }) };

            const result = await client.getTransitions('TEST-1');
            assert.strictEqual(result.success, false);
            if (!result.success) {
                assert.ok(result.error.message.includes('permission'));
                assert.strictEqual(result.error.statusCode, 403);
            }
        });

        test('handles non-JSON error response', async () => {
            mockAuth.setMockCredentials(testCredentials);
            mockFetchResponse = {
                ok: false,
                status: 500,
                json: async () => { throw new Error('Not JSON'); },
            };

            const result = await client.getTransitions('TEST-1');
            assert.strictEqual(result.success, false);
            if (!result.success) {
                assert.ok(result.error.message.includes('500'));
            }
        });

        test('handles network error', async () => {
            mockAuth.setMockCredentials(testCredentials);
            globalThis.fetch = async () => { throw new Error('Network error'); };

            const result = await client.getTransitions('TEST-1');
            assert.strictEqual(result.success, false);
        });

        test('handles non-Error thrown value', async () => {
            mockAuth.setMockCredentials(testCredentials);
            // eslint-disable-next-line no-throw-literal
            globalThis.fetch = async () => { throw 'string error'; };

            const result = await client.getTransitions('TEST-1');
            assert.strictEqual(result.success, false);
        });
    });

    suite('transitionIssue()', () => {
        test('returns error when no credentials', async () => {
            mockAuth.setMockCredentials(null);
            const result = await client.transitionIssue('TEST-1', '21');
            assert.strictEqual(result.success, false);
            if (!result.success) {
                assert.strictEqual(result.error.message, 'No credentials configured');
            }
        });

        test('returns success on 204', async () => {
            mockAuth.setMockCredentials(testCredentials);
            mockFetchResponse = { ok: true, status: 204, text: async () => '' };

            const result = await client.transitionIssue('TEST-1', '21');
            assert.strictEqual(result.success, true);
        });

        test('returns error on 404', async () => {
            mockAuth.setMockCredentials(testCredentials);
            mockFetchResponse = { ok: false, status: 404, json: async () => ({ errorMessages: [] }) };

            const result = await client.transitionIssue('NOTFOUND-1', '21');
            assert.strictEqual(result.success, false);
            if (!result.success) {
                assert.ok(result.error.message.includes('not found'));
                assert.strictEqual(result.error.statusCode, 404);
            }
        });

        test('returns error on 403', async () => {
            mockAuth.setMockCredentials(testCredentials);
            mockFetchResponse = { ok: false, status: 403, json: async () => ({ errorMessages: [] }) };

            const result = await client.transitionIssue('TEST-1', '21');
            assert.strictEqual(result.success, false);
            if (!result.success) {
                assert.ok(result.error.message.includes('permission'));
                assert.strictEqual(result.error.statusCode, 403);
            }
        });

        test('returns error on 400 with Jira error messages', async () => {
            mockAuth.setMockCredentials(testCredentials);
            mockFetchResponse = {
                ok: false,
                status: 400,
                json: async () => ({ errorMessages: ['Transition is not valid'], errors: {} }),
            };

            const result = await client.transitionIssue('TEST-1', '999');
            assert.strictEqual(result.success, false);
            if (!result.success) {
                assert.ok(result.error.message.includes('Transition is not valid'));
                assert.strictEqual(result.error.statusCode, 400);
            }
        });

        test('returns default message on 400 without error messages', async () => {
            mockAuth.setMockCredentials(testCredentials);
            mockFetchResponse = {
                ok: false,
                status: 400,
                json: async () => ({ errorMessages: [], errors: {} }),
            };

            const result = await client.transitionIssue('TEST-1', '999');
            assert.strictEqual(result.success, false);
            if (!result.success) {
                assert.ok(result.error.message.includes('400'));
                assert.strictEqual(result.error.statusCode, 400);
            }
        });

        test('handles non-JSON error response', async () => {
            mockAuth.setMockCredentials(testCredentials);
            mockFetchResponse = {
                ok: false,
                status: 500,
                json: async () => { throw new Error('Not JSON'); },
            };

            const result = await client.transitionIssue('TEST-1', '21');
            assert.strictEqual(result.success, false);
            if (!result.success) {
                assert.ok(result.error.message.includes('500'));
            }
        });

        test('handles network error', async () => {
            mockAuth.setMockCredentials(testCredentials);
            globalThis.fetch = async () => { throw new Error('Network error'); };

            const result = await client.transitionIssue('TEST-1', '21');
            assert.strictEqual(result.success, false);
        });

        test('handles non-Error thrown value', async () => {
            mockAuth.setMockCredentials(testCredentials);
            // eslint-disable-next-line no-throw-literal
            globalThis.fetch = async () => { throw 'string error'; };

            const result = await client.transitionIssue('TEST-1', '21');
            assert.strictEqual(result.success, false);
        });
    });

    suite('getComments()', () => {
        test('returns error when no credentials', async () => {
            mockAuth.setMockCredentials(null);
            const result = await client.getComments('TEST-1');
            assert.strictEqual(result.success, false);
            if (!result.success) {
                assert.strictEqual(result.error.message, 'No credentials configured');
            }
        });

        test('returns comments on success', async () => {
            mockAuth.setMockCredentials(testCredentials);
            const mockComments = {
                startAt: 0,
                maxResults: 100,
                total: 2,
                comments: [
                    { id: '1', author: { accountId: '123', displayName: 'User 1' }, body: { type: 'doc', content: [] }, created: '2024-01-01T00:00:00.000Z', updated: '2024-01-01T00:00:00.000Z' },
                    { id: '2', author: { accountId: '456', displayName: 'User 2' }, body: { type: 'doc', content: [] }, created: '2024-01-02T00:00:00.000Z', updated: '2024-01-02T00:00:00.000Z' },
                ]
            };
            mockFetchResponse = { ok: true, status: 200, json: async () => mockComments };

            const result = await client.getComments('TEST-1');
            assert.strictEqual(result.success, true);
            if (result.success) {
                assert.strictEqual(result.data.length, 2);
                assert.strictEqual(result.data[0].author.displayName, 'User 1');
            }
        });

        test('returns error on 404', async () => {
            mockAuth.setMockCredentials(testCredentials);
            mockFetchResponse = { ok: false, status: 404, json: async () => ({ errorMessages: [] }) };

            const result = await client.getComments('NOTFOUND-1');
            assert.strictEqual(result.success, false);
            if (!result.success) {
                assert.strictEqual(result.error.statusCode, 404);
            }
        });

        test('returns error on 401', async () => {
            mockAuth.setMockCredentials(testCredentials);
            mockFetchResponse = { ok: false, status: 401, json: async () => ({ errorMessages: [] }) };

            const result = await client.getComments('TEST-1');
            assert.strictEqual(result.success, false);
            if (!result.success) {
                assert.ok(result.error.message.includes('Authentication'));
                assert.strictEqual(result.error.statusCode, 401);
            }
        });

        test('returns error on 403', async () => {
            mockAuth.setMockCredentials(testCredentials);
            mockFetchResponse = { ok: false, status: 403, json: async () => ({ errorMessages: [] }) };

            const result = await client.getComments('TEST-1');
            assert.strictEqual(result.success, false);
            if (!result.success) {
                assert.ok(result.error.message.includes('Access denied'));
                assert.strictEqual(result.error.statusCode, 403);
            }
        });

        test('handles non-JSON error response', async () => {
            mockAuth.setMockCredentials(testCredentials);
            mockFetchResponse = {
                ok: false,
                status: 500,
                json: async () => { throw new Error('Not JSON'); },
            };

            const result = await client.getComments('TEST-1');
            assert.strictEqual(result.success, false);
            if (!result.success) {
                assert.ok(result.error.message.includes('500'));
            }
        });

        test('handles network error', async () => {
            mockAuth.setMockCredentials(testCredentials);
            globalThis.fetch = async () => { throw new Error('Network error'); };

            const result = await client.getComments('TEST-1');
            assert.strictEqual(result.success, false);
        });

        test('handles non-Error thrown value', async () => {
            mockAuth.setMockCredentials(testCredentials);
            // eslint-disable-next-line no-throw-literal
            globalThis.fetch = async () => { throw 'string error'; };

            const result = await client.getComments('TEST-1');
            assert.strictEqual(result.success, false);
        });
    });

    suite('addComment()', () => {
        const mockAdfBody = {
            type: 'doc',
            attrs: { version: 1 },
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Test comment' }] }]
        };

        test('returns error when no credentials', async () => {
            mockAuth.setMockCredentials(null);
            const result = await client.addComment('TEST-1', mockAdfBody);
            assert.strictEqual(result.success, false);
            if (!result.success) {
                assert.strictEqual(result.error.message, 'No credentials configured');
            }
        });

        test('returns comment on success', async () => {
            mockAuth.setMockCredentials(testCredentials);
            const mockComment = {
                id: '10000',
                author: { accountId: '123', displayName: 'Test User' },
                body: mockAdfBody,
                created: '2024-01-01T00:00:00.000Z',
                updated: '2024-01-01T00:00:00.000Z'
            };
            mockFetchResponse = { ok: true, status: 201, json: async () => mockComment };

            const result = await client.addComment('TEST-1', mockAdfBody);
            assert.strictEqual(result.success, true);
            if (result.success) {
                assert.strictEqual(result.data.id, '10000');
                assert.strictEqual(result.data.author.displayName, 'Test User');
            }
        });

        test('returns error on 404', async () => {
            mockAuth.setMockCredentials(testCredentials);
            mockFetchResponse = { ok: false, status: 404, json: async () => ({ errorMessages: [] }) };

            const result = await client.addComment('NOTFOUND-1', mockAdfBody);
            assert.strictEqual(result.success, false);
            if (!result.success) {
                assert.ok(result.error.message.includes('not found'));
                assert.strictEqual(result.error.statusCode, 404);
            }
        });

        test('returns error on 401', async () => {
            mockAuth.setMockCredentials(testCredentials);
            mockFetchResponse = { ok: false, status: 401, json: async () => ({ errorMessages: [] }) };

            const result = await client.addComment('TEST-1', mockAdfBody);
            assert.strictEqual(result.success, false);
            if (!result.success) {
                assert.ok(result.error.message.includes('Authentication'));
                assert.strictEqual(result.error.statusCode, 401);
            }
        });

        test('returns error on 403', async () => {
            mockAuth.setMockCredentials(testCredentials);
            mockFetchResponse = { ok: false, status: 403, json: async () => ({ errorMessages: [] }) };

            const result = await client.addComment('TEST-1', mockAdfBody);
            assert.strictEqual(result.success, false);
            if (!result.success) {
                assert.ok(result.error.message.includes('Access denied'));
                assert.strictEqual(result.error.statusCode, 403);
            }
        });

        test('returns error on 400 with Jira error messages', async () => {
            mockAuth.setMockCredentials(testCredentials);
            mockFetchResponse = {
                ok: false,
                status: 400,
                json: async () => ({ errorMessages: ['Invalid comment body'], errors: {} }),
            };

            const result = await client.addComment('TEST-1', mockAdfBody);
            assert.strictEqual(result.success, false);
            if (!result.success) {
                assert.ok(result.error.message.includes('Invalid comment body'));
                assert.strictEqual(result.error.statusCode, 400);
            }
        });

        test('handles non-JSON error response', async () => {
            mockAuth.setMockCredentials(testCredentials);
            mockFetchResponse = {
                ok: false,
                status: 500,
                json: async () => { throw new Error('Not JSON'); },
            };

            const result = await client.addComment('TEST-1', mockAdfBody);
            assert.strictEqual(result.success, false);
            if (!result.success) {
                assert.ok(result.error.message.includes('500'));
            }
        });

        test('handles network error', async () => {
            mockAuth.setMockCredentials(testCredentials);
            globalThis.fetch = async () => { throw new Error('Network error'); };

            const result = await client.addComment('TEST-1', mockAdfBody);
            assert.strictEqual(result.success, false);
        });

        test('handles non-Error thrown value', async () => {
            mockAuth.setMockCredentials(testCredentials);
            // eslint-disable-next-line no-throw-literal
            globalThis.fetch = async () => { throw 'string error'; };

            const result = await client.addComment('TEST-1', mockAdfBody);
            assert.strictEqual(result.success, false);
        });
    });
});

