import { AuthService } from './auth';
import { JiraSearchResponse, JiraError } from './types';

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

    async searchIssues(jql: string, maxResults: number = 50): Promise<JiraSearchResponse> {
        const credentials = await this.authService.getCredentials();
        if (!credentials) {
            throw new JiraClientError('No credentials configured');
        }

        const { baseUrl, email, apiToken } = credentials;
        const url = new URL('/rest/api/3/search/jql', baseUrl);
        url.searchParams.set('jql', jql);
        url.searchParams.set('maxResults', maxResults.toString());
        url.searchParams.set('fields', 'summary,status,assignee,reporter,priority,issuetype,created,updated,labels');

        const authHeader = Buffer.from(`${email}:${apiToken}`).toString('base64');

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
                throw new JiraClientError('Authentication failed. Please check your credentials.', response.status, jiraErrors);
            }
            if (response.status === 403) {
                throw new JiraClientError('Access denied. Please check your permissions.', response.status, jiraErrors);
            }

            const errorMessage = jiraErrors?.errorMessages?.join(', ') || `Request failed with status ${response.status}`;
            throw new JiraClientError(errorMessage, response.status, jiraErrors);
        }

        return await response.json() as JiraSearchResponse;
    }

    async testConnection(): Promise<{ success: boolean; error?: string }> {
        const credentials = await this.authService.getCredentials();
        if (!credentials) {
            return { success: false, error: 'No credentials configured' };
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
                return { success: true };
            }

            if (response.status === 401) {
                return { success: false, error: 'Invalid credentials. Check your email and API token.' };
            }
            if (response.status === 403) {
                return { success: false, error: 'Access denied. Check your permissions.' };
            }
            if (response.status === 404) {
                return { success: false, error: 'Jira instance not found. Check your URL.' };
            }

            return { success: false, error: `Connection failed with status ${response.status}` };
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            if (message.includes('fetch') || message.includes('network')) {
                return { success: false, error: 'Network error. Check your URL and internet connection.' };
            }
            return { success: false, error: message };
        }
    }
}

