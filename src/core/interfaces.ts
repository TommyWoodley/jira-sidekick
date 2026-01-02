import * as vscode from 'vscode';
import { Result } from './result';
import { JiraClientError } from '../jira/client';
import type {
    JiraCredentials,
    JiraIssue,
    JiraSearchResponse,
    JiraFilter,
    JiraTransition,
    JiraComment,
} from '../shared/models';

export interface IAuthService {
    setCredentials(credentials: JiraCredentials): Promise<void>;
    getCredentials(): Promise<JiraCredentials | null>;
    clearCredentials(): Promise<void>;
    hasCredentials(): Promise<boolean>;
}

export interface IJiraClient {
    searchIssues(jql: string, maxResults?: number): Promise<Result<JiraSearchResponse, JiraClientError>>;
    testConnection(): Promise<Result<void, JiraClientError>>;
    testConnectionWith(credentials: JiraCredentials): Promise<Result<void, JiraClientError>>;
    getFilters(): Promise<Result<JiraFilter[], JiraClientError>>;
    getFilterById(filterId: string): Promise<Result<JiraFilter, JiraClientError>>;
    getIssue(issueKey: string): Promise<Result<JiraIssue, JiraClientError>>;
    downloadAttachment(contentUrl: string): Promise<Result<Buffer, JiraClientError>>;
    getTransitions(issueKey: string): Promise<Result<JiraTransition[], JiraClientError>>;
    transitionIssue(issueKey: string, transitionId: string): Promise<Result<void, JiraClientError>>;
    getComments(issueKey: string): Promise<Result<JiraComment[], JiraClientError>>;
}

export interface IIssueCache {
    setIssues(issues: JiraIssue[]): void;
    getIssues(): JiraIssue[];
    getIssueCount(): number;
    clear(): void;
    onDidChange: vscode.Event<JiraIssue[]>;
}

export interface IPreferencesService {
    getSelectedFilter(): string | null;
    setSelectedFilter(filterId: string | null): Promise<void>;
}

