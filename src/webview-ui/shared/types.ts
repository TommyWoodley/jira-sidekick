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

export interface JiraIssue {
  key: string;
  fields: {
    summary: string;
    description: string;
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

