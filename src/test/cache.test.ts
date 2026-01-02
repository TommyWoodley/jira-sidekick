import * as assert from 'assert';
import { IssueCache } from '../core/cache';
import * as coreExports from '../core/index';
import { JiraIssue } from '../jira/types';

const mockIssue = (key: string, summary: string): JiraIssue => ({
    id: key,
    key,
    self: `https://test.atlassian.net/rest/api/3/issue/${key}`,
    fields: {
        summary,
        status: {
            id: '1',
            name: 'Open',
            statusCategory: { id: 1, key: 'new', name: 'To Do', colorName: 'blue-gray' },
        },
        issuetype: { id: '10001', name: 'Task', iconUrl: '' },
        priority: { id: '3', name: 'Medium', iconUrl: '' },
        assignee: null,
        reporter: null,
        created: '2024-01-01T00:00:00.000Z',
        updated: '2024-01-01T00:00:00.000Z',
    },
});

suite('Core Module Exports', () => {
    test('exports IssueCache from index', () => {
        assert.strictEqual(coreExports.IssueCache, IssueCache);
    });

    test('exports ok and err from index', () => {
        assert.strictEqual(typeof coreExports.ok, 'function');
        assert.strictEqual(typeof coreExports.err, 'function');
    });
});

suite('IssueCache Test Suite', () => {
    let cache: IssueCache;

    setup(() => {
        cache = new IssueCache();
    });

    teardown(() => {
        cache.dispose();
    });

    suite('Initial state', () => {
        test('starts with empty issues array', () => {
            assert.deepStrictEqual(cache.getIssues(), []);
        });

        test('starts with zero issue count', () => {
            assert.strictEqual(cache.getIssueCount(), 0);
        });
    });

    suite('setIssues()', () => {
        test('stores issues', () => {
            const issues = [mockIssue('TEST-1', 'First issue')];
            cache.setIssues(issues);
            assert.deepStrictEqual(cache.getIssues(), issues);
        });

        test('updates issue count', () => {
            const issues = [
                mockIssue('TEST-1', 'First'),
                mockIssue('TEST-2', 'Second'),
                mockIssue('TEST-3', 'Third'),
            ];
            cache.setIssues(issues);
            assert.strictEqual(cache.getIssueCount(), 3);
        });

        test('replaces existing issues', () => {
            cache.setIssues([mockIssue('OLD-1', 'Old issue')]);
            const newIssues = [mockIssue('NEW-1', 'New issue')];
            cache.setIssues(newIssues);
            assert.deepStrictEqual(cache.getIssues(), newIssues);
            assert.strictEqual(cache.getIssueCount(), 1);
        });

        test('fires onDidChange event', () => {
            let eventFired = false;
            let receivedIssues: JiraIssue[] = [];

            cache.onDidChange((issues) => {
                eventFired = true;
                receivedIssues = issues;
            });

            const issues = [mockIssue('TEST-1', 'Issue')];
            cache.setIssues(issues);

            assert.strictEqual(eventFired, true);
            assert.deepStrictEqual(receivedIssues, issues);
        });
    });

    suite('getIssues()', () => {
        test('returns stored issues', () => {
            const issues = [
                mockIssue('TEST-1', 'First'),
                mockIssue('TEST-2', 'Second'),
            ];
            cache.setIssues(issues);
            assert.deepStrictEqual(cache.getIssues(), issues);
        });

        test('returns same reference', () => {
            const issues = [mockIssue('TEST-1', 'Issue')];
            cache.setIssues(issues);
            assert.strictEqual(cache.getIssues(), cache.getIssues());
        });
    });

    suite('getIssueCount()', () => {
        test('returns correct count for empty cache', () => {
            assert.strictEqual(cache.getIssueCount(), 0);
        });

        test('returns correct count after setting issues', () => {
            cache.setIssues([
                mockIssue('TEST-1', 'First'),
                mockIssue('TEST-2', 'Second'),
            ]);
            assert.strictEqual(cache.getIssueCount(), 2);
        });
    });

    suite('clear()', () => {
        test('removes all issues', () => {
            cache.setIssues([mockIssue('TEST-1', 'Issue')]);
            cache.clear();
            assert.deepStrictEqual(cache.getIssues(), []);
        });

        test('resets issue count to zero', () => {
            cache.setIssues([mockIssue('TEST-1', 'Issue')]);
            cache.clear();
            assert.strictEqual(cache.getIssueCount(), 0);
        });

        test('fires onDidChange event with empty array', () => {
            cache.setIssues([mockIssue('TEST-1', 'Issue')]);

            let eventFired = false;
            let receivedIssues: JiraIssue[] | undefined;

            cache.onDidChange((issues) => {
                eventFired = true;
                receivedIssues = issues;
            });

            cache.clear();

            assert.strictEqual(eventFired, true);
            assert.deepStrictEqual(receivedIssues, []);
        });
    });

    suite('onDidChange event', () => {
        test('allows multiple subscribers', () => {
            let count1 = 0;
            let count2 = 0;

            cache.onDidChange(() => count1++);
            cache.onDidChange(() => count2++);

            cache.setIssues([mockIssue('TEST-1', 'Issue')]);

            assert.strictEqual(count1, 1);
            assert.strictEqual(count2, 1);
        });

        test('subscription can be disposed', () => {
            let eventCount = 0;

            const subscription = cache.onDidChange(() => eventCount++);

            cache.setIssues([mockIssue('TEST-1', 'First')]);
            assert.strictEqual(eventCount, 1);

            subscription.dispose();

            cache.setIssues([mockIssue('TEST-2', 'Second')]);
            assert.strictEqual(eventCount, 1);
        });

        test('fires for each setIssues call', () => {
            let eventCount = 0;
            cache.onDidChange(() => eventCount++);

            cache.setIssues([mockIssue('TEST-1', 'First')]);
            cache.setIssues([mockIssue('TEST-2', 'Second')]);
            cache.setIssues([mockIssue('TEST-3', 'Third')]);

            assert.strictEqual(eventCount, 3);
        });
    });

    suite('dispose()', () => {
        test('can be called without error', () => {
            assert.doesNotThrow(() => cache.dispose());
        });

        test('can be called multiple times', () => {
            cache.dispose();
            assert.doesNotThrow(() => cache.dispose());
        });
    });
});

