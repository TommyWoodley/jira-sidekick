import * as vscode from 'vscode';
import { IAuthService, IJiraClient, IIssueCache, IPreferencesService } from './interfaces';
import { AuthService } from '../jira/auth';
import { JiraClient } from '../jira/client';
import { IssueCache } from './cache';
import { PreferencesService } from './preferences';

export interface ServiceContainer {
    authService: IAuthService;
    jiraClient: IJiraClient;
    cache: IIssueCache;
    preferences: IPreferencesService;
    extensionUri: vscode.Uri;
}

export function createServiceContainer(context: vscode.ExtensionContext): ServiceContainer {
    const authService = new AuthService(context.secrets);
    const preferences = new PreferencesService(context.globalState);
    const jiraClient = new JiraClient(authService);
    const cache = new IssueCache();

    return {
        authService,
        jiraClient,
        cache,
        preferences,
        extensionUri: context.extensionUri,
    };
}

