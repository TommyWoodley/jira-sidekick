export interface JiraUser {
    accountId: string;
    displayName: string;
    emailAddress?: string;
    avatarUrls?: {
        '48x48'?: string;
        '24x24'?: string;
        '16x16'?: string;
        '32x32'?: string;
    };
}

export interface JiraStatus {
    id: string;
    name: string;
    statusCategory: {
        id: number;
        key: string;
        name: string;
        colorName: string;
    };
}

export interface JiraPriority {
    id: string;
    name: string;
    iconUrl?: string;
}

export interface JiraIssueType {
    id: string;
    name: string;
    iconUrl?: string;
}

export interface JiraAttachment {
    id: string;
    filename: string;
    mimeType: string;
    size: number;
    content: string;
    created: string;
}

export interface JiraIssue {
    id: string;
    key: string;
    self: string;
    fields: {
        summary: string;
        status: JiraStatus;
        assignee: JiraUser | null;
        reporter: JiraUser | null;
        priority: JiraPriority | null;
        issuetype: JiraIssueType;
        created: string;
        updated: string;
        description?: unknown;
        labels?: string[];
        attachment?: JiraAttachment[];
    };
}

export interface JiraSearchResponse {
    startAt: number;
    maxResults: number;
    total: number;
    issues: JiraIssue[];
}

export interface JiraCredentials {
    baseUrl: string;
    email: string;
    apiToken: string;
}

export interface JiraError {
    errorMessages: string[];
    errors: Record<string, string>;
}

export interface JiraFilter {
    id: string;
    name: string;
    jql: string;
    favourite: boolean;
}

