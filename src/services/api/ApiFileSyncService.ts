import { API_URL } from './config';

export interface FileChangedEvent {
  key: string;
  version: number;
  change: string; // 'created' | 'modified' | 'deleted'
  source: string; // 'disk' | 'api'
}

export interface OperationEvent {
  operationId: string;
  status: string;
  progress: any;
}

export interface StaleEvent {
  stage: string;
  reason: string;
}

export type FileChangedListener = (event: FileChangedEvent) => void;
export type OperationListener = (event: OperationEvent) => void;
export type StaleListener = (event: StaleEvent) => void;

export class ApiFileSyncService {
  private eventSource: EventSource | null = null;
  private currentRunId: string | null = null;
  private reconnectTimeout: any = null;
  private backoffMs = 1000;
  private maxBackoffMs = 10000;
  private isDestroyed = false;

  // Track recent saves by this tab: `${key}:${version}`
  private recentSaves = new Set<string>();

  private fileChangedListeners: Set<FileChangedListener> = new Set();
  private operationListeners: Set<OperationListener> = new Set();
  private staleListeners: Set<StaleListener> = new Set();

  public subscribe(runId?: string) {
    const targetRunId = runId || null;
    if (this.currentRunId === targetRunId && this.eventSource) {
      return;
    }
    this.currentRunId = targetRunId;
    this.connect();
  }

  public unsubscribe() {
    this.close();
  }

  private connect() {
    this.close();
    if (this.isDestroyed) return;
    if (typeof window === 'undefined') return;

    const url = `${API_URL}/events?runId=${encodeURIComponent(this.currentRunId || '')}`;
    try {
      this.eventSource = new EventSource(url);

      this.eventSource.onopen = () => {
        this.backoffMs = 1000;
      };

      this.eventSource.addEventListener('file_changed', (e: MessageEvent) => {
        try {
          const data: FileChangedEvent = JSON.parse(e.data);
          // Ignore events with source 'api' that came from this tab's own save
          const saveKey = `${data.key}:${data.version}`;
          if (data.source === 'api' && this.recentSaves.has(saveKey)) {
            this.recentSaves.delete(saveKey);
            return;
          }
          this.fileChangedListeners.forEach((listener) => {
            try { listener(data); } catch (err) { console.error(err); }
          });
        } catch (err) {
          console.warn('[FileSync] Error parsing file_changed event:', err);
        }
      });

      this.eventSource.addEventListener('operation', (e: MessageEvent) => {
        try {
          const data: OperationEvent = JSON.parse(e.data);
          this.operationListeners.forEach((listener) => {
            try { listener(data); } catch (err) { console.error(err); }
          });
        } catch (err) {
          console.warn('[FileSync] Error parsing operation event:', err);
        }
      });

      this.eventSource.addEventListener('stale', (e: MessageEvent) => {
        try {
          const data: StaleEvent = JSON.parse(e.data);
          this.staleListeners.forEach((listener) => {
            try { listener(data); } catch (err) { console.error(err); }
          });
        } catch (err) {
          console.warn('[FileSync] Error parsing stale event:', err);
        }
      });

      this.eventSource.onerror = () => {
        this.close();
        if (!this.isDestroyed) {
          this.reconnectTimeout = setTimeout(() => {
            this.backoffMs = Math.min(this.backoffMs * 2, this.maxBackoffMs);
            this.connect();
          }, this.backoffMs);
        }
      };
    } catch (err) {
      console.warn('[FileSync] Failed to init EventSource:', err);
    }
  }

  private close() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  public recordOwnSave(key: string, version: number) {
    const saveKey = `${key}:${version}`;
    this.recentSaves.add(saveKey);
    setTimeout(() => {
      this.recentSaves.delete(saveKey);
    }, 15000);
  }

  public onFileChanged(listener: FileChangedListener) {
    this.fileChangedListeners.add(listener);
    return () => this.fileChangedListeners.delete(listener);
  }

  public onOperation(listener: OperationListener) {
    this.operationListeners.add(listener);
    return () => this.operationListeners.delete(listener);
  }

  public onStale(listener: StaleListener) {
    this.staleListeners.add(listener);
    return () => this.staleListeners.delete(listener);
  }

  async getFile(key: string, runId?: string): Promise<{ key: string; version: number; content: string }> {
    const cleanKey = key.replace(/^\/+/, '');
    const query = runId ? `?runId=${encodeURIComponent(runId)}` : '';
    const res = await fetch(`${API_URL}/files/${cleanKey}${query}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `HTTP ${res.status}: ${res.statusText}`);
    }
    return await res.json();
  }

  async putFile(key: string, content: string, baseVersion?: number, runId?: string): Promise<{ key: string; version: number }> {
    const cleanKey = key.replace(/^\/+/, '');
    const res = await fetch(`${API_URL}/files/${cleanKey}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, baseVersion, runId }),
    });

    if (res.status === 409) {
      const err = await res.json().catch(() => ({}));
      const conflictError: any = new Error(typeof err.detail === 'string' ? err.detail : 'Version conflict');
      conflictError.status = 409;
      conflictError.currentVersion = err.currentVersion ?? err.detail?.currentVersion;
      conflictError.currentContent = err.currentContent ?? err.detail?.currentContent;
      throw conflictError;
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Failed to save file: ${res.statusText}`);
    }

    const data = await res.json();
    this.recordOwnSave(key, data.version);
    return data;
  }
}

export const apiFileSyncService = new ApiFileSyncService();
