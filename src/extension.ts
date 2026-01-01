import * as vscode from 'vscode';
import { AuthService } from './jira/auth';
import { JiraClient } from './jira/client';
import { IssueCache } from './core/cache';
import { IssuesTreeDataProvider } from './ui/issuesTreeView';
import { StatusBarManager } from './ui/statusBar';
import { CommandsManager } from './ui/commands';

export function activate(context: vscode.ExtensionContext) {
	const authService = new AuthService(context.secrets);
	const client = new JiraClient(authService);
	const cache = new IssueCache();

	const treeDataProvider = new IssuesTreeDataProvider(cache);
	const treeView = vscode.window.createTreeView('jira-sidekick.issues', {
		treeDataProvider,
		showCollapseAll: false
	});

	const statusBar = new StatusBarManager(cache);
	statusBar.show();

	const commands = new CommandsManager(authService, client, cache);
	commands.registerCommands(context);

	context.subscriptions.push(treeView, statusBar, cache);

	authService.hasCredentials().then(hasCredentials => {
		if (hasCredentials) {
			vscode.commands.executeCommand('jira-sidekick.refresh');
		}
	});
}

export function deactivate() {}
