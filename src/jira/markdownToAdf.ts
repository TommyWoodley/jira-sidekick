import { Lexer, Token, Tokens } from 'marked';
import type { AdfNode, AdfMark } from '../shared/models';

export function markdownToAdf(markdown: string): AdfNode {
    const lexer = new Lexer();
    const tokens = lexer.lex(markdown);
    
    const content = convertTokens(tokens);
    
    return {
        type: 'doc',
        attrs: { version: 1 },
        content: content.length > 0 ? content : [{ type: 'paragraph', content: [] }]
    };
}

function convertTokens(tokens: Token[]): AdfNode[] {
    const result: AdfNode[] = [];
    
    for (const token of tokens) {
        const node = convertToken(token);
        if (node) {
            if (Array.isArray(node)) {
                result.push(...node);
            } else {
                result.push(node);
            }
        }
    }
    
    return result;
}

function convertToken(token: Token): AdfNode | AdfNode[] | null {
    switch (token.type) {
        case 'paragraph':
            return convertParagraph(token as Tokens.Paragraph);
        case 'heading':
            return convertHeading(token as Tokens.Heading);
        case 'list':
            return convertList(token as Tokens.List);
        case 'code':
            return convertCodeBlock(token as Tokens.Code);
        case 'blockquote':
            return convertBlockquote(token as Tokens.Blockquote);
        case 'hr':
            return { type: 'rule' };
        case 'space':
            return null;
        default:
            return null;
    }
}

function convertParagraph(token: Tokens.Paragraph): AdfNode {
    return {
        type: 'paragraph',
        content: convertInlineTokens(token.tokens || [])
    };
}

function convertHeading(token: Tokens.Heading): AdfNode {
    return {
        type: 'heading',
        attrs: { level: token.depth },
        content: convertInlineTokens(token.tokens || [])
    };
}

function convertList(token: Tokens.List): AdfNode {
    const listType = token.ordered ? 'orderedList' : 'bulletList';
    const items = token.items.map((item): AdfNode => ({
        type: 'listItem',
        content: convertListItemContent(item)
    }));
    
    return {
        type: listType,
        content: items
    };
}

function convertListItemContent(item: Tokens.ListItem): AdfNode[] {
    const content: AdfNode[] = [];
    
    for (const token of item.tokens) {
        if (token.type === 'text' && 'tokens' in token && token.tokens) {
            content.push({
                type: 'paragraph',
                content: convertInlineTokens(token.tokens)
            });
        } else if (token.type === 'list') {
            const nestedList = convertList(token as Tokens.List);
            if (nestedList) {
                content.push(nestedList);
            }
        } else {
            const converted = convertToken(token);
            if (converted) {
                if (Array.isArray(converted)) {
                    content.push(...converted);
                } else {
                    content.push(converted);
                }
            }
        }
    }
    
    if (content.length === 0) {
        content.push({
            type: 'paragraph',
            content: [{ type: 'text', text: item.text || '' }]
        });
    }
    
    return content;
}

function convertCodeBlock(token: Tokens.Code): AdfNode {
    return {
        type: 'codeBlock',
        attrs: token.lang ? { language: token.lang } : undefined,
        content: [{ type: 'text', text: token.text }]
    };
}

function convertBlockquote(token: Tokens.Blockquote): AdfNode {
    return {
        type: 'blockquote',
        content: convertTokens(token.tokens)
    };
}

function convertInlineTokens(tokens: Token[]): AdfNode[] {
    const result: AdfNode[] = [];
    
    for (const token of tokens) {
        const nodes = convertInlineToken(token);
        result.push(...nodes);
    }
    
    return result;
}

function convertInlineToken(token: Token): AdfNode[] {
    switch (token.type) {
        case 'text':
            return [{ type: 'text', text: (token as Tokens.Text).text }];
        case 'strong':
            return convertMarkedText(token as Tokens.Strong, { type: 'strong' });
        case 'em':
            return convertMarkedText(token as Tokens.Em, { type: 'em' });
        case 'codespan':
            return [{
                type: 'text',
                text: (token as Tokens.Codespan).text,
                marks: [{ type: 'code' }]
            }];
        case 'link':
            return convertLink(token as Tokens.Link);
        case 'br':
            return [{ type: 'hardBreak' }];
        case 'del':
            return convertMarkedText(token as Tokens.Del, { type: 'strike' });
        case 'escape':
            return [{ type: 'text', text: (token as Tokens.Escape).text }];
        default:
            if ('text' in token && typeof token.text === 'string') {
                return [{ type: 'text', text: token.text }];
            }
            return [];
    }
}

function convertMarkedText(token: Tokens.Strong | Tokens.Em | Tokens.Del, mark: AdfMark): AdfNode[] {
    const innerNodes = convertInlineTokens(token.tokens || []);
    return innerNodes.map(node => {
        if (node.type === 'text') {
            return {
                ...node,
                marks: [...(node.marks || []), mark]
            };
        }
        return node;
    });
}

function convertLink(token: Tokens.Link): AdfNode[] {
    const innerNodes = convertInlineTokens(token.tokens || []);
    const linkMark: AdfMark = {
        type: 'link',
        attrs: { href: token.href }
    };
    
    if (innerNodes.length === 0) {
        return [{
            type: 'text',
            text: token.text || token.href,
            marks: [linkMark]
        }];
    }
    
    return innerNodes.map(node => {
        if (node.type === 'text') {
            return {
                ...node,
                marks: [...(node.marks || []), linkMark]
            };
        }
        return node;
    });
}


