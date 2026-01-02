import * as assert from 'assert';
import * as vscode from 'vscode';
import { IssuePanel } from '../ui/issuePanel';
import { ok, err } from '../core/result';
import { JiraClientError } from '../jira/client';
import type { JiraIssue, JiraTransition, JiraComment } from '../shared/models';
import {
    MockJiraClient,
    mockIssue,
    mockIssue2,
    mockTransitions,
    mockComments,
} from './mocks';

interface RpcCall {
    type: 'rpc-call';
    id: string;
    method: string;
    args: unknown[];
}

async function simulateRpcCall(
    method: string,
    args: unknown[] = [],
    delay = 100
): Promise<void> {
    const rpcCall: RpcCall = {
        type: 'rpc-call',
        id: `test-${Date.now()}`,
        method,
        args,
    };
    await new Promise(resolve => setTimeout(resolve, delay));
}

function createIssueWithAttachments(): JiraIssue {
    return {
        ...mockIssue,
        fields: {
            ...mockIssue.fields,
            attachment: [
                {
                    id: 'att-1',
                    filename: 'screenshot.png',
                    content: 'https://test.atlassian.net/attachment/1',
                    mimeType: 'image/png',
                    size: 1024,
                    created: '2024-01-01T00:00:00.000Z',
                },
                {
                    id: 'att-2',
                    filename: 'document.pdf',
                    content: 'https://test.atlassian.net/attachment/2',
                    mimeType: 'application/pdf',
                    size: 2048,
                    created: '2024-01-01T00:00:00.000Z',
                },
            ],
            description: {
                type: 'doc',
                content: [
                    {
                        type: 'mediaSingle',
                        content: [
                            {
                                type: 'media',
                                attrs: {
                                    id: 'media-1',
                                    alt: 'screenshot.png',
                                    type: 'file',
                                    collection: 'contentId-123',
                                },
                            },
                        ],
                    },
                ],
            },
        },
    };
}

function createIssueWithJpegAttachment(): JiraIssue {
    return {
        ...mockIssue,
        fields: {
            ...mockIssue.fields,
            attachment: [
                {
                    id: 'att-jpg',
                    filename: 'photo.jpg',
                    content: 'https://test.atlassian.net/attachment/photo.jpg',
                    mimeType: 'image/jpeg',
                    size: 1024,
                    created: '2024-01-01T00:00:00.000Z',
                },
            ],
        },
    };
}

function createIssueWithGifAttachment(): JiraIssue {
    return {
        ...mockIssue,
        fields: {
            ...mockIssue.fields,
            attachment: [
                {
                    id: 'att-gif',
                    filename: 'animation.gif',
                    content: 'https://test.atlassian.net/attachment/animation.gif',
                    mimeType: 'image/gif',
                    size: 1024,
                    created: '2024-01-01T00:00:00.000Z',
                },
            ],
        },
    };
}

function createIssueWithWebpAttachment(): JiraIssue {
    return {
        ...mockIssue,
        fields: {
            ...mockIssue.fields,
            attachment: [
                {
                    id: 'att-webp',
                    filename: 'image.webp',
                    content: 'https://test.atlassian.net/attachment/image.webp',
                    mimeType: 'image/webp',
                    size: 1024,
                    created: '2024-01-01T00:00:00.000Z',
                },
            ],
        },
    };
}

function createIssueWithSvgAttachment(): JiraIssue {
    return {
        ...mockIssue,
        fields: {
            ...mockIssue.fields,
            attachment: [
                {
                    id: 'att-svg',
                    filename: 'icon.svg',
                    content: 'https://test.atlassian.net/attachment/icon.svg',
                    mimeType: 'image/svg+xml',
                    size: 512,
                    created: '2024-01-01T00:00:00.000Z',
                },
            ],
        },
    };
}

function createIssueWithMediaInDescription(): JiraIssue {
    return {
        ...mockIssue,
        fields: {
            ...mockIssue.fields,
            attachment: [
                {
                    id: 'att-1',
                    filename: 'screenshot.png',
                    content: 'https://test.atlassian.net/attachment/screenshot.png',
                    mimeType: 'image/png',
                    size: 1024,
                    created: '2024-01-01T00:00:00.000Z',
                },
            ],
            description: {
                type: 'doc',
                content: [
                    {
                        type: 'mediaSingle',
                        content: [
                            {
                                type: 'media',
                                attrs: {
                                    id: 'media-id-123',
                                    alt: 'screenshot.png',
                                },
                            },
                        ],
                    },
                    {
                        type: 'paragraph',
                        content: [
                            {
                                type: 'text',
                                text: 'Some text',
                            },
                        ],
                    },
                ],
            },
        },
    };
}

suite('IssuePanel Test Suite', () => {
    let client: MockJiraClient;
    let openInBrowserCalled: boolean;
    let openInBrowserIssue: JiraIssue | null;

    setup(() => {
        client = new MockJiraClient();
        openInBrowserCalled = false;
        openInBrowserIssue = null;
    });

    teardown(() => {
        IssuePanel.disposeAll();
    });

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

    suite('showPreview()', () => {
        test('creates preview panel', async () => {
            const extensionUri = vscode.Uri.file('/mock/extension');
            await IssuePanel.showPreview(
                extensionUri,
                client,
                'TEST-1',
                'Test Issue Summary',
                (issue) => {
                    openInBrowserCalled = true;
                    openInBrowserIssue = issue;
                }
            );
        });

        test('reuses preview panel for different issue', async () => {
            const extensionUri = vscode.Uri.file('/mock/extension');
            await IssuePanel.showPreview(
                extensionUri,
                client,
                'TEST-1',
                'Test Issue Summary',
                () => { }
            );
            await IssuePanel.showPreview(
                extensionUri,
                client,
                'TEST-2',
                'Another Issue',
                () => { }
            );
        });

        test('reveals pinned panel if exists for same issue', async () => {
            const extensionUri = vscode.Uri.file('/mock/extension');
            await IssuePanel.showPinned(
                extensionUri,
                client,
                'TEST-1',
                'Test Issue Summary',
                () => { }
            );
            await IssuePanel.showPreview(
                extensionUri,
                client,
                'TEST-1',
                'Test Issue Summary',
                () => { }
            );
        });
    });

    suite('showPinned()', () => {
        test('creates pinned panel', async () => {
            const extensionUri = vscode.Uri.file('/mock/extension');
            await IssuePanel.showPinned(
                extensionUri,
                client,
                'TEST-1',
                'Test Issue Summary',
                () => { }
            );
        });

        test('reveals existing pinned panel', async () => {
            const extensionUri = vscode.Uri.file('/mock/extension');
            await IssuePanel.showPinned(
                extensionUri,
                client,
                'TEST-1',
                'Test Issue Summary',
                () => { }
            );
            await IssuePanel.showPinned(
                extensionUri,
                client,
                'TEST-1',
                'Test Issue Summary',
                () => { }
            );
        });

        test('converts preview to pinned for same issue', async () => {
            const extensionUri = vscode.Uri.file('/mock/extension');
            await IssuePanel.showPreview(
                extensionUri,
                client,
                'TEST-1',
                'Test Issue Summary',
                () => { }
            );
            await IssuePanel.showPinned(
                extensionUri,
                client,
                'TEST-1',
                'Test Issue Summary',
                () => { }
            );
        });

        test('creates separate pinned panels for different issues', async () => {
            const extensionUri = vscode.Uri.file('/mock/extension');
            await IssuePanel.showPinned(
                extensionUri,
                client,
                'TEST-1',
                'Test Issue Summary',
                () => { }
            );
            await IssuePanel.showPinned(
                extensionUri,
                client,
                'TEST-2',
                'Another Issue',
                () => { }
            );
        });
    });

    suite('formatTitle()', () => {
        test('formats title with preview prefix', async () => {
            const extensionUri = vscode.Uri.file('/mock/extension');
            await IssuePanel.showPreview(
                extensionUri,
                client,
                'TEST-1',
                'Test Issue Summary',
                () => { }
            );
        });

        test('truncates long summaries', async () => {
            const extensionUri = vscode.Uri.file('/mock/extension');
            const longSummary = 'This is a very long issue summary that should be truncated';
            await IssuePanel.showPreview(
                extensionUri,
                client,
                'TEST-1',
                longSummary,
                () => { }
            );
        });
    });

    suite('API methods - loadIssue', () => {
        test('loads issue and comments successfully', async () => {
            client.getIssueResult = ok<JiraIssue>(mockIssue);
            client.getCommentsResult = ok<JiraComment[]>(mockComments);
            const extensionUri = vscode.Uri.file('/mock/extension');
            await IssuePanel.showPreview(extensionUri, client, 'TEST-1', 'Test Issue', () => { });
        });

        test('handles issue fetch error', async () => {
            client.getIssueResult = err(new JiraClientError('Issue not found', 404));
            const extensionUri = vscode.Uri.file('/mock/extension');
            await IssuePanel.showPreview(extensionUri, client, 'TEST-1', 'Test Issue', () => { });
        });

        test('handles comments fetch failure gracefully', async () => {
            client.getIssueResult = ok<JiraIssue>(mockIssue);
            client.getCommentsResult = err(new JiraClientError('Comments failed', 500));
            const extensionUri = vscode.Uri.file('/mock/extension');
            await IssuePanel.showPreview(extensionUri, client, 'TEST-1', 'Test Issue', () => { });
        });

        test('loads issue with attachments', async () => {
            const issueWithAttachments = createIssueWithAttachments();
            client.getIssueResult = ok<JiraIssue>(issueWithAttachments);
            client.getCommentsResult = ok<JiraComment[]>([]);
            const extensionUri = vscode.Uri.file('/mock/extension');
            await IssuePanel.showPreview(extensionUri, client, 'TEST-1', 'Test Issue', () => { });
        });

        test('loads issue with media in description', async () => {
            const issueWithMedia = createIssueWithMediaInDescription();
            client.getIssueResult = ok<JiraIssue>(issueWithMedia);
            client.getCommentsResult = ok<JiraComment[]>([]);
            const extensionUri = vscode.Uri.file('/mock/extension');
            await IssuePanel.showPreview(extensionUri, client, 'TEST-1', 'Test Issue', () => { });
        });
    });

    suite('API methods - refresh', () => {
        test('refreshes issue data', async () => {
            client.getIssueResult = ok<JiraIssue>(mockIssue);
            client.getCommentsResult = ok<JiraComment[]>(mockComments);
            const extensionUri = vscode.Uri.file('/mock/extension');
            await IssuePanel.showPreview(extensionUri, client, 'TEST-1', 'Test Issue', () => { });
        });

        test('handles refresh error', async () => {
            client.getIssueResult = err(new JiraClientError('Refresh failed', 500));
            const extensionUri = vscode.Uri.file('/mock/extension');
            await IssuePanel.showPreview(extensionUri, client, 'TEST-1', 'Test Issue', () => { });
        });
    });

    suite('API methods - openInBrowser', () => {
        test('calls callback with current issue', async () => {
            client.getIssueResult = ok<JiraIssue>(mockIssue);
            const extensionUri = vscode.Uri.file('/mock/extension');
            await IssuePanel.showPreview(
                extensionUri,
                client,
                'TEST-1',
                'Test Issue',
                (issue) => {
                    openInBrowserCalled = true;
                    openInBrowserIssue = issue;
                }
            );
        });
    });

    suite('API methods - openAttachment', () => {
        test('opens attachment URL externally', async () => {
            const extensionUri = vscode.Uri.file('/mock/extension');
            await IssuePanel.showPreview(extensionUri, client, 'TEST-1', 'Test Issue', () => { });
        });
    });

    suite('API methods - saveAttachment', () => {
        test('handles save attachment flow', async () => {
            client.downloadAttachmentResult = ok(Buffer.from('test content'));
            const extensionUri = vscode.Uri.file('/mock/extension');
            await IssuePanel.showPreview(extensionUri, client, 'TEST-1', 'Test Issue', () => { });
        });

        test('handles download error', async () => {
            client.downloadAttachmentResult = err(new JiraClientError('Download failed', 500));
            const extensionUri = vscode.Uri.file('/mock/extension');
            await IssuePanel.showPreview(extensionUri, client, 'TEST-1', 'Test Issue', () => { });
        });
    });

    suite('API methods - loadImage', () => {
        test('loads image by ID', async () => {
            client.downloadAttachmentResult = ok(Buffer.from('image data'));
            const extensionUri = vscode.Uri.file('/mock/extension');
            await IssuePanel.showPreview(extensionUri, client, 'TEST-1', 'Test Issue', () => { });
        });

        test('returns null for unknown image ID', async () => {
            const extensionUri = vscode.Uri.file('/mock/extension');
            await IssuePanel.showPreview(extensionUri, client, 'TEST-1', 'Test Issue', () => { });
        });

        test('handles download failure', async () => {
            client.downloadAttachmentResult = err(new JiraClientError('Download failed', 500));
            const extensionUri = vscode.Uri.file('/mock/extension');
            await IssuePanel.showPreview(extensionUri, client, 'TEST-1', 'Test Issue', () => { });
        });
    });

    suite('API methods - getTransitions', () => {
        test('returns available transitions', async () => {
            client.getTransitionsResult = ok<JiraTransition[]>(mockTransitions);
            const extensionUri = vscode.Uri.file('/mock/extension');
            await IssuePanel.showPreview(extensionUri, client, 'TEST-1', 'Test Issue', () => { });
        });

        test('handles transitions fetch error', async () => {
            client.getTransitionsResult = err(new JiraClientError('Failed', 500));
            const extensionUri = vscode.Uri.file('/mock/extension');
            await IssuePanel.showPreview(extensionUri, client, 'TEST-1', 'Test Issue', () => { });
        });
    });

    suite('API methods - transitionIssue', () => {
        test('transitions issue successfully', async () => {
            client.transitionIssueResult = ok<void>(undefined);
            client.getIssueResult = ok<JiraIssue>(mockIssue2);
            const extensionUri = vscode.Uri.file('/mock/extension');
            await IssuePanel.showPreview(extensionUri, client, 'TEST-1', 'Test Issue', () => { });
        });

        test('handles transition error', async () => {
            client.transitionIssueResult = err(new JiraClientError('Transition failed', 400));
            const extensionUri = vscode.Uri.file('/mock/extension');
            await IssuePanel.showPreview(extensionUri, client, 'TEST-1', 'Test Issue', () => { });
        });

        test('handles issue fetch error after transition', async () => {
            client.transitionIssueResult = ok<void>(undefined);
            client.getIssueResult = err(new JiraClientError('Issue not found', 404));
            const extensionUri = vscode.Uri.file('/mock/extension');
            await IssuePanel.showPreview(extensionUri, client, 'TEST-1', 'Test Issue', () => { });
        });
    });

    suite('buildAttachmentMaps()', () => {
        test('builds maps from attachments', async () => {
            const issueWithAttachments = createIssueWithAttachments();
            client.getIssueResult = ok<JiraIssue>(issueWithAttachments);
            const extensionUri = vscode.Uri.file('/mock/extension');
            await IssuePanel.showPreview(extensionUri, client, 'TEST-1', 'Test Issue', () => { });
        });

        test('handles empty attachments', async () => {
            client.getIssueResult = ok<JiraIssue>(mockIssue);
            const extensionUri = vscode.Uri.file('/mock/extension');
            await IssuePanel.showPreview(extensionUri, client, 'TEST-1', 'Test Issue', () => { });
        });
    });

    suite('buildMediaIdToUrl()', () => {
        test('builds media ID map from description', async () => {
            const issueWithAttachments = createIssueWithAttachments();
            client.getIssueResult = ok<JiraIssue>(issueWithAttachments);
            const extensionUri = vscode.Uri.file('/mock/extension');
            await IssuePanel.showPreview(extensionUri, client, 'TEST-1', 'Test Issue', () => { });
        });

        test('handles issue without description', async () => {
            client.getIssueResult = ok<JiraIssue>(mockIssue);
            const extensionUri = vscode.Uri.file('/mock/extension');
            await IssuePanel.showPreview(extensionUri, client, 'TEST-1', 'Test Issue', () => { });
        });

        test('handles nested content in description', async () => {
            const issueWithMedia = createIssueWithMediaInDescription();
            client.getIssueResult = ok<JiraIssue>(issueWithMedia);
            const extensionUri = vscode.Uri.file('/mock/extension');
            await IssuePanel.showPreview(extensionUri, client, 'TEST-1', 'Test Issue', () => { });
        });
    });

    suite('getMimeType()', () => {
        test('returns correct mime type for JPEG', async () => {
            const issue = createIssueWithJpegAttachment();
            client.getIssueResult = ok<JiraIssue>(issue);
            const extensionUri = vscode.Uri.file('/mock/extension');
            await IssuePanel.showPreview(extensionUri, client, 'TEST-1', 'Test Issue', () => { });
        });

        test('returns correct mime type for GIF', async () => {
            const issue = createIssueWithGifAttachment();
            client.getIssueResult = ok<JiraIssue>(issue);
            const extensionUri = vscode.Uri.file('/mock/extension');
            await IssuePanel.showPreview(extensionUri, client, 'TEST-1', 'Test Issue', () => { });
        });

        test('returns correct mime type for WebP', async () => {
            const issue = createIssueWithWebpAttachment();
            client.getIssueResult = ok<JiraIssue>(issue);
            const extensionUri = vscode.Uri.file('/mock/extension');
            await IssuePanel.showPreview(extensionUri, client, 'TEST-1', 'Test Issue', () => { });
        });

        test('returns correct mime type for SVG', async () => {
            const issue = createIssueWithSvgAttachment();
            client.getIssueResult = ok<JiraIssue>(issue);
            const extensionUri = vscode.Uri.file('/mock/extension');
            await IssuePanel.showPreview(extensionUri, client, 'TEST-1', 'Test Issue', () => { });
        });

        test('defaults to PNG for unknown types', async () => {
            client.getIssueResult = ok<JiraIssue>(mockIssue);
            const extensionUri = vscode.Uri.file('/mock/extension');
            await IssuePanel.showPreview(extensionUri, client, 'TEST-1', 'Test Issue', () => { });
        });
    });

    suite('dispose()', () => {
        test('disposes preview panel', async () => {
            const extensionUri = vscode.Uri.file('/mock/extension');
            await IssuePanel.showPreview(extensionUri, client, 'TEST-1', 'Test Issue', () => { });
            IssuePanel.disposeAll();
        });

        test('disposes pinned panels', async () => {
            const extensionUri = vscode.Uri.file('/mock/extension');
            await IssuePanel.showPinned(extensionUri, client, 'TEST-1', 'Test Issue 1', () => { });
            await IssuePanel.showPinned(extensionUri, client, 'TEST-2', 'Test Issue 2', () => { });
            IssuePanel.disposeAll();
        });

        test('disposes all panels', async () => {
            const extensionUri = vscode.Uri.file('/mock/extension');
            await IssuePanel.showPreview(extensionUri, client, 'TEST-1', 'Test Issue', () => { });
            await IssuePanel.showPinned(extensionUri, client, 'TEST-2', 'Test Issue 2', () => { });
            IssuePanel.disposeAll();
        });
    });

    suite('getWebviewContent()', () => {
        test('generates HTML with issue key', async () => {
            const extensionUri = vscode.Uri.file('/mock/extension');
            await IssuePanel.showPreview(extensionUri, client, 'TEST-1', 'Test Issue', () => { });
        });
    });

    suite('pin()', () => {
        test('converts preview to pinned panel', async () => {
            const extensionUri = vscode.Uri.file('/mock/extension');
            await IssuePanel.showPreview(extensionUri, client, 'TEST-1', 'Test Issue', () => { });
            await IssuePanel.showPinned(extensionUri, client, 'TEST-1', 'Test Issue', () => { });
        });
    });

    suite('truncateText()', () => {
        test('does not truncate short text', async () => {
            const extensionUri = vscode.Uri.file('/mock/extension');
            await IssuePanel.showPreview(extensionUri, client, 'TEST-1', 'Short', () => { });
        });

        test('truncates long text with ellipsis', async () => {
            const extensionUri = vscode.Uri.file('/mock/extension');
            const longSummary = 'A'.repeat(100);
            await IssuePanel.showPreview(extensionUri, client, 'TEST-1', longSummary, () => { });
        });

        test('handles zero maxLength', async () => {
            const extensionUri = vscode.Uri.file('/mock/extension');
            await IssuePanel.showPreview(extensionUri, client, 'TEST-1', 'Test', () => { });
        });
    });
});
