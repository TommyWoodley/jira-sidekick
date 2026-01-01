export interface JiraUser {
  accountId: string;
  displayName: string;
  emailAddress?: string;
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
}

export interface JiraIssueType {
  id: string;
  name: string;
}

export interface JiraIssue {
  id: string;
  key: string;
  self: string;
  fields: {
    summary: string;
    status: JiraStatus;
    assignee: JiraUser | null;
    priority: JiraPriority | null;
    issuetype: JiraIssueType;
    labels?: string[];
    description?: string;
  };
}

export interface JiraFilter {
  id: string;
  name: string;
  jql: string;
  favourite: boolean;
}

export interface JiraCredentials {
  baseUrl: string;
  email: string;
  apiToken: string;
}

