import { expect } from '@open-wc/testing';
import { formatFileSize, formatRelativeTime, formatFullDate, getFileTypeIcon } from './format.js';

describe('formatFileSize', () => {
  it('formats bytes', () => {
    expect(formatFileSize(0)).to.equal('0 B');
    expect(formatFileSize(500)).to.equal('500 B');
    expect(formatFileSize(1023)).to.equal('1023 B');
  });

  it('formats kilobytes', () => {
    expect(formatFileSize(1024)).to.equal('1.0 KB');
    expect(formatFileSize(1536)).to.equal('1.5 KB');
    expect(formatFileSize(10240)).to.equal('10.0 KB');
  });

  it('formats megabytes', () => {
    expect(formatFileSize(1024 * 1024)).to.equal('1.0 MB');
    expect(formatFileSize(1024 * 1024 * 5)).to.equal('5.0 MB');
  });
});

describe('formatRelativeTime', () => {
  it('formats "just now" for recent times', () => {
    const now = new Date();
    expect(formatRelativeTime(now.toISOString())).to.equal('just now');
  });

  it('formats minutes ago', () => {
    const date = new Date(Date.now() - 5 * 60 * 1000);
    expect(formatRelativeTime(date.toISOString())).to.equal('5 minutes ago');
  });

  it('formats single minute ago', () => {
    const date = new Date(Date.now() - 1 * 60 * 1000);
    expect(formatRelativeTime(date.toISOString())).to.equal('1 minute ago');
  });

  it('formats hours ago', () => {
    const date = new Date(Date.now() - 3 * 60 * 60 * 1000);
    expect(formatRelativeTime(date.toISOString())).to.equal('3 hours ago');
  });

  it('formats single hour ago', () => {
    const date = new Date(Date.now() - 1 * 60 * 60 * 1000);
    expect(formatRelativeTime(date.toISOString())).to.equal('1 hour ago');
  });

  it('formats days ago', () => {
    const date = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    expect(formatRelativeTime(date.toISOString())).to.equal('5 days ago');
  });

  it('formats single day ago', () => {
    const date = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
    expect(formatRelativeTime(date.toISOString())).to.equal('1 day ago');
  });

  it('formats old dates as locale string', () => {
    const date = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    const result = formatRelativeTime(date.toISOString());
    expect(result.length).to.be.greaterThan(0);
  });
});

describe('formatFullDate', () => {
  it('formats date as locale string', () => {
    const date = new Date('2024-01-15T10:30:00.000Z');
    const result = formatFullDate(date.toISOString());
    expect(result.length).to.be.greaterThan(0);
  });
});

describe('getFileTypeIcon', () => {
  it('returns image icon for image types', () => {
    expect(getFileTypeIcon('image/png')).to.equal('🖼️');
    expect(getFileTypeIcon('image/jpeg')).to.equal('🖼️');
    expect(getFileTypeIcon('image/gif')).to.equal('🖼️');
  });

  it('returns video icon for video types', () => {
    expect(getFileTypeIcon('video/mp4')).to.equal('🎬');
    expect(getFileTypeIcon('video/webm')).to.equal('🎬');
  });

  it('returns audio icon for audio types', () => {
    expect(getFileTypeIcon('audio/mp3')).to.equal('🎵');
    expect(getFileTypeIcon('audio/wav')).to.equal('🎵');
  });

  it('returns pdf icon for pdf files', () => {
    expect(getFileTypeIcon('application/pdf')).to.equal('📄');
  });

  it('returns archive icon for zip files', () => {
    expect(getFileTypeIcon('application/zip')).to.equal('📦');
    expect(getFileTypeIcon('application/x-archive')).to.equal('📦');
  });

  it('returns text icon for text and document files', () => {
    expect(getFileTypeIcon('text/plain')).to.equal('📝');
    expect(getFileTypeIcon('application/document')).to.equal('📝');
  });

  it('returns spreadsheet icon for spreadsheet files', () => {
    expect(getFileTypeIcon('application/vnd.ms-excel')).to.equal('📊');
    expect(getFileTypeIcon('application/spreadsheet')).to.equal('📊');
  });

  it('returns attachment icon for unknown types', () => {
    expect(getFileTypeIcon('application/octet-stream')).to.equal('📎');
    expect(getFileTypeIcon('unknown/type')).to.equal('📎');
  });
});

