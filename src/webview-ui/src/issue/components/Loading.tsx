interface LoadingProps {
  issueKey: string;
}

export function Loading({ issueKey }: LoadingProps) {
  return (
    <div className="loading-container">
      <div>
        <div className="spinner" />
        <div>Loading {issueKey}...</div>
      </div>
    </div>
  );
}

