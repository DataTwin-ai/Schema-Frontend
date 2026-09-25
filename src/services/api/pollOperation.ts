import { API_URL } from './config';
import { ProgressCallback } from '../interfaces';

export class StoppedError extends Error {
  constructor(message?: string) {
    super(message || 'Stopped by user');
    this.name = 'StoppedError';
  }
}

export async function pollOperation(
  operationId: string,
  onProgress?: ProgressCallback,
  pollIntervalMs: number = 1500
): Promise<any> {
  while (true) {
    await new Promise(r => setTimeout(r, pollIntervalMs));
    const statusRes = await fetch(`${API_URL}/operations/${operationId}/status`);
    
    if (!statusRes.ok) {
      throw new Error('Failed to poll operation status');
    }
    
    const statusData = await statusRes.json();
    
    if (onProgress) {
      onProgress({
        id: `poll-progress-${operationId}`,
        status: 'active',
        label: statusData.message || `Processing... (${statusData.status})`,
        detail: statusData.progress ? `Step ${statusData.progress.current} of ${statusData.progress.total}` : '',
      });
    }

    if (statusData.status === 'COMPLETED') {
      return statusData;
    }
    
    if (statusData.status === 'STOPPED') {
      throw new StoppedError();
    }
    
    if (statusData.status === 'FAILED') {
      throw new Error(statusData.error || 'Operation failed');
    }
  }
}
