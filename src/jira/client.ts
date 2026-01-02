import { AuthService } from './auth';
import { JiraSearchResponse, JiraError, JiraFilter, JiraIssue, JiraTransition } from './types';
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

export class JiraClient {
    constructor(private readonly authService: AuthService) {}

    async searchIssues(jql: string, maxResults: number = 50): Promise<Result<JiraSearchResponse, JiraClientError>> {
        const credentials = await this.authService.getCredentials();
        if (!credentials) {
            return err(new JiraClientError('No credentials configured'));
        }

        const { baseUrl, email, apiToken } = credentials;
        const url = new URL('/rest/api/3/search/jql', baseUrl);
        url.searchParams.set('jql', jql);
        url.searchParams.set('maxResults', maxResults.toString());
        url.searchParams.set('fields', 'summary,status,assignee,reporter,priority,issuetype,created,updated,labels');

        const authHeader = Buffer.from(`${email}:${apiToken}`).toString('base64');

        try {
            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: {
                    'Authorization': `Basic ${authHeader}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                let jiraErrors: JiraError | undefined;
                try {
                    jiraErrors = await response.json() as JiraError;
                } catch {
                    // Response may not be JSON
                }

                if (response.status === 401) {
                    return err(new JiraClientError('Authentication failed. Please check your credentials.', response.status, jiraErrors));
                }
                if (response.status === 403) {
                    return err(new JiraClientError('Access denied. Please check your permissions.', response.status, jiraErrors));
                }

                const errorMessage = jiraErrors?.errorMessages?.join(', ') || `Request failed with status ${response.status}`;
                return err(new JiraClientError(errorMessage, response.status, jiraErrors));
            }

            return ok(await response.json() as JiraSearchResponse);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return err(new JiraClientError(message));
        }
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
        const credentials = await this.authService.getCredentials();
        if (!credentials) {
            return err(new JiraClientError('No credentials configured'));
        }

        const { baseUrl, email, apiToken } = credentials;
        const url = new URL('/rest/api/3/filter/my', baseUrl);
        const authHeader = Buffer.from(`${email}:${apiToken}`).toString('base64');

        try {
            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: {
                    'Authorization': `Basic ${authHeader}`,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                return err(new JiraClientError(`Failed to fetch filters: ${response.status}`, response.status));
            }

            const data = await response.json() as JiraFilter[];
            return ok(data);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return err(new JiraClientError(message));
        }
    }

    async getFilterById(filterId: string): Promise<Result<JiraFilter, JiraClientError>> {
        const credentials = await this.authService.getCredentials();
        if (!credentials) {
            return err(new JiraClientError('No credentials configured'));
        }

        const { baseUrl, email, apiToken } = credentials;
        const url = new URL(`/rest/api/3/filter/${filterId}`, baseUrl);
        const authHeader = Buffer.from(`${email}:${apiToken}`).toString('base64');

        try {
            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: {
                    'Authorization': `Basic ${authHeader}`,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                if (response.status === 404) {
                    return err(new JiraClientError(`Filter ${filterId} not found`, response.status));
                }
                return err(new JiraClientError(`Failed to fetch filter: ${response.status}`, response.status));
            }

            return ok(await response.json() as JiraFilter);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return err(new JiraClientError(message));
        }
    }

    async getIssue(issueKey: string): Promise<Result<JiraIssue, JiraClientError>> {
        const credentials = await this.authService.getCredentials();
        if (!credentials) {
            return err(new JiraClientError('No credentials configured'));
        }

        const { baseUrl, email, apiToken } = credentials;
        const url = new URL(`/rest/api/3/issue/${issueKey}`, baseUrl);
        url.searchParams.set('fields', 'summary,status,assignee,reporter,priority,issuetype,created,updated,labels,description,attachment');
        const authHeader = Buffer.from(`${email}:${apiToken}`).toString('base64');

        try {
            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: {
                    'Authorization': `Basic ${authHeader}`,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                let jiraErrors: JiraError | undefined;
                try {
                    jiraErrors = await response.json() as JiraError;
                } catch {
                    // Response may not be JSON
                }

                if (response.status === 404) {
                    return err(new JiraClientError(`Issue ${issueKey} not found`, response.status, jiraErrors));
                }

                const errorMessage = jiraErrors?.errorMessages?.join(', ') || `Request failed with status ${response.status}`;
                return err(new JiraClientError(errorMessage, response.status, jiraErrors));
            }

            return ok(await response.json() as JiraIssue);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return err(new JiraClientError(message));
        }
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
        const credentials = await this.authService.getCredentials();
        if (!credentials) {
            return err(new JiraClientError('No credentials configured'));
        }

        const { baseUrl, email, apiToken } = credentials;
        const url = new URL(`/rest/api/3/issue/${issueKey}/transitions`, baseUrl);
        const authHeader = Buffer.from(`${email}:${apiToken}`).toString('base64');

        try {
            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: {
                    'Authorization': `Basic ${authHeader}`,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                let jiraErrors: JiraError | undefined;
                try {
                    jiraErrors = await response.json() as JiraError;
                } catch {
                    // Response may not be JSON
                }

                if (response.status === 404) {
                    return err(new JiraClientError(`Issue ${issueKey} not found`, response.status, jiraErrors));
                }
                if (response.status === 403) {
                    return err(new JiraClientError('You do not have permission to view transitions for this issue.', response.status, jiraErrors));
                }

                const errorMessage = jiraErrors?.errorMessages?.join(', ') || `Failed to get transitions: ${response.status}`;
                return err(new JiraClientError(errorMessage, response.status, jiraErrors));
            }

            const data = await response.json() as { transitions: JiraTransition[] };
            return ok(data.transitions);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return err(new JiraClientError(message));
        }
    }

    async transitionIssue(issueKey: string, transitionId: string): Promise<Result<void, JiraClientError>> {
        const credentials = await this.authService.getCredentials();
        if (!credentials) {
            return err(new JiraClientError('No credentials configured'));
        }

        const { baseUrl, email, apiToken } = credentials;
        const url = new URL(`/rest/api/3/issue/${issueKey}/transitions`, baseUrl);
        const authHeader = Buffer.from(`${email}:${apiToken}`).toString('base64');

        try {
            const response = await fetch(url.toString(), {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${authHeader}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    transition: { id: transitionId }
                })
            });

            if (!response.ok) {
                let jiraErrors: JiraError | undefined;
                try {
                    jiraErrors = await response.json() as JiraError;
                } catch {
                    // Response may not be JSON
                }

                if (response.status === 404) {
                    return err(new JiraClientError(`Issue ${issueKey} not found`, response.status, jiraErrors));
                }
                if (response.status === 403) {
                    return err(new JiraClientError('You do not have permission to transition this issue.', response.status, jiraErrors));
                }
                if (response.status === 400) {
                    const errorMessage = jiraErrors?.errorMessages?.join(', ') || 'Invalid transition. The issue may have changed.';
                    return err(new JiraClientError(errorMessage, response.status, jiraErrors));
                }

                const errorMessage = jiraErrors?.errorMessages?.join(', ') || `Failed to transition issue: ${response.status}`;
                return err(new JiraClientError(errorMessage, response.status, jiraErrors));
            }

            return ok(undefined);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return err(new JiraClientError(message));
        }
    }
}
