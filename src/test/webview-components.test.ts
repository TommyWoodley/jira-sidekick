import * as assert from 'assert';

// These are copies of the pure utility functions from webview-ui
// We test them here since the webview-ui module uses ESM and can't be imported directly

function formatFileSize(bytes: number): string {
    if (bytes < 1024) {
        return `${bytes} B`;
    }
    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) {
        return 'just now';
    }
    if (diffMins < 60) {
        return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    }
    if (diffHours < 24) {
        return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    }
    if (diffDays < 30) {
        return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    }
    return date.toLocaleDateString();
}

function formatFullDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString();
}

function getFileTypeIcon(mimeType: string): string {
    if (mimeType.startsWith('image/')) {
        return '🖼️';
    }
    if (mimeType.startsWith('video/')) {
        return '🎬';
    }
    if (mimeType.startsWith('audio/')) {
        return '🎵';
    }
    if (mimeType.includes('pdf')) {
        return '📄';
    }
    if (mimeType.includes('zip') || mimeType.includes('archive')) {
        return '📦';
    }
    if (mimeType.includes('text') || mimeType.includes('document')) {
        return '📝';
    }
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
        return '📊';
    }
    return '📎';
}

function getStatusDotClass(categoryKey: string): string {
    switch (categoryKey) {
        case 'done': return 'done';
        case 'indeterminate': return 'inprogress';
        default: return 'todo';
    }
}

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

suite('Webview Format Utilities', () => {
    suite('formatFileSize()', () => {
        test('formats bytes', () => {
            assert.strictEqual(formatFileSize(0), '0 B');
            assert.strictEqual(formatFileSize(500), '500 B');
            assert.strictEqual(formatFileSize(1023), '1023 B');
        });

        test('formats kilobytes', () => {
            assert.strictEqual(formatFileSize(1024), '1.0 KB');
            assert.strictEqual(formatFileSize(1536), '1.5 KB');
            assert.strictEqual(formatFileSize(10240), '10.0 KB');
        });

        test('formats megabytes', () => {
            assert.strictEqual(formatFileSize(1024 * 1024), '1.0 MB');
            assert.strictEqual(formatFileSize(1024 * 1024 * 5), '5.0 MB');
        });
    });

    suite('formatRelativeTime()', () => {
        test('formats "just now" for recent times', () => {
            const now = new Date();
            assert.strictEqual(formatRelativeTime(now.toISOString()), 'just now');
        });

        test('formats minutes ago', () => {
            const date = new Date(Date.now() - 5 * 60 * 1000);
            assert.strictEqual(formatRelativeTime(date.toISOString()), '5 minutes ago');
        });

        test('formats single minute ago', () => {
            const date = new Date(Date.now() - 1 * 60 * 1000);
            assert.strictEqual(formatRelativeTime(date.toISOString()), '1 minute ago');
        });

        test('formats hours ago', () => {
            const date = new Date(Date.now() - 3 * 60 * 60 * 1000);
            assert.strictEqual(formatRelativeTime(date.toISOString()), '3 hours ago');
        });

        test('formats single hour ago', () => {
            const date = new Date(Date.now() - 1 * 60 * 60 * 1000);
            assert.strictEqual(formatRelativeTime(date.toISOString()), '1 hour ago');
        });

        test('formats days ago', () => {
            const date = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
            assert.strictEqual(formatRelativeTime(date.toISOString()), '5 days ago');
        });

        test('formats single day ago', () => {
            const date = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
            assert.strictEqual(formatRelativeTime(date.toISOString()), '1 day ago');
        });

        test('formats old dates as locale string', () => {
            const date = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
            const result = formatRelativeTime(date.toISOString());
            assert.ok(result.length > 0);
        });
    });

    suite('formatFullDate()', () => {
        test('formats date as locale string', () => {
            const date = new Date('2024-01-15T10:30:00.000Z');
            const result = formatFullDate(date.toISOString());
            assert.ok(result.length > 0);
        });
    });

    suite('getFileTypeIcon()', () => {
        test('returns image icon for image types', () => {
            assert.strictEqual(getFileTypeIcon('image/png'), '🖼️');
            assert.strictEqual(getFileTypeIcon('image/jpeg'), '🖼️');
            assert.strictEqual(getFileTypeIcon('image/gif'), '🖼️');
        });

        test('returns video icon for video types', () => {
            assert.strictEqual(getFileTypeIcon('video/mp4'), '🎬');
            assert.strictEqual(getFileTypeIcon('video/webm'), '🎬');
        });

        test('returns audio icon for audio types', () => {
            assert.strictEqual(getFileTypeIcon('audio/mp3'), '🎵');
            assert.strictEqual(getFileTypeIcon('audio/wav'), '🎵');
        });

        test('returns pdf icon for pdf files', () => {
            assert.strictEqual(getFileTypeIcon('application/pdf'), '📄');
        });

        test('returns archive icon for zip files', () => {
            assert.strictEqual(getFileTypeIcon('application/zip'), '📦');
            assert.strictEqual(getFileTypeIcon('application/x-archive'), '📦');
        });

        test('returns text icon for text and document files', () => {
            assert.strictEqual(getFileTypeIcon('text/plain'), '📝');
            assert.strictEqual(getFileTypeIcon('application/document'), '📝');
        });

        test('returns spreadsheet icon for spreadsheet files', () => {
            assert.strictEqual(getFileTypeIcon('application/vnd.ms-excel'), '📊');
            assert.strictEqual(getFileTypeIcon('application/spreadsheet'), '📊');
        });

        test('returns attachment icon for unknown types', () => {
            assert.strictEqual(getFileTypeIcon('application/octet-stream'), '📎');
            assert.strictEqual(getFileTypeIcon('unknown/type'), '📎');
        });
    });
});

suite('Webview Status Badge', () => {
    suite('getStatusDotClass()', () => {
        test('returns done for done category', () => {
            assert.strictEqual(getStatusDotClass('done'), 'done');
        });

        test('returns inprogress for indeterminate category', () => {
            assert.strictEqual(getStatusDotClass('indeterminate'), 'inprogress');
        });

        test('returns todo for new category', () => {
            assert.strictEqual(getStatusDotClass('new'), 'todo');
        });

        test('returns todo for unknown category', () => {
            assert.strictEqual(getStatusDotClass('unknown'), 'todo');
            assert.strictEqual(getStatusDotClass(''), 'todo');
        });
    });
});

suite('Webview HTML Escaping', () => {
    suite('escapeHtml()', () => {
        test('escapes ampersand', () => {
            assert.strictEqual(escapeHtml('&'), '&amp;');
        });

        test('escapes less than', () => {
            assert.strictEqual(escapeHtml('<'), '&lt;');
        });

        test('escapes greater than', () => {
            assert.strictEqual(escapeHtml('>'), '&gt;');
        });

        test('escapes double quote', () => {
            assert.strictEqual(escapeHtml('"'), '&quot;');
        });

        test('escapes single quote', () => {
            assert.strictEqual(escapeHtml("'"), '&#039;');
        });

        test('escapes all HTML special characters', () => {
            const result = escapeHtml('<script>alert("xss")</script>');
            assert.ok(!result.includes('<'));
            assert.ok(!result.includes('>'));
            assert.ok(result.includes('&lt;'));
            assert.ok(result.includes('&gt;'));
        });

        test('preserves normal text', () => {
            assert.strictEqual(escapeHtml('Hello World'), 'Hello World');
        });
    });
});
