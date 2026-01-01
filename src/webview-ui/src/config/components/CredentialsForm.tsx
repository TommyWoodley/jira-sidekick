import type { JiraCredentials } from '../../shared';

interface CredentialsFormProps {
  credentials: JiraCredentials;
  onChange: (credentials: JiraCredentials) => void;
  onTest: () => void;
  onSave: (e: React.FormEvent) => void;
  onOpenTokenPage: () => void;
  isLoading: boolean;
}

export function CredentialsForm({
  credentials,
  onChange,
  onTest,
  onSave,
  onOpenTokenPage,
  isLoading,
}: CredentialsFormProps) {
  return (
    <form onSubmit={onSave}>
      <div className="form-group">
        <label htmlFor="baseUrl">Jira URL</label>
        <input
          type="url"
          id="baseUrl"
          placeholder="https://your-domain.atlassian.net"
          value={credentials.baseUrl}
          onChange={(e) =>
            onChange({ ...credentials, baseUrl: e.target.value.trim().replace(/\/$/, '') })
          }
          required
        />
        <p className="help-text">Your Jira Cloud instance URL</p>
      </div>

      <div className="form-group">
        <label htmlFor="email">Email</label>
        <input
          type="email"
          id="email"
          placeholder="you@example.com"
          value={credentials.email}
          onChange={(e) => onChange({ ...credentials, email: e.target.value.trim() })}
          required
        />
        <p className="help-text">The email you use to log in to Jira</p>
      </div>

      <div className="form-group">
        <label htmlFor="apiToken">API Token</label>
        <button type="button" className="token-link" onClick={onOpenTokenPage}>
          Get API Token from Atlassian →
        </button>
        <input
          type="password"
          id="apiToken"
          placeholder="Paste your API token here"
          value={credentials.apiToken}
          onChange={(e) => onChange({ ...credentials, apiToken: e.target.value.trim() })}
          required
        />
        <p className="help-text">
          Create a token at{' '}
          <a href="#" onClick={(e) => { e.preventDefault(); onOpenTokenPage(); }}>
            id.atlassian.com
          </a>
          , copy it, and paste above
        </p>
      </div>

      <div className="button-row">
        <button
          type="button"
          className="btn-secondary"
          onClick={onTest}
          disabled={isLoading}
        >
          {isLoading ? 'Testing...' : 'Test Connection'}
        </button>
        <button type="submit" className="btn-primary" disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Save Credentials'}
        </button>
      </div>
    </form>
  );
}

