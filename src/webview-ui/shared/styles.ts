import { css } from 'lit';

export const sharedStyles = css`
  :host {
    display: block;
    font-family: var(--vscode-font-family);
    color: var(--vscode-foreground);
  }

  .help-text {
    font-size: 0.85em;
    color: var(--vscode-descriptionForeground);
    margin-top: 0.5em;
  }

  .help-text a {
    color: var(--vscode-textLink-foreground);
    text-decoration: none;
  }

  .help-text a:hover {
    text-decoration: underline;
  }

  .message {
    padding: 10px;
    border-radius: 4px;
    margin-top: 1em;
  }

  .message.success {
    background: var(--vscode-testing-iconPassed);
    color: white;
  }

  .message.error {
    background: var(--vscode-testing-iconFailed);
    color: white;
  }
`;


