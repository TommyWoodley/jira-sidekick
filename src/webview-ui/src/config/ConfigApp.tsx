import { useState, useCallback, useEffect } from 'react';
import { postMessage, useVsCodeMessage, type JiraFilter, type JiraCredentials } from '../shared';
import { CredentialsForm } from './components/CredentialsForm';
import { FilterPicker } from './components/FilterPicker';

interface LoadCredentialsMessage {
  command: 'loadCredentials';
  data: { baseUrl: string; email: string; apiToken: string } | null;
  selectedFilter: string | null;
}

interface TestResultMessage {
  command: 'testResult';
  success: boolean;
  message: string;
}

interface SaveResultMessage {
  command: 'saveResult';
  success: boolean;
  message: string;
}

interface FiltersLoadedMessage {
  command: 'filtersLoaded';
  filters: JiraFilter[];
  selectedFilter: string | null;
}

interface FiltersErrorMessage {
  command: 'filtersError';
  message: string;
}

type ExtensionMessage =
  | LoadCredentialsMessage
  | TestResultMessage
  | SaveResultMessage
  | FiltersLoadedMessage
  | FiltersErrorMessage;

export function ConfigApp() {
  const [credentials, setCredentials] = useState<JiraCredentials>({
    baseUrl: '',
    email: '',
    apiToken: '',
  });
  const [message, setMessage] = useState<{ text: string; isSuccess: boolean } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<JiraFilter[]>([]);
  const [selectedFilterId, setSelectedFilterId] = useState<string | null>(null);
  const [filtersError, setFiltersError] = useState<string | null>(null);

  const handleMessage = useCallback((msg: ExtensionMessage) => {
    switch (msg.command) {
      case 'loadCredentials':
        if (msg.data) {
          setCredentials({
            baseUrl: msg.data.baseUrl || '',
            email: msg.data.email || '',
            apiToken: '',
          });
        }
        if (msg.selectedFilter) {
          setSelectedFilterId(msg.selectedFilter);
        }
        if (msg.data?.baseUrl && msg.data?.email) {
          postMessage({ command: 'loadFilters' });
        }
        break;
      case 'testResult':
        setIsLoading(false);
        setMessage({ text: msg.message, isSuccess: msg.success });
        if (msg.success) {
          setShowFilters(true);
        }
        break;
      case 'saveResult':
        setIsLoading(false);
        setMessage({ text: msg.message, isSuccess: msg.success });
        if (msg.success) {
          setShowFilters(true);
        }
        break;
      case 'filtersLoaded':
        setFilters(msg.filters || []);
        if (msg.selectedFilter) {
          setSelectedFilterId(msg.selectedFilter);
        }
        setShowFilters(true);
        setFiltersError(null);
        break;
      case 'filtersError':
        setFiltersError(msg.message);
        break;
    }
  }, []);

  useVsCodeMessage(handleMessage);

  useEffect(() => {
    postMessage({ command: 'load' });
  }, []);

  const handleTest = () => {
    if (!credentials.baseUrl || !credentials.email || !credentials.apiToken) {
      setMessage({ text: 'Please fill in all fields', isSuccess: false });
      return;
    }
    setIsLoading(true);
    postMessage({ command: 'test', data: credentials });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!credentials.baseUrl || !credentials.email || !credentials.apiToken) {
      setMessage({ text: 'Please fill in all fields', isSuccess: false });
      return;
    }
    setIsLoading(true);
    postMessage({ command: 'save', data: credentials });
  };

  const handleOpenTokenPage = () => {
    postMessage({ command: 'openTokenPage' });
  };

  const handleSaveFilter = () => {
    postMessage({ command: 'saveFilter', filterId: selectedFilterId });
  };

  return (
    <div className="config-container">
      <h1>Configure Jira Sidekick</h1>
      <p className="subtitle">Connect to your Jira Cloud instance</p>

      <CredentialsForm
        credentials={credentials}
        onChange={setCredentials}
        onTest={handleTest}
        onSave={handleSave}
        onOpenTokenPage={handleOpenTokenPage}
        isLoading={isLoading}
      />

      {message && (
        <div className={`message ${message.isSuccess ? 'success' : 'error'}`}>
          {message.text}
        </div>
      )}

      {showFilters && (
        <FilterPicker
          filters={filters}
          selectedFilterId={selectedFilterId}
          onSelectFilter={setSelectedFilterId}
          onSave={handleSaveFilter}
          error={filtersError}
        />
      )}
    </div>
  );
}

