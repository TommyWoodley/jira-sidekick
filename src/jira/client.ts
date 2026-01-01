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
        const url = new URL('/rest/api/3/search', baseUrl);
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

    async testConnection(): Promise<boolean> {
        try {
            await this.searchIssues('assignee = currentUser()', 1);
            return true;
        } catch {
            return false;
        }
    }
}

