export interface JiraCredentials {
  baseUrl: string;
  email: string;
  apiToken: string;
}

export interface JiraFilter {
  id: string;
  name: string;
  favourite: boolean;
}

export interface JiraAttachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  content: string;
  created: string;
}

// Atlassian Document Format types
export interface AdfMark {
  type: string;
  attrs?: Record<string, unknown>;
}

export interface AdfNode {
  type: string;
  content?: AdfNode[];
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: AdfMark[];
}

export interface JiraIssue {
  key: string;
  fields: {
    summary: string;
    description: AdfNode | null;
    status: {
      name: string;
      statusCategory: {
        key: string;
      };
    };
    issuetype: {
      name: string;
    };
    assignee: {
      displayName: string;
    } | null;
    priority: {
      name: string;
    } | null;
    labels: string[];
    attachment?: JiraAttachment[];
  };
}

