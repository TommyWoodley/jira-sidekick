import * as assert from 'assert';
import { IssueCache } from '../core/cache';
import { IssuesTreeDataProvider, IssueTreeItem } from '../ui/issuesTreeView';
import { JiraIssue } from '../jira/types';

const mockIssueDone: JiraIssue = {
    id: '1',
    key: 'TEST-1',
    self: 'https://test.atlassian.net/rest/api/3/issue/1',
    fields: {
        summary: 'Completed Issue',
        status: {
            id: '1',
            name: 'Done',
            statusCategory: { id: 3, key: 'done', name: 'Done', colorName: 'green' },
        },
        issuetype: { id: '10001', name: 'Task' },
        priority: { id: '3', name: 'Medium' },
        assignee: { accountId: '123', displayName: 'Test User' },
        reporter: null,
        created: '2024-01-01T00:00:00.000Z',
        updated: '2024-01-01T00:00:00.000Z',
    },
};

const mockIssueInProgress: JiraIssue = {
    id: '2',
    key: 'TEST-2',
    self: 'https://test.atlassian.net/rest/api/3/issue/2',
    fields: {
        summary: 'In Progress Issue',
        status: {
            id: '2',
            name: 'In Progress',
            statusCategory: { id: 4, key: 'indeterminate', name: 'In Progress', colorName: 'blue' },
        },
        issuetype: { id: '10001', name: 'Task' },
        priority: null,
        assignee: null,
        reporter: null,
        created: '2024-01-01T00:00:00.000Z',
        updated: '2024-01-01T00:00:00.000Z',
    },
};

const mockIssueToDo: JiraIssue = {
    id: '3',
    key: 'TEST-3',
    self: 'https://test.atlassian.net/rest/api/3/issue/3',
    fields: {
        summary: 'To Do Issue',
        status: {
            id: '3',
            name: 'To Do',
            statusCategory: { id: 2, key: 'new', name: 'To Do', colorName: 'blue-gray' },
        },
        issuetype: { id: '10001', name: 'Task' },
        priority: { id: '2', name: 'High' },
        assignee: null,
        reporter: null,
        created: '2024-01-01T00:00:00.000Z',
        updated: '2024-01-01T00:00:00.000Z',
    },
};

suite('IssueTreeItem Test Suite', () => {
    test('creates tree item with issue key as label', () => {
        const item = new IssueTreeItem(mockIssueDone);
        assert.strictEqual(item.label, 'TEST-1');
    });

    test('sets summary as description', () => {
        const item = new IssueTreeItem(mockIssueDone);
        assert.strictEqual(item.description, 'Completed Issue');
    });

    test('sets contextValue to issue', () => {
        const item = new IssueTreeItem(mockIssueDone);
        assert.strictEqual(item.contextValue, 'issue');
    });

    test('creates tooltip with issue details', () => {
        const item = new IssueTreeItem(mockIssueDone);
        assert.ok(item.tooltip);
    });

    test('includes assignee in tooltip when present', () => {
        const item = new IssueTreeItem(mockIssueDone);
        assert.ok(item.tooltip);
    });

    test('includes priority in tooltip when present', () => {
        const item = new IssueTreeItem(mockIssueDone);
        assert.ok(item.tooltip);
    });

    test('creates item without assignee when null', () => {
        const item = new IssueTreeItem(mockIssueInProgress);
        assert.ok(item.tooltip);
    });

    test('creates item without priority when null', () => {
        const item = new IssueTreeItem(mockIssueInProgress);
        assert.ok(item.tooltip);
    });

    test('has check icon for done status', () => {
        const item = new IssueTreeItem(mockIssueDone);
        assert.ok(item.iconPath);
    });

    test('has sync icon for indeterminate status', () => {
        const item = new IssueTreeItem(mockIssueInProgress);
        assert.ok(item.iconPath);
    });

    test('has circle icon for new status', () => {
        const item = new IssueTreeItem(mockIssueToDo);
        assert.ok(item.iconPath);
    });

    test('has command to handle issue click', () => {
        const item = new IssueTreeItem(mockIssueDone);
        assert.ok(item.command);
        assert.strictEqual(item.command?.command, 'jira-sidekick.handleIssueClick');
        assert.deepStrictEqual(item.command?.arguments, [mockIssueDone]);
    });

    test('exposes issue property', () => {
        const item = new IssueTreeItem(mockIssueDone);
        assert.strictEqual(item.issue, mockIssueDone);
    });
});

suite('IssuesTreeDataProvider Test Suite', () => {
    let cache: IssueCache;
    let provider: IssuesTreeDataProvider;

    setup(() => {
        cache = new IssueCache();
        provider = new IssuesTreeDataProvider(cache);
    });

    teardown(() => {
        provider.dispose();
        cache.dispose();
    });

    test('returns empty children when cache is empty', () => {
        const children = provider.getChildren();
        assert.strictEqual(children.length, 0);
    });

    test('returns tree items for cached issues', () => {
        cache.setIssues([mockIssueDone, mockIssueInProgress]);
        const children = provider.getChildren();
        assert.strictEqual(children.length, 2);
        assert.strictEqual(children[0].label, 'TEST-1');
        assert.strictEqual(children[1].label, 'TEST-2');
    });

    test('getTreeItem returns the element', () => {
        const item = new IssueTreeItem(mockIssueDone);
        const result = provider.getTreeItem(item);
        assert.strictEqual(result, item);
    });

    test('has onDidChangeTreeData event', () => {
        assert.ok(provider.onDidChangeTreeData);
    });

    test('refresh fires change event', () => {
        let eventFired = false;
        provider.onDidChangeTreeData(() => {
            eventFired = true;
        });
        provider.refresh();
        assert.strictEqual(eventFired, true);
    });

    test('automatically refreshes when cache changes', () => {
        let eventFired = false;
        provider.onDidChangeTreeData(() => {
            eventFired = true;
        });
        cache.setIssues([mockIssueDone]);
        assert.strictEqual(eventFired, true);
    });

    test('dispose can be called without error', () => {
        provider.dispose();
    });
});


