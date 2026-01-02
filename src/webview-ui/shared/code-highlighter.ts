import { css } from 'lit';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import python from 'highlight.js/lib/languages/python';
import java from 'highlight.js/lib/languages/java';
import json from 'highlight.js/lib/languages/json';
import xml from 'highlight.js/lib/languages/xml';
import cssLang from 'highlight.js/lib/languages/css';
import bash from 'highlight.js/lib/languages/bash';
import sql from 'highlight.js/lib/languages/sql';
import yaml from 'highlight.js/lib/languages/yaml';
import markdown from 'highlight.js/lib/languages/markdown';
import go from 'highlight.js/lib/languages/go';
import rust from 'highlight.js/lib/languages/rust';
import csharp from 'highlight.js/lib/languages/csharp';
import cpp from 'highlight.js/lib/languages/cpp';
import ruby from 'highlight.js/lib/languages/ruby';
import php from 'highlight.js/lib/languages/php';
import kotlin from 'highlight.js/lib/languages/kotlin';
import swift from 'highlight.js/lib/languages/swift';
import scala from 'highlight.js/lib/languages/scala';
import plaintext from 'highlight.js/lib/languages/plaintext';

hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('js', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('ts', typescript);
hljs.registerLanguage('python', python);
hljs.registerLanguage('py', python);
hljs.registerLanguage('java', java);
hljs.registerLanguage('json', json);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('html', xml);
hljs.registerLanguage('css', cssLang);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('sh', bash);
hljs.registerLanguage('shell', bash);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('yaml', yaml);
hljs.registerLanguage('yml', yaml);
hljs.registerLanguage('markdown', markdown);
hljs.registerLanguage('md', markdown);
hljs.registerLanguage('go', go);
hljs.registerLanguage('golang', go);
hljs.registerLanguage('rust', rust);
hljs.registerLanguage('rs', rust);
hljs.registerLanguage('csharp', csharp);
hljs.registerLanguage('cs', csharp);
hljs.registerLanguage('cpp', cpp);
hljs.registerLanguage('c++', cpp);
hljs.registerLanguage('c', cpp);
hljs.registerLanguage('ruby', ruby);
hljs.registerLanguage('rb', ruby);
hljs.registerLanguage('php', php);
hljs.registerLanguage('kotlin', kotlin);
hljs.registerLanguage('kt', kotlin);
hljs.registerLanguage('swift', swift);
hljs.registerLanguage('scala', scala);
hljs.registerLanguage('plaintext', plaintext);
hljs.registerLanguage('text', plaintext);

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function highlightCode(code: string, language: string): string {
  if (language && hljs.getLanguage(language)) {
    return hljs.highlight(code, { language }).value;
  }
  return escapeHtml(code);
}

export const codeHighlightStyles = css`
  .hljs {
    display: block;
    overflow-x: auto;
  }

  .hljs-comment,
  .hljs-quote {
    color: var(--vscode-editorLineNumber-foreground, #6a9955);
    font-style: italic;
  }

  .hljs-keyword,
  .hljs-selector-tag,
  .hljs-addition {
    color: var(--vscode-symbolIcon-keywordForeground, #569cd6);
  }

  .hljs-string,
  .hljs-meta .hljs-string,
  .hljs-regexp,
  .hljs-selector-attr,
  .hljs-selector-pseudo {
    color: var(--vscode-symbolIcon-stringForeground, #ce9178);
  }

  .hljs-number,
  .hljs-literal,
  .hljs-variable,
  .hljs-template-variable,
  .hljs-tag .hljs-attr {
    color: var(--vscode-symbolIcon-numberForeground, #b5cea8);
  }

  .hljs-type,
  .hljs-class .hljs-title,
  .hljs-title.class_,
  .hljs-title.class_.inherited__ {
    color: var(--vscode-symbolIcon-classForeground, #4ec9b0);
  }

  .hljs-function,
  .hljs-title.function_,
  .hljs-section {
    color: var(--vscode-symbolIcon-functionForeground, #dcdcaa);
  }

  .hljs-name,
  .hljs-tag {
    color: var(--vscode-symbolIcon-colorForeground, #569cd6);
  }

  .hljs-attr,
  .hljs-attribute {
    color: var(--vscode-symbolIcon-propertyForeground, #9cdcfe);
  }

  .hljs-built_in,
  .hljs-builtin-name {
    color: var(--vscode-symbolIcon-keywordForeground, #4fc1ff);
  }

  .hljs-params {
    color: var(--vscode-symbolIcon-variableForeground, #9cdcfe);
  }

  .hljs-symbol,
  .hljs-bullet,
  .hljs-link {
    color: var(--vscode-symbolIcon-enumeratorForeground, #d4d4d4);
  }

  .hljs-meta,
  .hljs-meta .hljs-keyword {
    color: var(--vscode-symbolIcon-keywordForeground, #c586c0);
  }

  .hljs-deletion {
    color: var(--vscode-gitDecoration-deletedResourceForeground, #f44747);
  }

  .hljs-doctag,
  .hljs-strong {
    font-weight: bold;
  }

  .hljs-emphasis {
    font-style: italic;
  }
`;
