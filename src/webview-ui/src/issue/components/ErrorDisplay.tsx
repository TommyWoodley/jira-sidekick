interface ErrorDisplayProps {
  issueKey: string;
  message: string;
  onRetry: () => void;
}

export function ErrorDisplay({ issueKey, message, onRetry }: ErrorDisplayProps) {
  return (
    <div className="error-container">
      <div className="error-box">
        <h1>Failed to load {issueKey}</h1>
        <p>{message}</p>
        <button className="btn-primary" onClick={onRetry}>
          Retry
        </button>
      </div>
    </div>
  );
}

