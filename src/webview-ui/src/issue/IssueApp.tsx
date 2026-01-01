import { useState, useCallback } from 'react';
import { postMessage, useVsCodeMessage, type JiraIssue } from '../shared';
import { Loading } from './components/Loading';
import { ErrorDisplay } from './components/ErrorDisplay';
import { IssueDetail } from './components/IssueDetail';

type ViewState = 
  | { type: 'loading'; issueKey: string }
  | { type: 'error'; issueKey: string; message: string }
  | { type: 'loaded'; issue: JiraIssue };

interface LoadIssueMessage {
  command: 'loadIssue';
  issue: JiraIssue;
}

interface LoadingMessage {
  command: 'loading';
  issueKey: string;
}

interface ErrorMessage {
  command: 'error';
  issueKey: string;
  message: string;
}

type ExtensionMessage = LoadIssueMessage | LoadingMessage | ErrorMessage;

export function IssueApp() {
  const [viewState, setViewState] = useState<ViewState>({
    type: 'loading',
    issueKey: '...',
  });

  const handleMessage = useCallback((message: ExtensionMessage) => {
    switch (message.command) {
      case 'loading':
        setViewState({ type: 'loading', issueKey: message.issueKey });
        break;
      case 'error':
        setViewState({
          type: 'error',
          issueKey: message.issueKey,
          message: message.message,
        });
        break;
      case 'loadIssue':
        setViewState({ type: 'loaded', issue: message.issue });
        break;
    }
  }, []);

  useVsCodeMessage(handleMessage);

  const handleRefresh = () => postMessage({ command: 'refresh' });
  const handleOpenInBrowser = () => postMessage({ command: 'openInBrowser' });

  switch (viewState.type) {
    case 'loading':
      return <Loading issueKey={viewState.issueKey} />;
    case 'error':
      return (
        <ErrorDisplay
          issueKey={viewState.issueKey}
          message={viewState.message}
          onRetry={handleRefresh}
        />
      );
    case 'loaded':
      return (
        <IssueDetail
          issue={viewState.issue}
          onRefresh={handleRefresh}
          onOpenInBrowser={handleOpenInBrowser}
        />
      );
  }
}

