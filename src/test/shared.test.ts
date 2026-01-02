import * as assert from 'assert';
import * as apiModule from '../shared/api';
import * as modelsModule from '../shared/models';
import { IssueApi, ConfigApi } from '../shared/api';
import { JiraTransition, JiraIssue, JiraStatus, JiraComment, JiraCommentsPage, JiraUser, AdfNode } from '../shared/models';

suite('Shared Module Types', () => {
    test('api module is loaded', () => {
        assert.ok(apiModule);
    });

    test('models module is loaded', () => {
        assert.ok(modelsModule);
    });

    test('IssueApi interface includes transition methods', () => {
        const mockApi: Partial<IssueApi> = {
            getTransitions: async () => [],
            transitionIssue: async () => ({ issue: {} as JiraIssue }),
        };
        assert.ok(mockApi.getTransitions);
        assert.ok(mockApi.transitionIssue);
    });

    test('ConfigApi interface has required methods', () => {
        const mockApi: Partial<ConfigApi> = {
            getCredentials: async () => ({ credentials: null, selectedFilter: null }),
        };
        assert.ok(mockApi.getCredentials);
    });

    test('JiraTransition type has correct structure', () => {
        const mockStatus: JiraStatus = {
            id: '1',
            name: 'Done',
            statusCategory: { id: 3, key: 'done', name: 'Done', colorName: 'green' }
        };
        const transition: JiraTransition = {
            id: '31',
            name: 'Mark as Done',
            to: mockStatus
        };
        assert.strictEqual(transition.id, '31');
        assert.strictEqual(transition.name, 'Mark as Done');
        assert.strictEqual(transition.to.name, 'Done');
    });

    test('JiraComment type has correct structure', () => {
        const mockAuthor: JiraUser = {
            accountId: '123456',
            displayName: 'Test User',
            emailAddress: 'test@example.com'
        };
        const mockBody: AdfNode = {
            type: 'doc',
            content: [
                { type: 'paragraph', content: [{ type: 'text', text: 'This is a comment' }] }
            ]
        };
        const comment: JiraComment = {
            id: '10001',
            author: mockAuthor,
            body: mockBody,
            created: '2024-01-01T10:00:00.000Z',
            updated: '2024-01-01T12:00:00.000Z'
        };
        assert.strictEqual(comment.id, '10001');
        assert.strictEqual(comment.author.displayName, 'Test User');
        assert.strictEqual(comment.body.type, 'doc');
        assert.ok(comment.created);
        assert.ok(comment.updated);
    });

    test('JiraCommentsPage type has correct structure', () => {
        const mockComment: JiraComment = {
            id: '10001',
            author: { accountId: '123', displayName: 'User' },
            body: { type: 'doc', content: [] },
            created: '2024-01-01T00:00:00.000Z',
            updated: '2024-01-01T00:00:00.000Z'
        };
        const commentsPage: JiraCommentsPage = {
            startAt: 0,
            maxResults: 100,
            total: 1,
            comments: [mockComment]
        };
        assert.strictEqual(commentsPage.startAt, 0);
        assert.strictEqual(commentsPage.maxResults, 100);
        assert.strictEqual(commentsPage.total, 1);
        assert.strictEqual(commentsPage.comments.length, 1);
        assert.strictEqual(commentsPage.comments[0].id, '10001');
    });

    test('IssueApi interface includes comments in loadIssue response', () => {
        const mockApi: Partial<IssueApi> = {
            loadIssue: async () => ({ 
                issue: {} as JiraIssue, 
                imageMap: {}, 
                comments: [] 
            }),
            refresh: async () => ({ 
                issue: {} as JiraIssue, 
                imageMap: {}, 
                comments: [] 
            }),
        };
        assert.ok(mockApi.loadIssue);
        assert.ok(mockApi.refresh);
    });
});

