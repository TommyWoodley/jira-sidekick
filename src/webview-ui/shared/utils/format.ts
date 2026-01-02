export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) {
    return 'just now';
  }
  if (diffMins < 60) {
    return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  }
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  }
  if (diffDays < 30) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }
  return date.toLocaleDateString();
}

export function formatFullDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString();
}

export function getFileTypeIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) {
    return '🖼️';
  }
  if (mimeType.startsWith('video/')) {
    return '🎬';
  }
  if (mimeType.startsWith('audio/')) {
    return '🎵';
  }
  if (mimeType.includes('pdf')) {
    return '📄';
  }
  if (mimeType.includes('zip') || mimeType.includes('archive')) {
    return '📦';
  }
  if (mimeType.includes('text') || mimeType.includes('document')) {
    return '📝';
  }
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
    return '📊';
  }
  return '📎';
}

