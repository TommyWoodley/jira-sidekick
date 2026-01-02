import * as vscode from 'vscode';
import { createServiceContainer } from './core/container';
import { IssueCache } from './core/cache';
import { IssuesTreeDataProvider } from './ui/issuesTreeView';
import { StatusBarManager } from './ui/statusBar';
import { CommandsManager } from './ui/commands';
import { IssuePanel } from './ui/issuePanel';

export function activate(context: vscode.ExtensionContext) {
	const container = createServiceContainer(context);

	const treeDataProvider = new IssuesTreeDataProvider(container.cache);
	const treeView = vscode.window.createTreeView('jira-sidekick.issues', {
		treeDataProvider,
		showCollapseAll: false
	});

	const statusBar = new StatusBarManager(container.cache);
	statusBar.show();

	const commands = new CommandsManager(
		container.authService,
		container.preferences,
		container.jiraClient,
		container.cache
	);
	commands.registerCommands(context);

	context.subscriptions.push(treeView, statusBar, container.cache as IssueCache);

	container.authService.hasCredentials().then(hasCredentials => {
		if (hasCredentials) {
			vscode.commands.executeCommand('jira-sidekick.refresh');
		}
	});
}

export function deactivate() {
	IssuePanel.disposeAll();
}
