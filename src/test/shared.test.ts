import * as assert from 'assert';
import * as apiModule from '../shared/api';
import * as modelsModule from '../shared/models';
import { IssueApi, ConfigApi } from '../shared/api';
import { JiraTransition, JiraIssue, JiraStatus } from '../shared/models';

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
});

