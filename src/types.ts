export interface VirtualFile {
  id: string;
  name: string;
  content: string;
  size: number;
  type: string;
  lastModified?: number;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'error' | 'warning' | 'success';
}
