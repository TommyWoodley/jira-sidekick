import { LitElement, html, css, TemplateResult, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { AdfNode, AdfMark } from '@shared/models';

@customElement('adf-renderer')
export class AdfRenderer extends LitElement {
  static styles = css`
    :host {
      display: block;
      line-height: 1.6;
    }

    p {
      margin: 0 0 12px;
    }

    h1, h2, h3, h4, h5, h6 {
      margin: 16px 0 8px;
      font-weight: 600;
    }

    h1 { font-size: 1.5em; }
    h2 { font-size: 1.3em; }
    h3 { font-size: 1.15em; }
    h4, h5, h6 { font-size: 1em; }

    ul, ol {
      margin: 8px 0;
      padding-left: 24px;
    }

    li {
      margin: 4px 0;
    }

    pre {
      background: var(--vscode-textCodeBlock-background);
      padding: 12px;
      border-radius: 4px;
      overflow-x: auto;
      margin: 12px 0;
    }

    code {
      background: var(--vscode-textCodeBlock-background);
      padding: 2px 6px;
      border-radius: 3px;
      font-family: var(--vscode-editor-font-family);
      font-size: 0.9em;
    }

    pre code {
      background: none;
      padding: 0;
    }

    blockquote {
      margin: 12px 0;
      padding: 8px 16px;
      border-left: 3px solid var(--vscode-textBlockQuote-border);
      background: var(--vscode-textBlockQuote-background);
      color: var(--vscode-descriptionForeground);
    }

    blockquote p:last-child {
      margin-bottom: 0;
    }

    hr {
      border: none;
      border-top: 1px solid var(--vscode-panel-border);
      margin: 16px 0;
    }

    a {
      color: var(--vscode-textLink-foreground);
      text-decoration: none;
    }

    a:hover {
      text-decoration: underline;
    }

    table {
      border-collapse: collapse;
      margin: 12px 0;
      width: 100%;
    }

    th, td {
      border: 1px solid var(--vscode-panel-border);
      padding: 8px 12px;
      text-align: left;
    }

    th {
      background: var(--vscode-sideBar-background);
      font-weight: 600;
    }

    .panel {
      margin: 12px 0;
      padding: 12px 16px;
      border-radius: 4px;
      border-left: 4px solid;
    }

    .panel-info {
      background: var(--vscode-textBlockQuote-background);
      border-left-color: var(--vscode-textLink-foreground);
    }

    .panel-note {
      background: var(--vscode-textBlockQuote-background);
      border-left-color: #6554c0;
    }

    .panel-warning {
      background: rgba(255, 171, 0, 0.1);
      border-left-color: #ffab00;
    }

    .panel-error {
      background: var(--vscode-inputValidation-errorBackground);
      border-left-color: var(--vscode-inputValidation-errorBorder);
    }

    .panel-success {
      background: rgba(54, 179, 126, 0.1);
      border-left-color: #36b37e;
    }

    .panel-title {
      font-weight: 600;
      margin-bottom: 4px;
      text-transform: uppercase;
      font-size: 0.75em;
      letter-spacing: 0.5px;
    }

    details {
      margin: 12px 0;
      border: 1px solid var(--vscode-panel-border);
      border-radius: 4px;
    }

    summary {
      padding: 8px 12px;
      cursor: pointer;
      background: var(--vscode-sideBar-background);
      font-weight: 500;
    }

    details[open] summary {
      border-bottom: 1px solid var(--vscode-panel-border);
    }

    details > :not(summary) {
      padding: 12px;
    }

    .mention {
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 0.9em;
    }

    .media-placeholder {
      display: inline-block;
      padding: 8px 12px;
      background: var(--vscode-sideBar-background);
      border: 1px dashed var(--vscode-panel-border);
      border-radius: 4px;
      color: var(--vscode-descriptionForeground);
      font-size: 0.85em;
      font-style: italic;
      margin: 4px 0;
    }

    .inline-image {
      max-width: 100%;
      height: auto;
      border-radius: 4px;
      margin: 8px 0;
      display: block;
    }

    .inline-card {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      background: var(--vscode-sideBar-background);
      border-radius: 3px;
      font-size: 0.9em;
    }

    .inline-card::before {
      content: '🔗';
    }
  `;

  @property({ type: Object }) adf: AdfNode | null = null;
  @property({ type: Object }) imageMap: Record<string, string> = {};

  render() {
    if (!this.adf) {
      return html`<p class="no-content">No content</p>`;
    }

    return this.renderNode(this.adf);
  }

  private renderNode(node: AdfNode): TemplateResult | typeof nothing {
    switch (node.type) {
      case 'doc':
        return html`${node.content?.map(child => this.renderNode(child))}`;

      case 'paragraph':
        return html`<p>${this.renderChildren(node)}</p>`;

      case 'heading': {
        const level = (node.attrs?.level as number) || 1;
        const content = this.renderChildren(node);
        switch (level) {
          case 1: return html`<h1>${content}</h1>`;
          case 2: return html`<h2>${content}</h2>`;
          case 3: return html`<h3>${content}</h3>`;
          case 4: return html`<h4>${content}</h4>`;
          case 5: return html`<h5>${content}</h5>`;
          default: return html`<h6>${content}</h6>`;
        }
      }

      case 'bulletList':
        return html`<ul>${node.content?.map(child => this.renderNode(child))}</ul>`;

      case 'orderedList':
        return html`<ol>${node.content?.map(child => this.renderNode(child))}</ol>`;

      case 'listItem':
        return html`<li>${node.content?.map(child => this.renderNode(child))}</li>`;

      case 'codeBlock': {
        const language = (node.attrs?.language as string) || '';
        const code = node.content?.map(n => n.text || '').join('') || '';
        return html`<pre><code class="language-${language}">${code}</code></pre>`;
      }

      case 'blockquote':
        return html`<blockquote>${node.content?.map(child => this.renderNode(child))}</blockquote>`;

      case 'rule':
        return html`<hr>`;

      case 'hardBreak':
        return html`<br>`;

      case 'table':
        return html`<table>${node.content?.map(child => this.renderNode(child))}</table>`;

      case 'tableRow':
        return html`<tr>${node.content?.map(child => this.renderNode(child))}</tr>`;

      case 'tableHeader':
        return html`<th>${node.content?.map(child => this.renderNode(child))}</th>`;

      case 'tableCell':
        return html`<td>${node.content?.map(child => this.renderNode(child))}</td>`;

      case 'mediaSingle': {
        // mediaSingle contains a media child node
        const mediaChild = node.content?.find(n => n.type === 'media');
        if (mediaChild) {
          return this.renderMediaNode(mediaChild);
        }
        return html`<div class="media-placeholder">📎 Media attachment</div>`;
      }

      case 'media':
        return this.renderMediaNode(node);

      case 'panel': {
        const panelType = (node.attrs?.panelType as string) || 'info';
        return html`
          <div class="panel panel-${panelType}">
            <div class="panel-title">${panelType}</div>
            ${node.content?.map(child => this.renderNode(child))}
          </div>
        `;
      }

      case 'expand': {
        const title = (node.attrs?.title as string) || 'Details';
        return html`
          <details>
            <summary>${title}</summary>
            <div>${node.content?.map(child => this.renderNode(child))}</div>
          </details>
        `;
      }

      case 'text':
        return this.renderText(node);

      case 'mention': {
        const text = (node.attrs?.text as string) || '@user';
        return html`<span class="mention">${text}</span>`;
      }

      case 'emoji': {
        const shortName = (node.attrs?.shortName as string) || '';
        return html`<span>${shortName}</span>`;
      }

      case 'inlineCard': {
        const url = (node.attrs?.url as string) || '';
        return html`<a href="${url}" class="inline-card">${this.truncateUrl(url)}</a>`;
      }

      default:
        // Unknown node type - try to render children if present
        if (node.content) {
          return html`${node.content.map(child => this.renderNode(child))}`;
        }
        return nothing;
    }
  }

  private renderMediaNode(node: AdfNode): TemplateResult {
    const id = node.attrs?.id as string;
    if (id && this.imageMap[id]) {
      return html`<img src="${this.imageMap[id]}" class="inline-image" alt="Image" />`;
    }
    return html`<div class="media-placeholder">📎 Media attachment</div>`;
  }

  private renderChildren(node: AdfNode): TemplateResult | string {
    if (!node.content) {
      return '';
    }
    return html`${node.content.map(child => this.renderNode(child))}`;
  }

  private renderText(node: AdfNode): TemplateResult {
    const text = node.text || '';
    if (!node.marks || node.marks.length === 0) {
      return html`${text}`;
    }

    // Apply marks by wrapping text in appropriate elements
    return this.applyMarks(text, node.marks);
  }

  private applyMarks(text: string, marks: AdfMark[]): TemplateResult {
    // Build nested template from inside out
    let result: TemplateResult | string = text;

    for (const mark of marks) {
      result = this.wrapWithMark(result, mark);
    }

    return html`${result}`;
  }

  private wrapWithMark(content: TemplateResult | string, mark: AdfMark): TemplateResult {
    switch (mark.type) {
      case 'strong':
        return html`<strong>${content}</strong>`;
      case 'em':
        return html`<em>${content}</em>`;
      case 'strike':
        return html`<del>${content}</del>`;
      case 'code':
        return html`<code>${content}</code>`;
      case 'underline':
        return html`<u>${content}</u>`;
      case 'link': {
        const href = (mark.attrs?.href as string) || '';
        return html`<a href="${href}">${content}</a>`;
      }
      case 'subsup': {
        const type = mark.attrs?.type as string;
        if (type === 'sup') {
          return html`<sup>${content}</sup>`;
        }
        return html`<sub>${content}</sub>`;
      }
      case 'textColor': {
        const color = (mark.attrs?.color as string) || '';
        return html`<span style="color: ${color}">${content}</span>`;
      }
      case 'backgroundColor': {
        const color = (mark.attrs?.color as string) || '';
        return html`<span style="background-color: ${color}">${content}</span>`;
      }
      default:
        return html`${content}`;
    }
  }

  private truncateUrl(url: string): string {
    try {
      const parsed = new URL(url);
      const path = parsed.pathname;
      if (path.length > 30) {
        return parsed.hostname + '/...' + path.slice(-20);
      }
      return parsed.hostname + path;
    } catch {
      return url.length > 50 ? url.slice(0, 47) + '...' : url;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'adf-renderer': AdfRenderer;
  }
}

