import type { JiraCredentials, JiraFilter, JiraIssue, JiraTransition, JiraComment } from './models';

export interface ConfigApi {
    getCredentials(): Promise<{
        credentials: Partial<JiraCredentials> | null;
        selectedFilter: string | null;
    }>;

    testConnection(credentials: JiraCredentials): Promise<{
        success: boolean;
        message: string;
    }>;

    saveCredentials(credentials: JiraCredentials): Promise<{
        success: boolean;
        message: string;
    }>;

    loadFilters(): Promise<{
        filters: JiraFilter[];
        selectedFilter: string | null;
    }>;

    saveFilter(filterId: string | null): Promise<void>;

    openTokenPage(): void;
}

export interface IssueApi {
    loadIssue(issueKey: string): Promise<{
        issue: JiraIssue;
        imageMap: Record<string, string>;
        comments: JiraComment[];
    }>;

    refresh(): Promise<{
        issue: JiraIssue;
        imageMap: Record<string, string>;
        comments: JiraComment[];
    }>;

    openInBrowser(): void;

    openAttachment(url: string): void;

    saveAttachment(attachment: {
        id: string;
        filename: string;
        content: string;
    }): Promise<void>;

    loadImage(id: string): Promise<string | null>;

    getTransitions(): Promise<JiraTransition[]>;

    transitionIssue(transitionId: string): Promise<{ issue: JiraIssue }>;
}

