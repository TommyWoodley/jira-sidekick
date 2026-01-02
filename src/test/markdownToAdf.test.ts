import * as assert from 'assert';
import { markdownToAdf } from '../jira/markdownToAdf';

suite('markdownToAdf', () => {
    suite('basic structure', () => {
        test('converts empty string to empty doc', () => {
            const result = markdownToAdf('');
            assert.strictEqual(result.type, 'doc');
            assert.deepStrictEqual(result.attrs, { version: 1 });
            assert.ok(Array.isArray(result.content));
        });

        test('converts plain text to paragraph', () => {
            const result = markdownToAdf('Hello world');
            assert.strictEqual(result.type, 'doc');
            assert.strictEqual(result.content?.length, 1);
            assert.strictEqual(result.content?.[0].type, 'paragraph');
            assert.strictEqual(result.content?.[0].content?.[0].text, 'Hello world');
        });

        test('converts multiple paragraphs', () => {
            const result = markdownToAdf('First paragraph\n\nSecond paragraph');
            assert.strictEqual(result.content?.length, 2);
            assert.strictEqual(result.content?.[0].type, 'paragraph');
            assert.strictEqual(result.content?.[1].type, 'paragraph');
        });
    });

    suite('headings', () => {
        test('converts h1', () => {
            const result = markdownToAdf('# Heading 1');
            assert.strictEqual(result.content?.[0].type, 'heading');
            assert.strictEqual(result.content?.[0].attrs?.level, 1);
            assert.strictEqual(result.content?.[0].content?.[0].text, 'Heading 1');
        });

        test('converts h2', () => {
            const result = markdownToAdf('## Heading 2');
            assert.strictEqual(result.content?.[0].type, 'heading');
            assert.strictEqual(result.content?.[0].attrs?.level, 2);
        });

        test('converts h3', () => {
            const result = markdownToAdf('### Heading 3');
            assert.strictEqual(result.content?.[0].type, 'heading');
            assert.strictEqual(result.content?.[0].attrs?.level, 3);
        });

        test('converts h4', () => {
            const result = markdownToAdf('#### Heading 4');
            assert.strictEqual(result.content?.[0].type, 'heading');
            assert.strictEqual(result.content?.[0].attrs?.level, 4);
        });

        test('converts h5', () => {
            const result = markdownToAdf('##### Heading 5');
            assert.strictEqual(result.content?.[0].type, 'heading');
            assert.strictEqual(result.content?.[0].attrs?.level, 5);
        });

        test('converts h6', () => {
            const result = markdownToAdf('###### Heading 6');
            assert.strictEqual(result.content?.[0].type, 'heading');
            assert.strictEqual(result.content?.[0].attrs?.level, 6);
        });
    });

    suite('inline formatting', () => {
        test('converts bold text', () => {
            const result = markdownToAdf('This is **bold** text');
            const paragraph = result.content?.[0];
            const boldNode = paragraph?.content?.find(n => n.marks?.some(m => m.type === 'strong'));
            assert.ok(boldNode, 'Should have a node with strong mark');
            assert.strictEqual(boldNode?.text, 'bold');
        });

        test('converts italic text', () => {
            const result = markdownToAdf('This is *italic* text');
            const paragraph = result.content?.[0];
            const italicNode = paragraph?.content?.find(n => n.marks?.some(m => m.type === 'em'));
            assert.ok(italicNode, 'Should have a node with em mark');
            assert.strictEqual(italicNode?.text, 'italic');
        });

        test('converts inline code', () => {
            const result = markdownToAdf('Use `code` here');
            const paragraph = result.content?.[0];
            const codeNode = paragraph?.content?.find(n => n.marks?.some(m => m.type === 'code'));
            assert.ok(codeNode, 'Should have a node with code mark');
            assert.strictEqual(codeNode?.text, 'code');
        });

        test('converts strikethrough text', () => {
            const result = markdownToAdf('This is ~~deleted~~ text');
            const paragraph = result.content?.[0];
            const strikeNode = paragraph?.content?.find(n => n.marks?.some(m => m.type === 'strike'));
            assert.ok(strikeNode, 'Should have a node with strike mark');
            assert.strictEqual(strikeNode?.text, 'deleted');
        });

        test('converts links', () => {
            const result = markdownToAdf('Visit [Example](https://example.com)');
            const paragraph = result.content?.[0];
            const linkNode = paragraph?.content?.find(n => n.marks?.some(m => m.type === 'link'));
            assert.ok(linkNode, 'Should have a node with link mark');
            const linkMark = linkNode?.marks?.find(m => m.type === 'link');
            assert.strictEqual(linkMark?.attrs?.href, 'https://example.com');
        });

        test('converts combined bold and italic', () => {
            const result = markdownToAdf('This is ***bold and italic***');
            const paragraph = result.content?.[0];
            const combinedNode = paragraph?.content?.find(n => 
                n.marks?.some(m => m.type === 'strong') && n.marks?.some(m => m.type === 'em')
            );
            assert.ok(combinedNode, 'Should have a node with both strong and em marks');
        });
    });

    suite('lists', () => {
        test('converts unordered list', () => {
            const result = markdownToAdf('- Item 1\n- Item 2\n- Item 3');
            assert.strictEqual(result.content?.[0].type, 'bulletList');
            assert.strictEqual(result.content?.[0].content?.length, 3);
            assert.strictEqual(result.content?.[0].content?.[0].type, 'listItem');
        });

        test('converts ordered list', () => {
            const result = markdownToAdf('1. First\n2. Second\n3. Third');
            assert.strictEqual(result.content?.[0].type, 'orderedList');
            assert.strictEqual(result.content?.[0].content?.length, 3);
            assert.strictEqual(result.content?.[0].content?.[0].type, 'listItem');
        });

        test('converts nested list', () => {
            const result = markdownToAdf('- Parent\n  - Child');
            const bulletList = result.content?.[0];
            assert.strictEqual(bulletList?.type, 'bulletList');
            const firstItem = bulletList?.content?.[0];
            assert.strictEqual(firstItem?.type, 'listItem');
        });
    });

    suite('code blocks', () => {
        test('converts code block without language', () => {
            const result = markdownToAdf('```\nconst x = 1;\n```');
            const codeBlock = result.content?.[0];
            assert.strictEqual(codeBlock?.type, 'codeBlock');
            assert.strictEqual(codeBlock?.content?.[0].text, 'const x = 1;');
        });

        test('converts code block with language', () => {
            const result = markdownToAdf('```javascript\nconst x = 1;\n```');
            const codeBlock = result.content?.[0];
            assert.strictEqual(codeBlock?.type, 'codeBlock');
            assert.strictEqual(codeBlock?.attrs?.language, 'javascript');
            assert.strictEqual(codeBlock?.content?.[0].text, 'const x = 1;');
        });

        test('converts multi-line code block', () => {
            const result = markdownToAdf('```python\ndef hello():\n    print("Hello")\n```');
            const codeBlock = result.content?.[0];
            assert.strictEqual(codeBlock?.type, 'codeBlock');
            assert.strictEqual(codeBlock?.attrs?.language, 'python');
            assert.ok(codeBlock?.content?.[0].text?.includes('def hello()'));
        });
    });

    suite('blockquotes', () => {
        test('converts simple blockquote', () => {
            const result = markdownToAdf('> This is a quote');
            assert.strictEqual(result.content?.[0].type, 'blockquote');
        });

        test('converts multi-line blockquote', () => {
            const result = markdownToAdf('> Line 1\n> Line 2');
            assert.strictEqual(result.content?.[0].type, 'blockquote');
        });
    });

    suite('horizontal rule', () => {
        test('converts horizontal rule', () => {
            const result = markdownToAdf('---');
            assert.strictEqual(result.content?.[0].type, 'rule');
        });

        test('converts alternative horizontal rule', () => {
            const result = markdownToAdf('***');
            assert.strictEqual(result.content?.[0].type, 'rule');
        });
    });

    suite('complex documents', () => {
        test('converts document with multiple element types', () => {
            const markdown = `# Title

This is a paragraph with **bold** and *italic* text.

- List item 1
- List item 2

\`\`\`javascript
const x = 1;
\`\`\`

> A quote`;

            const result = markdownToAdf(markdown);
            assert.strictEqual(result.type, 'doc');
            assert.ok(result.content && result.content.length > 0);
            
            const types = result.content?.map(n => n.type);
            assert.ok(types?.includes('heading'));
            assert.ok(types?.includes('paragraph'));
            assert.ok(types?.includes('bulletList'));
            assert.ok(types?.includes('codeBlock'));
            assert.ok(types?.includes('blockquote'));
        });
    });
});

