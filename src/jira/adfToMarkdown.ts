interface AdfNode {
    type: string;
    content?: AdfNode[];
    text?: string;
    attrs?: Record<string, unknown>;
    marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
}

export function adfToMarkdown(adf: unknown): string {
    if (!adf || typeof adf !== 'object') {
        return '';
    }

    const doc = adf as AdfNode;
    if (doc.type !== 'doc' || !doc.content) {
        return '';
    }

    return doc.content.map(node => convertNode(node)).join('\n\n');
}

function convertNode(node: AdfNode, listDepth: number = 0): string {
    switch (node.type) {
        case 'paragraph':
            return convertInlineContent(node.content);

        case 'heading': {
            const level = (node.attrs?.level as number) || 1;
            const prefix = '#'.repeat(level);
            return `${prefix} ${convertInlineContent(node.content)}`;
        }

        case 'bulletList':
            return convertList(node, '-', listDepth);

        case 'orderedList':
            return convertList(node, '1.', listDepth);

        case 'listItem': {
            const content = node.content?.map(child => convertNode(child, listDepth)).join('\n') || '';
            return content;
        }

        case 'codeBlock': {
            const language = (node.attrs?.language as string) || '';
            const code = node.content?.map(n => n.text || '').join('') || '';
            return `\`\`\`${language}\n${code}\n\`\`\``;
        }

        case 'blockquote': {
            const content = node.content?.map(child => convertNode(child)).join('\n') || '';
            return content.split('\n').map(line => `> ${line}`).join('\n');
        }

        case 'rule':
            return '---';

        case 'hardBreak':
            return '\n';

        case 'table':
            return convertTable(node);

        case 'mediaSingle':
        case 'media':
            return '[Media attachment]';

        case 'panel': {
            const panelType = (node.attrs?.panelType as string) || 'info';
            const content = node.content?.map(child => convertNode(child)).join('\n') || '';
            return `> **${panelType.toUpperCase()}:** ${content}`;
        }

        case 'expand': {
            const title = (node.attrs?.title as string) || 'Details';
            const content = node.content?.map(child => convertNode(child)).join('\n') || '';
            return `<details>\n<summary>${title}</summary>\n\n${content}\n</details>`;
        }

        default:
            if (node.content) {
                return node.content.map(child => convertNode(child, listDepth)).join('');
            }
            return '';
    }
}

function convertList(node: AdfNode, marker: string, depth: number): string {
    if (!node.content) {
        return '';
    }

    const indent = '  '.repeat(depth);
    return node.content.map((item, index) => {
        const prefix = marker === '1.' ? `${index + 1}.` : marker;
        const content = convertNode(item, depth + 1);
        return `${indent}${prefix} ${content}`;
    }).join('\n');
}

function convertTable(node: AdfNode): string {
    if (!node.content) {
        return '';
    }

    const rows: string[][] = [];
    let hasHeader = false;

    for (const row of node.content) {
        if (row.type === 'tableRow' && row.content) {
            const cells: string[] = [];
            for (const cell of row.content) {
                if (cell.type === 'tableHeader') {
                    hasHeader = true;
                }
                const content = cell.content?.map(child => convertNode(child)).join(' ') || '';
                cells.push(content);
            }
            rows.push(cells);
        }
    }

    if (rows.length === 0) {
        return '';
    }

    const lines: string[] = [];
    const colCount = Math.max(...rows.map(r => r.length));

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        while (row.length < colCount) {
            row.push('');
        }
        lines.push(`| ${row.join(' | ')} |`);

        if (i === 0 && hasHeader) {
            lines.push(`| ${row.map(() => '---').join(' | ')} |`);
        }
    }

    return lines.join('\n');
}

function convertInlineContent(content?: AdfNode[]): string {
    if (!content) {
        return '';
    }

    return content.map(node => {
        if (node.type === 'text') {
            let text = node.text || '';
            if (node.marks) {
                for (const mark of node.marks) {
                    text = applyMark(text, mark);
                }
            }
            return text;
        }

        if (node.type === 'hardBreak') {
            return '\n';
        }

        if (node.type === 'mention') {
            const name = (node.attrs?.text as string) || '@user';
            return name;
        }

        if (node.type === 'emoji') {
            const shortName = (node.attrs?.shortName as string) || '';
            return shortName;
        }

        if (node.type === 'inlineCard') {
            const url = (node.attrs?.url as string) || '';
            return `[${url}](${url})`;
        }

        return '';
    }).join('');
}

function applyMark(text: string, mark: { type: string; attrs?: Record<string, unknown> }): string {
    switch (mark.type) {
        case 'strong':
            return `**${text}**`;
        case 'em':
            return `*${text}*`;
        case 'strike':
            return `~~${text}~~`;
        case 'code':
            return `\`${text}\``;
        case 'link': {
            const href = (mark.attrs?.href as string) || '';
            return `[${text}](${href})`;
        }
        case 'underline':
            return `<u>${text}</u>`;
        case 'subsup': {
            const supType = mark.attrs?.type as string;
            if (supType === 'sup') {
                return `<sup>${text}</sup>`;
            }
            return `<sub>${text}</sub>`;
        }
        default:
            return text;
    }
}

