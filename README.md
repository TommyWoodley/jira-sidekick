# Jira Sidekick

[![Coverage Status](https://coveralls.io/repos/github/thwoodle/jira-sidekick/badge.svg?branch=main)](https://coveralls.io/github/thwoodle/jira-sidekick?branch=main)

A VS Code extension that brings Jira into your editor, reducing context switching and keeping you in flow.

## Features

### Issue Sidebar
View your Jira issues directly in the VS Code sidebar. Issues are displayed with status indicators and can be filtered using saved Jira filters or custom JQL.

### Issue Details Panel
Click any issue to open a detailed view showing:
- **Summary and type**
- **Status** with color-coded badge
- **Assignee** and priority
- **Labels**
- **Full description** rendered from Jira's rich text format

### Quick Actions
- **Refresh** issues from the sidebar
- **Open in Browser** via right-click context menu
- **Configure** credentials and filters easily

## Requirements

- A Jira Cloud instance
- An Atlassian API token ([Get one here](https://id.atlassian.com/manage-profile/security/api-tokens))

## Getting Started

1. Open the Jira Sidekick panel from the activity bar
2. Click the gear icon to configure your credentials
3. Enter your Jira URL, email, and API token
4. Select a filter or use the default "My Issues" view
5. Your issues will appear in the sidebar

## Extension Settings

This extension contributes the following settings:

* `jira-sidekick.jql`: Custom JQL query to fetch issues (default: `assignee = currentUser() ORDER BY updated DESC`)

## Commands

| Command | Description |
|---------|-------------|
| `Jira Sidekick: Refresh Issues` | Refresh the issue list |
| `Jira Sidekick: Configure Credentials` | Open the configuration panel |
| `Jira Sidekick: Open Issue Details` | View issue details in a panel |
| `Jira Sidekick: Open in Browser` | Open issue in Jira web |

## Privacy & Security

- Your API token is stored securely using VS Code's Secret Storage
- All communication is directly between your machine and your Jira instance
- No data is sent to third parties

## Known Issues

- Jira Server / Data Center is not currently supported (Cloud only)
- Some complex ADF formatting may not render perfectly

---

**Enjoy!**
