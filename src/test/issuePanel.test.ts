import * as assert from 'assert';
import { IssuePanel } from '../ui/issuePanel';

suite('IssuePanel Test Suite', () => {
    suite('Static Methods', () => {
        test('disposeAll can be called without active panels', () => {
            IssuePanel.disposeAll();
        });

        test('disposeAll can be called multiple times', () => {
            IssuePanel.disposeAll();
            IssuePanel.disposeAll();
        });
    });

    suite('Module Loading', () => {
        test('IssuePanel class is exported', () => {
            assert.ok(IssuePanel);
        });

        test('IssuePanel has showPreview static method', () => {
            assert.strictEqual(typeof IssuePanel.showPreview, 'function');
        });

        test('IssuePanel has showPinned static method', () => {
            assert.strictEqual(typeof IssuePanel.showPinned, 'function');
        });

        test('IssuePanel has disposeAll static method', () => {
            assert.strictEqual(typeof IssuePanel.disposeAll, 'function');
        });
    });
});

