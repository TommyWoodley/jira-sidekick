import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	console.log('Jira Sidekick is now active');

	const disposable = vscode.commands.registerCommand('jira-sidekick.helloWorld', () => {
		vscode.window.showInformationMessage('Hello World from Jira Sidekick!');
	});

	context.subscriptions.push(disposable);
}

export function deactivate() {}
