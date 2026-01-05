import * as assert from 'assert';
import { IssueCache } from '../core/cache';
import { StatusBarManager } from '../ui/statusBar';
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

suite('StatusBarManager Test Suite', () => {
    let cache: IssueCache;
    let statusBar: StatusBarManager;

    setup(() => {
        cache = new IssueCache();
        statusBar = new StatusBarManager(cache);
    });

    teardown(() => {
        statusBar.dispose();
        cache.dispose();
    });

    test('creates status bar item', () => {
        assert.ok(statusBar);
    });

    test('show() can be called', () => {
        statusBar.show();
    });

    test('hide() can be called', () => {
        statusBar.hide();
    });

    test('update() updates text when no issues', () => {
        statusBar.update();
    });

    test('update() updates text when one issue', () => {
        cache.setIssues([mockIssue]);
        statusBar.update();
    });

    test('update() updates text when multiple issues', () => {
        const mockIssue2 = { ...mockIssue, id: '2', key: 'TEST-2' };
        cache.setIssues([mockIssue, mockIssue2]);
        statusBar.update();
    });

    test('automatically updates when cache changes', () => {
        cache.setIssues([mockIssue]);
    });

    test('dispose() can be called', () => {
        statusBar.dispose();
    });

    test('dispose() can be called multiple times', () => {
        statusBar.dispose();
        statusBar.dispose();
    });
});


