import * as assert from 'assert';
import * as vscode from 'vscode';
import { IssuePanel } from '../ui/issuePanel';
import { ok, err } from '../core/result';
import { JiraClientError } from '../jira/client';
import type { JiraIssue, JiraTransition, JiraComment } from '../shared/models';
import type { IssueApi } from '../shared/api';
import {
    MockJiraClient,
    mockIssue,
    mockIssue2,
    mockTransitions,
    mockComments,
} from './mocks';

interface InternalIssuePanel {
    panel: vscode.WebviewPanel;
    createApi(): IssueApi;
    currentIssue: JiraIssue | undefined;
    currentIssueKey: string;
    isPinned: boolean;
    attachmentMaps: { byId: Record<string, string>; byFilename: Record<string, string> };
    mediaIdToUrl: Record<string, string>;
    buildAttachmentMaps(issue: JiraIssue): { byId: Record<string, string>; byFilename: Record<string, string> };
    buildMediaIdToUrl(issue: JiraIssue): Record<string, string>;
    getMimeType(url: string): string;
    loadSingleImage(id: string): Promise<string | null>;
    pin(): void;
}

function getPreviewPanel(): IssuePanel | undefined {
    return (IssuePanel as unknown as { previewPanel: IssuePanel | undefined }).previewPanel;
}

function getPinnedPanels(): Map<string, IssuePanel> {
    return (IssuePanel as unknown as { pinnedPanels: Map<string, IssuePanel> }).pinnedPanels;
}

function getInternalPanel(panel: IssuePanel): InternalIssuePanel {
    return panel as unknown as InternalIssuePanel;
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
                    content: 'https://test.atlassian.net/attachment/screenshot.png',
                    mimeType: 'image/png',
                    size: 1024,
                    created: '2024-01-01T00:00:00.000Z',
                },
                {
                    id: 'att-2',
                    filename: 'document.pdf',
                    content: 'https://test.atlassian.net/attachment/document.pdf',
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
                                    id: 'att-1',
                                    alt: 'screenshot.png',
                                },
                            },
                        ],
                    },
                ],
            },
        },
    };
}

function createIssueWithNestedMedia(): JiraIssue {
    return {
        ...mockIssue,
        fields: {
            ...mockIssue.fields,
            attachment: [
                {
                    id: 'att-nested',
                    filename: 'nested-image.png',
                    content: 'https://test.atlassian.net/attachment/nested.png',
                    mimeType: 'image/png',
                    size: 512,
                    created: '2024-01-01T00:00:00.000Z',
                },
            ],
            description: {
                type: 'doc',
                content: [
                    {
                        type: 'paragraph',
                        content: [
                            {
                                type: 'text',
                                text: 'Some text before image',
                            },
                        ],
                    },
                    {
                        type: 'mediaSingle',
                        content: [
                            {
                                type: 'media',
                                attrs: {
                                    id: 'media-unknown-id',
                                    alt: 'nested-image.png',
                                },
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

    suiteTeardown(() => {
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
            assert.ok(getPreviewPanel());
        });

        test('reuses preview panel for different issue', async () => {
            const extensionUri = vscode.Uri.file('/mock/extension');
            await IssuePanel.showPreview(extensionUri, client, 'TEST-1', 'Test Issue Summary', () => {});
            const firstPanel = getPreviewPanel();
            
            await IssuePanel.showPreview(extensionUri, client, 'TEST-2', 'Another Issue', () => {});
            assert.strictEqual(getPreviewPanel(), firstPanel);
            
            const internal = getInternalPanel(getPreviewPanel()!);
            assert.strictEqual(internal.currentIssueKey, 'TEST-2');
        });

        test('reveals pinned panel if exists for same issue', async () => {
            const extensionUri = vscode.Uri.file('/mock/extension');
            await IssuePanel.showPinned(extensionUri, client, 'TEST-1', 'Test Issue Summary', () => {});
            const pinnedPanel = getPinnedPanels().get('TEST-1');
            assert.ok(pinnedPanel);
            
            await IssuePanel.showPreview(extensionUri, client, 'TEST-1', 'Test Issue Summary', () => {});
            assert.strictEqual(getPreviewPanel(), undefined);
        });
    });

    suite('showPinned()', () => {
        test('creates pinned panel', async () => {
            const extensionUri = vscode.Uri.file('/mock/extension');
            await IssuePanel.showPinned(extensionUri, client, 'TEST-1', 'Test Issue Summary', () => {});
            assert.ok(getPinnedPanels().has('TEST-1'));
        });

        test('reveals existing pinned panel', async () => {
            const extensionUri = vscode.Uri.file('/mock/extension');
            await IssuePanel.showPinned(extensionUri, client, 'TEST-1', 'Test Issue Summary', () => {});
            const firstPanel = getPinnedPanels().get('TEST-1');
            
            await IssuePanel.showPinned(extensionUri, client, 'TEST-1', 'Test Issue Summary', () => {});
            assert.strictEqual(getPinnedPanels().get('TEST-1'), firstPanel);
        });

        test('converts preview to pinned for same issue', async () => {
            const extensionUri = vscode.Uri.file('/mock/extension');
            await IssuePanel.showPreview(extensionUri, client, 'TEST-1', 'Test Issue Summary', () => {});
            const previewPanel = getPreviewPanel();
            assert.ok(previewPanel);
            
            await IssuePanel.showPinned(extensionUri, client, 'TEST-1', 'Test Issue Summary', () => {});
            assert.strictEqual(getPreviewPanel(), undefined);
            assert.ok(getPinnedPanels().has('TEST-1'));
        });

        test('creates separate pinned panels for different issues', async () => {
            const extensionUri = vscode.Uri.file('/mock/extension');
            await IssuePanel.showPinned(extensionUri, client, 'TEST-1', 'Test Issue Summary', () => {});
            await IssuePanel.showPinned(extensionUri, client, 'TEST-2', 'Another Issue', () => {});
            
            assert.ok(getPinnedPanels().has('TEST-1'));
            assert.ok(getPinnedPanels().has('TEST-2'));
            assert.strictEqual(getPinnedPanels().size, 2);
        });
    });

    suite('API - loadIssue', () => {
        test('loads issue and comments successfully', async () => {
            client.getIssueResult = ok<JiraIssue>(mockIssue);
            client.getCommentsResult = ok<JiraComment[]>(mockComments);
            
            const extensionUri = vscode.Uri.file('/mock/extension');
            await IssuePanel.showPreview(extensionUri, client, 'TEST-1', 'Test Issue', () => {});
            
            const internal = getInternalPanel(getPreviewPanel()!);
            const api = internal.createApi();
            const result = await api.loadIssue('TEST-1');
            
            assert.strictEqual(result.issue.key, 'TEST-1');
            assert.strictEqual(result.comments.length, 1);
        });

        test('handles issue fetch error', async () => {
            client.getIssueResult = err(new JiraClientError('Issue not found', 404));
            
            const extensionUri = vscode.Uri.file('/mock/extension');
            await IssuePanel.showPreview(extensionUri, client, 'TEST-1', 'Test Issue', () => {});
            
            const internal = getInternalPanel(getPreviewPanel()!);
            const api = internal.createApi();
            
            await assert.rejects(
                async () => await api.loadIssue('TEST-1'),
                { message: 'Issue not found' }
            );
        });

        test('handles comments fetch failure gracefully', async () => {
            client.getIssueResult = ok<JiraIssue>(mockIssue);
            client.getCommentsResult = err(new JiraClientError('Comments failed', 500));
            
            const extensionUri = vscode.Uri.file('/mock/extension');
            await IssuePanel.showPreview(extensionUri, client, 'TEST-1', 'Test Issue', () => {});
            
            const internal = getInternalPanel(getPreviewPanel()!);
            const api = internal.createApi();
            const result = await api.loadIssue('TEST-1');
            
            assert.strictEqual(result.issue.key, 'TEST-1');
            assert.strictEqual(result.comments.length, 0);
        });

        test('loads issue with attachments and builds attachment maps', async () => {
            const issueWithAttachments = createIssueWithAttachments();
            client.getIssueResult = ok<JiraIssue>(issueWithAttachments);
            client.getCommentsResult = ok<JiraComment[]>([]);
            
            const extensionUri = vscode.Uri.file('/mock/extension');
            await IssuePanel.showPreview(extensionUri, client, 'TEST-1', 'Test Issue', () => {});
            
            const internal = getInternalPanel(getPreviewPanel()!);
            const api = internal.createApi();
            await api.loadIssue('TEST-1');
            
            assert.ok(internal.attachmentMaps.byId['att-1']);
            assert.ok(internal.attachmentMaps.byFilename['screenshot.png']);
        });

        test('builds media ID to URL map from description', async () => {
            const issueWithAttachments = createIssueWithAttachments();
            client.getIssueResult = ok<JiraIssue>(issueWithAttachments);
            client.getCommentsResult = ok<JiraComment[]>([]);
            
            const extensionUri = vscode.Uri.file('/mock/extension');
            await IssuePanel.showPreview(extensionUri, client, 'TEST-1', 'Test Issue', () => {});
            
            const internal = getInternalPanel(getPreviewPanel()!);
            const api = internal.createApi();
            await api.loadIssue('TEST-1');
            
            assert.ok(internal.mediaIdToUrl['att-1']);
        });

        test('resolves media by filename when ID not found', async () => {
            const issueWithNestedMedia = createIssueWithNestedMedia();
            client.getIssueResult = ok<JiraIssue>(issueWithNestedMedia);
            client.getCommentsResult = ok<JiraComment[]>([]);
            
            const extensionUri = vscode.Uri.file('/mock/extension');
            await IssuePanel.showPreview(extensionUri, client, 'TEST-1', 'Test Issue', () => {});
            
            const internal = getInternalPanel(getPreviewPanel()!);
            const api = internal.createApi();
            await api.loadIssue('TEST-1');
            
            assert.ok(internal.mediaIdToUrl['media-unknown-id']);
        });
    });

    suite('API - refresh', () => {
        test('refreshes issue data successfully', async () => {
            client.getIssueResult = ok<JiraIssue>(mockIssue);
            client.getCommentsResult = ok<JiraComment[]>(mockComments);
            
            const extensionUri = vscode.Uri.file('/mock/extension');
            await IssuePanel.showPreview(extensionUri, client, 'TEST-1', 'Test Issue', () => {});
            
            const internal = getInternalPanel(getPreviewPanel()!);
            const api = internal.createApi();
            await api.loadIssue('TEST-1');
            
            client.getIssueResult = ok<JiraIssue>(mockIssue2);
            const result = await api.refresh();
            assert.strictEqual(result.issue.key, 'TEST-2');
        });

        test('throws error when no issue key set', async () => {
            const extensionUri = vscode.Uri.file('/mock/extension');
            await IssuePanel.showPreview(extensionUri, client, '', 'Test Issue', () => {});
            
            const internal = getInternalPanel(getPreviewPanel()!);
            const api = internal.createApi();
            
            await assert.rejects(
                async () => await api.refresh(),
                { message: 'No issue loaded' }
            );
        });
    });

    suite('API - openInBrowser', () => {
        test('calls callback with current issue', async () => {
            client.getIssueResult = ok<JiraIssue>(mockIssue);
            client.getCommentsResult = ok<JiraComment[]>([]);
            
            const extensionUri = vscode.Uri.file('/mock/extension');
            await IssuePanel.showPreview(extensionUri, client, 'TEST-1', 'Test Issue', (issue) => {
                openInBrowserCalled = true;
                openInBrowserIssue = issue;
            });
            
            const internal = getInternalPanel(getPreviewPanel()!);
            const api = internal.createApi();
            await api.loadIssue('TEST-1');
            api.openInBrowser();
            
            assert.strictEqual(openInBrowserCalled, true);
            assert.strictEqual(openInBrowserIssue?.key, 'TEST-1');
        });

        test('does nothing when no issue loaded', async () => {
            const extensionUri = vscode.Uri.file('/mock/extension');
            await IssuePanel.showPreview(extensionUri, client, 'TEST-1', 'Test Issue', (issue) => {
                openInBrowserCalled = true;
                openInBrowserIssue = issue;
            });
            
            const internal = getInternalPanel(getPreviewPanel()!);
            const api = internal.createApi();
            api.openInBrowser();
            
            assert.strictEqual(openInBrowserCalled, false);
        });
    });

    suite('API - openAttachment', () => {
        test('opens attachment URL in browser', async () => {
            const extensionUri = vscode.Uri.file('/mock/extension');
            await IssuePanel.showPreview(extensionUri, client, 'TEST-1', 'Test Issue', () => {});
            
            const internal = getInternalPanel(getPreviewPanel()!);
            const api = internal.createApi();
            api.openAttachment('https://test.atlassian.net/attachment/1');
        });
    });

    suite('API - loadImage', () => {
        test('loads image by media ID successfully', async () => {
            const issueWithAttachments = createIssueWithAttachments();
            client.getIssueResult = ok<JiraIssue>(issueWithAttachments);
            client.getCommentsResult = ok<JiraComment[]>([]);
            client.downloadAttachmentResult = ok(Buffer.from('image data'));
            
            const extensionUri = vscode.Uri.file('/mock/extension');
            await IssuePanel.showPreview(extensionUri, client, 'TEST-1', 'Test Issue', () => {});
            
            const internal = getInternalPanel(getPreviewPanel()!);
            const api = internal.createApi();
            await api.loadIssue('TEST-1');
            
            const result = await api.loadImage('att-1');
            assert.ok(result);
            assert.ok(result.startsWith('data:image/png;base64,'));
        });

        test('returns null for unknown media ID', async () => {
            client.getIssueResult = ok<JiraIssue>(mockIssue);
            client.getCommentsResult = ok<JiraComment[]>([]);
            
            const extensionUri = vscode.Uri.file('/mock/extension');
            await IssuePanel.showPreview(extensionUri, client, 'TEST-1', 'Test Issue', () => {});
            
            const internal = getInternalPanel(getPreviewPanel()!);
            const api = internal.createApi();
            await api.loadIssue('TEST-1');
            
            const result = await api.loadImage('unknown-id');
            assert.strictEqual(result, null);
        });

        test('returns null on download failure', async () => {
            const issueWithAttachments = createIssueWithAttachments();
            client.getIssueResult = ok<JiraIssue>(issueWithAttachments);
            client.getCommentsResult = ok<JiraComment[]>([]);
            client.downloadAttachmentResult = err(new JiraClientError('Download failed', 500));
            
            const extensionUri = vscode.Uri.file('/mock/extension');
            await IssuePanel.showPreview(extensionUri, client, 'TEST-1', 'Test Issue', () => {});
            
            const internal = getInternalPanel(getPreviewPanel()!);
            const api = internal.createApi();
            await api.loadIssue('TEST-1');
            
            const result = await api.loadImage('att-1');
            assert.strictEqual(result, null);
        });
    });

    suite('getMimeType()', () => {
        test('returns image/jpeg for .jpg', async () => {
            const extensionUri = vscode.Uri.file('/mock/extension');
            await IssuePanel.showPreview(extensionUri, client, 'TEST-1', 'Test Issue', () => {});
            
            const internal = getInternalPanel(getPreviewPanel()!);
            assert.strictEqual(internal.getMimeType('https://example.com/photo.jpg'), 'image/jpeg');
        });

        test('returns image/jpeg for .jpeg', async () => {
            const extensionUri = vscode.Uri.file('/mock/extension');
            await IssuePanel.showPreview(extensionUri, client, 'TEST-1', 'Test Issue', () => {});
            
            const internal = getInternalPanel(getPreviewPanel()!);
            assert.strictEqual(internal.getMimeType('https://example.com/photo.jpeg'), 'image/jpeg');
        });

        test('returns image/gif for .gif', async () => {
            const extensionUri = vscode.Uri.file('/mock/extension');
            await IssuePanel.showPreview(extensionUri, client, 'TEST-1', 'Test Issue', () => {});
            
            const internal = getInternalPanel(getPreviewPanel()!);
            assert.strictEqual(internal.getMimeType('https://example.com/animation.gif'), 'image/gif');
        });

        test('returns image/webp for .webp', async () => {
            const extensionUri = vscode.Uri.file('/mock/extension');
            await IssuePanel.showPreview(extensionUri, client, 'TEST-1', 'Test Issue', () => {});
            
            const internal = getInternalPanel(getPreviewPanel()!);
            assert.strictEqual(internal.getMimeType('https://example.com/image.webp'), 'image/webp');
        });

        test('returns image/svg+xml for .svg', async () => {
            const extensionUri = vscode.Uri.file('/mock/extension');
            await IssuePanel.showPreview(extensionUri, client, 'TEST-1', 'Test Issue', () => {});
            
            const internal = getInternalPanel(getPreviewPanel()!);
            assert.strictEqual(internal.getMimeType('https://example.com/icon.svg'), 'image/svg+xml');
        });

        test('returns image/png for .png', async () => {
            const extensionUri = vscode.Uri.file('/mock/extension');
            await IssuePanel.showPreview(extensionUri, client, 'TEST-1', 'Test Issue', () => {});
            
            const internal = getInternalPanel(getPreviewPanel()!);
            assert.strictEqual(internal.getMimeType('https://example.com/image.png'), 'image/png');
        });

        test('returns image/png as default', async () => {
            const extensionUri = vscode.Uri.file('/mock/extension');
            await IssuePanel.showPreview(extensionUri, client, 'TEST-1', 'Test Issue', () => {});
            
            const internal = getInternalPanel(getPreviewPanel()!);
            assert.strictEqual(internal.getMimeType('https://example.com/unknown'), 'image/png');
        });
    });

    suite('API - getTransitions', () => {
        test('returns available transitions', async () => {
            client.getIssueResult = ok<JiraIssue>(mockIssue);
            client.getCommentsResult = ok<JiraComment[]>([]);
            client.getTransitionsResult = ok<JiraTransition[]>(mockTransitions);
            
            const extensionUri = vscode.Uri.file('/mock/extension');
            await IssuePanel.showPreview(extensionUri, client, 'TEST-1', 'Test Issue', () => {});
            
            const internal = getInternalPanel(getPreviewPanel()!);
            const api = internal.createApi();
            await api.loadIssue('TEST-1');
            
            const transitions = await api.getTransitions();
            assert.strictEqual(transitions.length, 2);
            assert.strictEqual(transitions[0].name, 'In Progress');
        });

        test('throws error when no issue key', async () => {
            const extensionUri = vscode.Uri.file('/mock/extension');
            await IssuePanel.showPreview(extensionUri, client, '', 'Test Issue', () => {});
            
            const internal = getInternalPanel(getPreviewPanel()!);
            const api = internal.createApi();
            
            await assert.rejects(
                async () => await api.getTransitions(),
                { message: 'No issue loaded' }
            );
        });

        test('handles transitions fetch error', async () => {
            client.getIssueResult = ok<JiraIssue>(mockIssue);
            client.getCommentsResult = ok<JiraComment[]>([]);
            client.getTransitionsResult = err(new JiraClientError('Failed', 500));
            
            const extensionUri = vscode.Uri.file('/mock/extension');
            await IssuePanel.showPreview(extensionUri, client, 'TEST-1', 'Test Issue', () => {});
            
            const internal = getInternalPanel(getPreviewPanel()!);
            const api = internal.createApi();
            await api.loadIssue('TEST-1');
            
            await assert.rejects(
                async () => await api.getTransitions(),
                { message: 'Failed' }
            );
        });
    });

    suite('API - transitionIssue', () => {
        test('transitions issue successfully', async () => {
            client.getIssueResult = ok<JiraIssue>(mockIssue);
            client.getCommentsResult = ok<JiraComment[]>([]);
            client.transitionIssueResult = ok<void>(undefined);
            
            const extensionUri = vscode.Uri.file('/mock/extension');
            await IssuePanel.showPreview(extensionUri, client, 'TEST-1', 'Test Issue', () => {});
            
            const internal = getInternalPanel(getPreviewPanel()!);
            const api = internal.createApi();
            await api.loadIssue('TEST-1');
            
            client.getIssueResult = ok<JiraIssue>(mockIssue2);
            const result = await api.transitionIssue('21');
            assert.strictEqual(result.issue.key, 'TEST-2');
        });

        test('throws error when no issue key', async () => {
            const extensionUri = vscode.Uri.file('/mock/extension');
            await IssuePanel.showPreview(extensionUri, client, '', 'Test Issue', () => {});
            
            const internal = getInternalPanel(getPreviewPanel()!);
            const api = internal.createApi();
            
            await assert.rejects(
                async () => await api.transitionIssue('21'),
                { message: 'No issue loaded' }
            );
        });

        test('handles transition error', async () => {
            client.getIssueResult = ok<JiraIssue>(mockIssue);
            client.getCommentsResult = ok<JiraComment[]>([]);
            client.transitionIssueResult = err(new JiraClientError('Transition failed', 400));
            
            const extensionUri = vscode.Uri.file('/mock/extension');
            await IssuePanel.showPreview(extensionUri, client, 'TEST-1', 'Test Issue', () => {});
            
            const internal = getInternalPanel(getPreviewPanel()!);
            const api = internal.createApi();
            await api.loadIssue('TEST-1');
            
            await assert.rejects(
                async () => await api.transitionIssue('21'),
                { message: 'Transition failed' }
            );
        });

        test('handles issue fetch error after transition', async () => {
            client.getIssueResult = ok<JiraIssue>(mockIssue);
            client.getCommentsResult = ok<JiraComment[]>([]);
            client.transitionIssueResult = ok<void>(undefined);
            
            const extensionUri = vscode.Uri.file('/mock/extension');
            await IssuePanel.showPreview(extensionUri, client, 'TEST-1', 'Test Issue', () => {});
            
            const internal = getInternalPanel(getPreviewPanel()!);
            const api = internal.createApi();
            await api.loadIssue('TEST-1');
            
            client.getIssueResult = err(new JiraClientError('Issue not found', 404));
            
            await assert.rejects(
                async () => await api.transitionIssue('21'),
                { message: 'Issue not found' }
            );
        });
    });

    suite('addComment()', () => {
        test('adds comment and returns it', async () => {
            client.getIssueResult = ok<JiraIssue>(mockIssue);
            client.getCommentsResult = ok<JiraComment[]>([]);
            client.addCommentResult = ok<JiraComment>(mockComments[0]);

            const extensionUri = vscode.Uri.file('/mock/extension');
            await IssuePanel.showPreview(extensionUri, client, 'TEST-1', 'Test Issue', () => { });

            const internal = getInternalPanel(getPreviewPanel()!);
            const api = internal.createApi();
            await api.loadIssue('TEST-1');

            const result = await api.addComment('Test comment');
            assert.strictEqual(result.id, mockComments[0].id);
        });

        test('throws error when no issue key', async () => {
            const extensionUri = vscode.Uri.file('/mock/extension');
            await IssuePanel.showPreview(extensionUri, client, '', 'Test Issue', () => { });

            const internal = getInternalPanel(getPreviewPanel()!);
            const api = internal.createApi();

            await assert.rejects(
                async () => await api.addComment('Test comment'),
                { message: 'No issue loaded' }
            );
        });

        test('handles addComment error', async () => {
            client.getIssueResult = ok<JiraIssue>(mockIssue);
            client.getCommentsResult = ok<JiraComment[]>([]);
            client.addCommentResult = err(new JiraClientError('Failed to add comment', 400));

            const extensionUri = vscode.Uri.file('/mock/extension');
            await IssuePanel.showPreview(extensionUri, client, 'TEST-1', 'Test Issue', () => { });

            const internal = getInternalPanel(getPreviewPanel()!);
            const api = internal.createApi();
            await api.loadIssue('TEST-1');

            await assert.rejects(
                async () => await api.addComment('Test comment'),
                { message: 'Failed to add comment' }
            );
        });
    });

    suite('pin()', () => {
        test('converts preview to pinned panel', async () => {
            const extensionUri = vscode.Uri.file('/mock/extension');
            await IssuePanel.showPreview(extensionUri, client, 'TEST-1', 'Test Issue', () => {});
            
            const internal = getInternalPanel(getPreviewPanel()!);
            assert.strictEqual(internal.isPinned, false);
            
            internal.pin();
            
            assert.strictEqual(internal.isPinned, true);
            assert.strictEqual(getPreviewPanel(), undefined);
            assert.ok(getPinnedPanels().has('TEST-1'));
        });

        test('removes tilde prefix from title when pinning', async () => {
            const extensionUri = vscode.Uri.file('/mock/extension');
            await IssuePanel.showPreview(extensionUri, client, 'TEST-1', 'Test Issue', () => {});
            
            const internal = getInternalPanel(getPreviewPanel()!);
            const originalTitle = internal.panel.title;
            assert.ok(originalTitle.startsWith('~ '));
            
            internal.pin();
            
            assert.ok(!internal.panel.title.startsWith('~ '));
        });

        test('does nothing if already pinned', async () => {
            const extensionUri = vscode.Uri.file('/mock/extension');
            await IssuePanel.showPinned(extensionUri, client, 'TEST-1', 'Test Issue', () => {});
            
            const pinnedPanel = getPinnedPanels().get('TEST-1')!;
            const internal = getInternalPanel(pinnedPanel);
            
            internal.pin();
            internal.pin();
            
            assert.strictEqual(internal.isPinned, true);
        });
    });

    suite('dispose()', () => {
        test('disposes preview panel and clears reference', async () => {
            const extensionUri = vscode.Uri.file('/mock/extension');
            await IssuePanel.showPreview(extensionUri, client, 'TEST-1', 'Test Issue', () => {});
            
            const panel = getPreviewPanel()!;
            panel.dispose();
            
            assert.strictEqual(getPreviewPanel(), undefined);
        });

        test('disposes pinned panel and removes from map', async () => {
            const extensionUri = vscode.Uri.file('/mock/extension');
            await IssuePanel.showPinned(extensionUri, client, 'TEST-1', 'Test Issue', () => {});
            
            const panel = getPinnedPanels().get('TEST-1')!;
            panel.dispose();
            
            assert.ok(!getPinnedPanels().has('TEST-1'));
        });

        test('disposeAll cleans up all panels', async () => {
            const extensionUri = vscode.Uri.file('/mock/extension');
            await IssuePanel.showPreview(extensionUri, client, 'TEST-1', 'Test Issue', () => {});
            await IssuePanel.showPinned(extensionUri, client, 'TEST-2', 'Test Issue 2', () => {});
            await IssuePanel.showPinned(extensionUri, client, 'TEST-3', 'Test Issue 3', () => {});
            
            IssuePanel.disposeAll();
            
            assert.strictEqual(getPreviewPanel(), undefined);
            assert.strictEqual(getPinnedPanels().size, 0);
        });
    });

    suite('getWebviewContent()', () => {
        test('generates HTML with issue key data attribute', async () => {
            const extensionUri = vscode.Uri.file('/mock/extension');
            await IssuePanel.showPreview(extensionUri, client, 'TEST-123', 'Test Issue', () => {});
            
            const internal = getInternalPanel(getPreviewPanel()!);
            const html = internal.panel.webview.html;
            
            assert.ok(html.includes('<!DOCTYPE html>'));
            assert.ok(html.includes('issue-app'));
            assert.ok(html.includes('data-issue-key="TEST-123"'));
        });
    });

    suite('buildAttachmentMaps()', () => {
        test('builds maps from issue attachments', async () => {
            const extensionUri = vscode.Uri.file('/mock/extension');
            await IssuePanel.showPreview(extensionUri, client, 'TEST-1', 'Test Issue', () => {});
            
            const internal = getInternalPanel(getPreviewPanel()!);
            const issueWithAttachments = createIssueWithAttachments();
            const maps = internal.buildAttachmentMaps(issueWithAttachments);
            
            assert.strictEqual(maps.byId['att-1'], 'https://test.atlassian.net/attachment/screenshot.png');
            assert.strictEqual(maps.byFilename['screenshot.png'], 'https://test.atlassian.net/attachment/screenshot.png');
        });

        test('handles issue with no attachments', async () => {
            const extensionUri = vscode.Uri.file('/mock/extension');
            await IssuePanel.showPreview(extensionUri, client, 'TEST-1', 'Test Issue', () => {});
            
            const internal = getInternalPanel(getPreviewPanel()!);
            const maps = internal.buildAttachmentMaps(mockIssue);
            
            assert.strictEqual(Object.keys(maps.byId).length, 0);
            assert.strictEqual(Object.keys(maps.byFilename).length, 0);
        });
    });

    suite('buildMediaIdToUrl()', () => {
        test('builds map from description media nodes', async () => {
            const issueWithAttachments = createIssueWithAttachments();
            client.getIssueResult = ok<JiraIssue>(issueWithAttachments);
            client.getCommentsResult = ok<JiraComment[]>([]);
            
            const extensionUri = vscode.Uri.file('/mock/extension');
            await IssuePanel.showPreview(extensionUri, client, 'TEST-1', 'Test Issue', () => {});
            
            const internal = getInternalPanel(getPreviewPanel()!);
            const api = internal.createApi();
            await api.loadIssue('TEST-1');
            
            const map = internal.buildMediaIdToUrl(issueWithAttachments);
            assert.ok(map['att-1']);
        });

        test('handles null description', async () => {
            const extensionUri = vscode.Uri.file('/mock/extension');
            await IssuePanel.showPreview(extensionUri, client, 'TEST-1', 'Test Issue', () => {});
            
            const internal = getInternalPanel(getPreviewPanel()!);
            const map = internal.buildMediaIdToUrl(mockIssue);
            
            assert.strictEqual(Object.keys(map).length, 0);
        });
    });

    suite('truncateText()', () => {
        test('short text not truncated in title', async () => {
            const extensionUri = vscode.Uri.file('/mock/extension');
            await IssuePanel.showPreview(extensionUri, client, 'TEST-1', 'Short', () => {});
            
            const internal = getInternalPanel(getPreviewPanel()!);
            assert.ok(internal.panel.title.includes('Short'));
            assert.ok(!internal.panel.title.includes('...'));
        });

        test('long text truncated in title', async () => {
            const extensionUri = vscode.Uri.file('/mock/extension');
            const longSummary = 'This is a very long issue summary that should definitely be truncated';
            await IssuePanel.showPreview(extensionUri, client, 'TEST-1', longSummary, () => {});
            
            const internal = getInternalPanel(getPreviewPanel()!);
            assert.ok(internal.panel.title.includes('...'));
        });
    });
});
