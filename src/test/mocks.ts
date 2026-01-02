import * as vscode from 'vscode';
import type { Result } from '../core/result';
import { ok } from '../core/result';
import { JiraClientError } from '../jira/client';
import {
    IAuthService,
    IJiraClient,
    IIssueCache,
    IPreferencesService,
} from '../core/interfaces';
import type {
    JiraCredentials,
    JiraIssue,
    JiraSearchResponse,
    JiraFilter,
    JiraTransition,
    JiraComment,
    AdfNode,
} from '../shared/models';

export const mockIssue: JiraIssue = {
    id: '1',
    key: 'TEST-1',
    self: 'https://test.atlassian.net/rest/api/3/issue/1',
    fields: {
        summary: 'Test Issue',
        description: null,
        status: {
            id: '1',
            name: 'To Do',
            statusCategory: { id: 2, key: 'new', name: 'To Do', colorName: 'blue-gray' },
        },
        issuetype: { id: '10001', name: 'Task' },
        priority: { id: '3', name: 'Medium' },
        assignee: null,
        reporter: null,
        created: '2024-01-01T00:00:00.000Z',
        updated: '2024-01-01T00:00:00.000Z',
        attachment: [],
    },
};

export const mockIssue2: JiraIssue = {
    id: '2',
    key: 'TEST-2',
    self: 'https://test.atlassian.net/rest/api/3/issue/2',
    fields: {
        summary: 'Another Test Issue',
        description: null,
        status: {
            id: '2',
            name: 'In Progress',
            statusCategory: { id: 4, key: 'indeterminate', name: 'In Progress', colorName: 'blue' },
        },
        issuetype: { id: '10001', name: 'Task' },
        priority: { id: '2', name: 'High' },
        assignee: { accountId: '123', displayName: 'Test User' },
        reporter: { accountId: '456', displayName: 'Reporter' },
        created: '2024-01-02T00:00:00.000Z',
        updated: '2024-01-02T00:00:00.000Z',
        attachment: [],
    },
};

export const mockTransitions: JiraTransition[] = [
    {
        id: '21',
        name: 'In Progress',
        to: {
            id: '3',
            name: 'In Progress',
            statusCategory: { id: 4, key: 'indeterminate', name: 'In Progress', colorName: 'blue' },
        },
    },
    {
        id: '31',
        name: 'Done',
        to: {
            id: '5',
            name: 'Done',
            statusCategory: { id: 3, key: 'done', name: 'Done', colorName: 'green' },
        },
    },
];

export const mockFilters: JiraFilter[] = [
    { id: '10001', name: 'My Issues', jql: 'assignee = currentUser()', favourite: true },
    { id: '10002', name: 'Sprint Issues', jql: 'sprint in openSprints()', favourite: false },
];

export const mockComments: JiraComment[] = [
    {
        id: '1',
        author: { accountId: '123', displayName: 'User 1' },
        body: { type: 'doc', content: [] },
        created: '2024-01-01T00:00:00.000Z',
        updated: '2024-01-01T00:00:00.000Z',
    },
];

export class MockAuthService implements IAuthService {
    private credentials: JiraCredentials | null = null;

    async setCredentials(credentials: JiraCredentials): Promise<void> {
        this.credentials = credentials;
    }

    async getCredentials(): Promise<JiraCredentials | null> {
        return this.credentials;
    }

    async clearCredentials(): Promise<void> {
        this.credentials = null;
    }

    async hasCredentials(): Promise<boolean> {
        return this.credentials !== null;
    }

    setMockCredentials(creds: JiraCredentials | null): void {
        this.credentials = creds;
    }
}

export class MockMemento implements vscode.Memento {
    private storage = new Map<string, unknown>();

    keys(): readonly string[] {
        return Array.from(this.storage.keys());
    }

    get<T>(key: string): T | undefined;
    get<T>(key: string, defaultValue: T): T;
    get<T>(key: string, defaultValue?: T): T | undefined {
        const value = this.storage.get(key);
        return value !== undefined ? (value as T) : defaultValue;
    }

    update(key: string, value: unknown): Thenable<void> {
        if (value === undefined || value === null) {
            this.storage.delete(key);
        } else {
            this.storage.set(key, value);
        }
        return Promise.resolve();
    }

    setKeysForSync(): void {}
}

export class MockJiraClient implements IJiraClient {
    searchIssuesResult: Result<JiraSearchResponse, JiraClientError> = ok({
        issues: [mockIssue],
        total: 1,
        startAt: 0,
        maxResults: 50,
    });
    testConnectionResult: Result<void, JiraClientError> = ok(undefined);
    testConnectionWithResult: Result<void, JiraClientError> = ok(undefined);
    getFiltersResult: Result<JiraFilter[], JiraClientError> = ok(mockFilters);
    getFilterByIdResult: Result<JiraFilter, JiraClientError> = ok(mockFilters[0]);
    getIssueResult: Result<JiraIssue, JiraClientError> = ok(mockIssue);
    downloadAttachmentResult: Result<Buffer, JiraClientError> = ok(Buffer.from('test'));
    getTransitionsResult: Result<JiraTransition[], JiraClientError> = ok(mockTransitions);
    transitionIssueResult: Result<void, JiraClientError> = ok(undefined);
    getCommentsResult: Result<JiraComment[], JiraClientError> = ok(mockComments);
    addCommentResult: Result<JiraComment, JiraClientError> = ok(mockComments[0]);

    async searchIssues(): Promise<Result<JiraSearchResponse, JiraClientError>> {
        return this.searchIssuesResult;
    }

    async testConnection(): Promise<Result<void, JiraClientError>> {
        return this.testConnectionResult;
    }

    async testConnectionWith(): Promise<Result<void, JiraClientError>> {
        return this.testConnectionWithResult;
    }

    async getFilters(): Promise<Result<JiraFilter[], JiraClientError>> {
        return this.getFiltersResult;
    }

    async getFilterById(): Promise<Result<JiraFilter, JiraClientError>> {
        return this.getFilterByIdResult;
    }

    async getIssue(): Promise<Result<JiraIssue, JiraClientError>> {
        return this.getIssueResult;
    }

    async downloadAttachment(): Promise<Result<Buffer, JiraClientError>> {
        return this.downloadAttachmentResult;
    }

    async getTransitions(): Promise<Result<JiraTransition[], JiraClientError>> {
        return this.getTransitionsResult;
    }

    async transitionIssue(): Promise<Result<void, JiraClientError>> {
        return this.transitionIssueResult;
    }

    async getComments(): Promise<Result<JiraComment[], JiraClientError>> {
        return this.getCommentsResult;
    }

    async addComment(_issueKey: string, _body: AdfNode): Promise<Result<JiraComment, JiraClientError>> {
        return this.addCommentResult;
    }
}

export class MockIssueCache implements IIssueCache {
    private issues: JiraIssue[] = [];
    private readonly _onDidChange = new vscode.EventEmitter<JiraIssue[]>();
    readonly onDidChange = this._onDidChange.event;

    setIssues(issues: JiraIssue[]): void {
        this.issues = issues;
        this._onDidChange.fire(issues);
    }

    getIssues(): JiraIssue[] {
        return this.issues;
    }

    getIssueCount(): number {
        return this.issues.length;
    }

    clear(): void {
        this.issues = [];
        this._onDidChange.fire([]);
    }

    dispose(): void {
        this._onDidChange.dispose();
    }
}

export class MockPreferencesService implements IPreferencesService {
    private selectedFilter: string | null = null;

    getSelectedFilter(): string | null {
        return this.selectedFilter;
    }

    async setSelectedFilter(filterId: string | null): Promise<void> {
        this.selectedFilter = filterId;
    }
}

export interface MockWebview {
    html: string;
    options: vscode.WebviewOptions & vscode.WebviewPanelOptions;
    postedMessages: unknown[];
    messageListeners: ((e: unknown) => void)[];
    asWebviewUri(uri: vscode.Uri): vscode.Uri;
    postMessage(message: unknown): Thenable<boolean>;
    onDidReceiveMessage: vscode.Event<unknown>;
    simulateMessage(message: unknown): void;
    cspSource: string;
}

export interface MockWebviewPanel {
    webview: MockWebview;
    title: string;
    viewType: string;
    options: vscode.WebviewPanelOptions;
    viewColumn: vscode.ViewColumn | undefined;
    active: boolean;
    visible: boolean;
    disposed: boolean;
    revealed: boolean;
    disposeListeners: (() => void)[];
    reveal(viewColumn?: vscode.ViewColumn, preserveFocus?: boolean): void;
    dispose(): void;
    onDidDispose: vscode.Event<void>;
    onDidChangeViewState: vscode.Event<vscode.WebviewPanelOnDidChangeViewStateEvent>;
}

export function createMockWebviewPanel(viewType: string, title: string): MockWebviewPanel {
    const messageEmitter = new vscode.EventEmitter<unknown>();
    const disposeEmitter = new vscode.EventEmitter<void>();
    const viewStateEmitter = new vscode.EventEmitter<vscode.WebviewPanelOnDidChangeViewStateEvent>();

    const mockWebview: MockWebview = {
        html: '',
        options: { enableScripts: true },
        postedMessages: [],
        messageListeners: [],
        cspSource: 'mock-csp-source',
        asWebviewUri: (uri: vscode.Uri) => uri,
        postMessage: (message: unknown) => {
            mockWebview.postedMessages.push(message);
            return Promise.resolve(true);
        },
        onDidReceiveMessage: messageEmitter.event,
        simulateMessage: (message: unknown) => {
            messageEmitter.fire(message);
        },
    };

    const panel: MockWebviewPanel = {
        webview: mockWebview,
        title,
        viewType,
        options: { retainContextWhenHidden: true },
        viewColumn: vscode.ViewColumn.One,
        active: true,
        visible: true,
        disposed: false,
        revealed: false,
        disposeListeners: [],
        reveal: () => {
            panel.revealed = true;
        },
        dispose: () => {
            if (!panel.disposed) {
                panel.disposed = true;
                disposeEmitter.fire();
            }
        },
        onDidDispose: disposeEmitter.event,
        onDidChangeViewState: viewStateEmitter.event,
    };

    return panel;
}

let mockPanelToReturn: MockWebviewPanel | null = null;

export function setMockPanelToReturn(panel: MockWebviewPanel | null): void {
    mockPanelToReturn = panel;
}

export function getMockPanelToReturn(): MockWebviewPanel | null {
    return mockPanelToReturn;
}

export interface MockExtensionContext {
    extensionUri: vscode.Uri;
    subscriptions: vscode.Disposable[];
    workspaceState: vscode.Memento;
    globalState: vscode.Memento;
    extensionPath: string;
    asAbsolutePath(relativePath: string): string;
    storagePath: string | undefined;
    globalStoragePath: string;
    logPath: string;
    extensionMode: vscode.ExtensionMode;
    secrets: vscode.SecretStorage;
    storageUri: vscode.Uri | undefined;
    globalStorageUri: vscode.Uri;
    logUri: vscode.Uri;
    extension: vscode.Extension<unknown>;
    languageModelAccessInformation: vscode.LanguageModelAccessInformation;
}

export function createMockExtensionContext(): MockExtensionContext {
    const mockSecrets: vscode.SecretStorage = {
        get: async () => undefined,
        store: async () => {},
        delete: async () => {},
        keys: async () => [],
        onDidChange: new vscode.EventEmitter<vscode.SecretStorageChangeEvent>().event,
    };

    return {
        extensionUri: vscode.Uri.file('/mock/extension'),
        subscriptions: [],
        workspaceState: new MockMemento(),
        globalState: new MockMemento(),
        extensionPath: '/mock/extension',
        asAbsolutePath: (relativePath: string) => `/mock/extension/${relativePath}`,
        storagePath: '/mock/storage',
        globalStoragePath: '/mock/global-storage',
        logPath: '/mock/log',
        extensionMode: vscode.ExtensionMode.Test,
        secrets: mockSecrets,
        storageUri: vscode.Uri.file('/mock/storage'),
        globalStorageUri: vscode.Uri.file('/mock/global-storage'),
        logUri: vscode.Uri.file('/mock/log'),
        extension: {} as vscode.Extension<unknown>,
        languageModelAccessInformation: {} as vscode.LanguageModelAccessInformation,
    };
}

export async function waitForRpcResponse(
    webview: MockWebview,
    id: string,
    timeout = 1000
): Promise<unknown> {
    const start = Date.now();
    while (Date.now() - start < timeout) {
        const response = webview.postedMessages.find(
            (m) => {
                const msg = m as { type?: string; id?: string };
                return (msg.type === 'rpc-result' || msg.type === 'rpc-error') && msg.id === id;
            }
        );
        if (response) {
            return response;
        }
        await new Promise((resolve) => setTimeout(resolve, 10));
    }
    throw new Error(`Timeout waiting for RPC response with id ${id}`);
}

export function createRpcCall(id: string, method: string, args: unknown[] = []): unknown {
    return {
        type: 'rpc-call',
        id,
        method,
        args,
    };
}

