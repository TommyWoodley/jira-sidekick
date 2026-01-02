import * as assert from 'assert';
import * as vscode from 'vscode';
import * as extension from '../extension';
import * as uiIndex from '../ui/index';

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('Sample test', () => {
		assert.strictEqual(-1, [1, 2, 3].indexOf(5));
		assert.strictEqual(-1, [1, 2, 3].indexOf(0));
	});

	test('extension module exports activate function', () => {
		assert.ok(extension.activate);
		assert.strictEqual(typeof extension.activate, 'function');
	});

	test('extension module exports deactivate function', () => {
		assert.ok(extension.deactivate);
		assert.strictEqual(typeof extension.deactivate, 'function');
	});

	test('deactivate can be called without context', () => {
		extension.deactivate();
	});
});

suite('UI Module Exports', () => {
	test('exports IssuesTreeDataProvider', () => {
		assert.ok(uiIndex.IssuesTreeDataProvider);
	});

	test('exports IssueTreeItem', () => {
		assert.ok(uiIndex.IssueTreeItem);
	});

	test('exports StatusBarManager', () => {
		assert.ok(uiIndex.StatusBarManager);
	});

	test('exports CommandsManager', () => {
		assert.ok(uiIndex.CommandsManager);
	});

	test('exports ConfigPanel', () => {
		assert.ok(uiIndex.ConfigPanel);
	});

	test('exports IssuePanel', () => {
		assert.ok(uiIndex.IssuePanel);
	});
});
