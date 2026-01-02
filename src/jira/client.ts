import { AuthService } from './auth';
import { JiraSearchResponse, JiraError, JiraFilter, JiraIssue, JiraTransition, JiraComment, JiraCommentsPage } from './types';
import { Result, ok, err } from '../core/result';

export class JiraClientError extends Error {
    constructor(
        message: string,
        public readonly statusCode?: number,
        public readonly jiraErrors?: JiraError
    ) {
        super(message);
        this.name = 'JiraClientError';
    }
}

interface RequestOptions {
    method?: string;
    body?: unknown;
    queryParams?: Record<string, string>;
}

export class JiraClient {
    constructor(private readonly authService: AuthService) {}

    private async request<T>(
        path: string,
        options: RequestOptions = {}
    ): Promise<Result<T, JiraClientError>> {
        const credentials = await this.authService.getCredentials();
        if (!credentials) {
            return err(new JiraClientError('No credentials configured'));
        }

        const { baseUrl, email, apiToken } = credentials;
        const url = new URL(path, baseUrl);

        if (options.queryParams) {
            for (const [key, value] of Object.entries(options.queryParams)) {
                url.searchParams.set(key, value);
            }
        }

        const authHeader = Buffer.from(`${email}:${apiToken}`).toString('base64');
        const headers: Record<string, string> = {
            'Authorization': `Basic ${authHeader}`,
            'Accept': 'application/json'
        };

        if (options.body) {
            headers['Content-Type'] = 'application/json';
        }

        try {
            const response = await fetch(url.toString(), {
                method: options.method || 'GET',
                headers,
                body: options.body ? JSON.stringify(options.body) : undefined
            });

            if (!response.ok) {
                let jiraErrors: JiraError | undefined;
                try {
                    jiraErrors = await response.json() as JiraError;
                } catch {
                    // Response may not be JSON
                }

                const status = response.status;
                if (status === 401) {
                    return err(new JiraClientError('Authentication failed. Please check your credentials.', status, jiraErrors));
                }
                if (status === 403) {
                    return err(new JiraClientError('Access denied. Please check your permissions.', status, jiraErrors));
                }
                if (status === 404) {
                    return err(new JiraClientError('Resource not found.', status, jiraErrors));
                }

                const errorMessage = jiraErrors?.errorMessages?.join(', ') || `Request failed with status ${status}`;
                return err(new JiraClientError(errorMessage, status, jiraErrors));
            }

            const text = await response.text();
            if (!text) {
                return ok(undefined as T);
            }
            return ok(JSON.parse(text) as T);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return err(new JiraClientError(message));
        }
    }

    async searchIssues(jql: string, maxResults: number = 50): Promise<Result<JiraSearchResponse, JiraClientError>> {
        return this.request<JiraSearchResponse>('/rest/api/3/search/jql', {
            queryParams: {
                jql,
                maxResults: maxResults.toString(),
                fields: 'summary,status,assignee,reporter,priority,issuetype,created,updated,labels'
            }
        });
    }

    async testConnection(): Promise<Result<void, JiraClientError>> {
        const credentials = await this.authService.getCredentials();
        if (!credentials) {
            return err(new JiraClientError('No credentials configured'));
        }

        const { baseUrl, email, apiToken } = credentials;
        const url = new URL('/rest/api/3/myself', baseUrl);
        const authHeader = Buffer.from(`${email}:${apiToken}`).toString('base64');

        try {
            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: {
                    'Authorization': `Basic ${authHeader}`,
                    'Accept': 'application/json'
                }
            });

            if (response.ok) {
                return ok(undefined);
            }

            if (response.status === 401) {
                return err(new JiraClientError('Invalid credentials. Check your email and API token.', response.status));
            }
            if (response.status === 403) {
                return err(new JiraClientError('Access denied. Check your permissions.', response.status));
            }
            if (response.status === 404) {
                return err(new JiraClientError('Jira instance not found. Check your URL.', response.status));
            }

            return err(new JiraClientError(`Connection failed with status ${response.status}`, response.status));
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            if (message.includes('fetch') || message.includes('network')) {
                return err(new JiraClientError('Network error. Check your URL and internet connection.'));
            }
            return err(new JiraClientError(message));
        }
    }

    async getFilters(): Promise<Result<JiraFilter[], JiraClientError>> {
        return this.request<JiraFilter[]>('/rest/api/3/filter/my');
    }

    async getFilterById(filterId: string): Promise<Result<JiraFilter, JiraClientError>> {
        return this.request<JiraFilter>(`/rest/api/3/filter/${filterId}`);
    }

    async getIssue(issueKey: string): Promise<Result<JiraIssue, JiraClientError>> {
        return this.request<JiraIssue>(`/rest/api/3/issue/${issueKey}`, {
            queryParams: {
                fields: 'summary,status,assignee,reporter,priority,issuetype,created,updated,labels,description,attachment'
            }
        });
    }

    async downloadAttachment(contentUrl: string): Promise<Result<Buffer, JiraClientError>> {
        const credentials = await this.authService.getCredentials();
        if (!credentials) {
            return err(new JiraClientError('No credentials configured'));
        }

        const { email, apiToken } = credentials;
        const authHeader = Buffer.from(`${email}:${apiToken}`).toString('base64');

        try {
            const response = await fetch(contentUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Basic ${authHeader}`,
                }
            });

            if (!response.ok) {
                return err(new JiraClientError(`Failed to download attachment: ${response.status}`, response.status));
            }

            const arrayBuffer = await response.arrayBuffer();
            return ok(Buffer.from(arrayBuffer));
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return err(new JiraClientError(message));
        }
    }

    async getTransitions(issueKey: string): Promise<Result<JiraTransition[], JiraClientError>> {
        const result = await this.request<{ transitions: JiraTransition[] }>(`/rest/api/3/issue/${issueKey}/transitions`);
        if (!result.success) {
            return result;
        }
        return ok(result.data.transitions);
    }

    async transitionIssue(issueKey: string, transitionId: string): Promise<Result<void, JiraClientError>> {
        return this.request<void>(`/rest/api/3/issue/${issueKey}/transitions`, {
            method: 'POST',
            body: { transition: { id: transitionId } }
        });
    }

    async getComments(issueKey: string): Promise<Result<JiraComment[], JiraClientError>> {
        const result = await this.request<JiraCommentsPage>(`/rest/api/3/issue/${issueKey}/comment`, {
            queryParams: { orderBy: '-created', maxResults: '100' }
        });
        if (!result.success) {
            return result;
        }
        return ok(result.data.comments);
    }
}
