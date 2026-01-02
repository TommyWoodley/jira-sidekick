import * as vscode from 'vscode';
import { AuthService } from './jira/auth';
import { JiraClient } from './jira/client';
import { IssueCache, PreferencesService } from './core';
import { IssuesTreeDataProvider } from './ui/issuesTreeView';
import { StatusBarManager } from './ui/statusBar';
import { CommandsManager } from './ui/commands';
import { IssuePanel } from './ui/issuePanel';

export function activate(context: vscode.ExtensionContext) {
	const authService = new AuthService(context.secrets);
	const preferences = new PreferencesService(context.globalState);
	const client = new JiraClient(authService);
	const cache = new IssueCache();

	const treeDataProvider = new IssuesTreeDataProvider(cache);
	const treeView = vscode.window.createTreeView('jira-sidekick.issues', {
		treeDataProvider,
		showCollapseAll: false
	});

	const statusBar = new StatusBarManager(cache);
	statusBar.show();

	const commands = new CommandsManager(authService, preferences, client, cache);
	commands.registerCommands(context);

	context.subscriptions.push(treeView, statusBar, cache);

	authService.hasCredentials().then(hasCredentials => {
		if (hasCredentials) {
			vscode.commands.executeCommand('jira-sidekick.refresh');
		}
	});
}

export function deactivate() {
	IssuePanel.disposeAll();
}
