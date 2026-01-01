import type { JiraIssue } from '../../shared';

interface IssueDetailProps {
  issue: JiraIssue;
  onRefresh: () => void;
  onOpenInBrowser: () => void;
}

function getStatusClass(categoryKey: string): string {
  switch (categoryKey) {
    case 'done':
      return 'done';
    case 'indeterminate':
      return 'indeterminate';
    default:
      return 'default';
  }
}

export function IssueDetail({ issue, onRefresh, onOpenInBrowser }: IssueDetailProps) {
  const labels = issue.fields.labels || [];
  const description = issue.fields.description || 'No description';
  const statusClass = getStatusClass(issue.fields.status.statusCategory.key);

  return (
    <>
      <div className="header">
        <div className="header-left">
          <div className="issue-key">
            <a href="#" onClick={(e) => { e.preventDefault(); onOpenInBrowser(); }}>
              {issue.key}
            </a>
            {' · '}
            {issue.fields.issuetype.name}
          </div>
          <h1>{issue.fields.summary}</h1>
        </div>
        <div className="header-actions">
          <button className="icon-btn" onClick={onRefresh} title="Refresh">
            ↻ Refresh
          </button>
          <button className="icon-btn" onClick={onOpenInBrowser} title="Open in Browser">
            ↗ Browser
          </button>
        </div>
      </div>

      <div className="meta">
        <div className="meta-item">
          <div className="meta-label">Status</div>
          <div className="meta-value">
            <span className={`status-badge ${statusClass}`}>
              {issue.fields.status.name}
            </span>
          </div>
        </div>

        <div className="meta-item">
          <div className="meta-label">Assignee</div>
          <div className="meta-value">
            {issue.fields.assignee ? (
              issue.fields.assignee.displayName
            ) : (
              <span className="no-labels">Unassigned</span>
            )}
          </div>
        </div>

        {issue.fields.priority && (
          <div className="meta-item">
            <div className="meta-label">Priority</div>
            <div className="meta-value">{issue.fields.priority.name}</div>
          </div>
        )}

        <div className="meta-item">
          <div className="meta-label">Labels</div>
          <div className="meta-value">
            {labels.length > 0 ? (
              <div className="labels">
                {labels.map((label) => (
                  <span key={label} className="label">
                    {label}
                  </span>
                ))}
              </div>
            ) : (
              <span className="no-labels">No labels</span>
            )}
          </div>
        </div>
      </div>

      <div className="content">
        <div className="section-title">Description</div>
        <div
          className="description"
          dangerouslySetInnerHTML={{ __html: description }}
        />
      </div>
    </>
  );
}

