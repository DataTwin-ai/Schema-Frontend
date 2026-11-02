import { API_URL } from './config';
import { ProgressCallback } from '../interfaces';

export class StoppedError extends Error {
  constructor(message?: string) {
    super(message || 'Generation stopped');
    this.name = 'StoppedError';
  }
}

export class UnknownStatusError extends Error {
  public rawStatus: string;
  constructor(status: string) {
    super(`Unknown operation status: ${status}`);
    this.name = 'UnknownStatusError';
    this.rawStatus = status;
  }
}

export class OperationFailedError extends Error {
  public status: string;
  public mismatches?: any[];
  constructor(message: string, mismatches?: any[]) {
    super(message);
    this.name = 'OperationFailedError';
    this.status = 'FAILED';
    this.mismatches = mismatches;
  }
}

interface ActivePoll {
  operationId: string;
  intervalId: NodeJS.Timeout;
  reject: (err: any) => void;
}

const activePolls = new Map<string, ActivePoll>();

/**
 * Cancel active polling for a specific operation or all operations.
 */
export function cancelOperationPolling(operationId?: string): void {
  if (operationId) {
    const poll = activePolls.get(operationId);
    if (poll) {
      clearInterval(poll.intervalId);
      poll.reject(new StoppedError('Polling cancelled'));
      activePolls.delete(operationId);
    }
  } else {
    activePolls.forEach((poll) => {
      clearInterval(poll.intervalId);
      poll.reject(new StoppedError('Polling cancelled'));
    });
    activePolls.clear();
  }
}

/**
 * Poll an operation until a final status is reached.
 * Uses strictly one interval per operation, cancellable on unmount or run change.
 */
export function pollOperation(
  operationId: string,
  onProgress?: ProgressCallback,
  onStatusUpdateOrInterval?: ((statusData: any) => void) | number,
  pollIntervalMs: number = 1000
): Promise<any> {
  let onStatusUpdate: ((statusData: any) => void) | undefined;
  let intervalMs = pollIntervalMs;

  if (typeof onStatusUpdateOrInterval === 'function') {
    onStatusUpdate = onStatusUpdateOrInterval;
  } else if (typeof onStatusUpdateOrInterval === 'number') {
    intervalMs = onStatusUpdateOrInterval;
  }

  // Ensure strictly one interval per operation
  if (activePolls.has(operationId)) {
    const existing = activePolls.get(operationId)!;
    clearInterval(existing.intervalId);
    activePolls.delete(operationId);
  }

  return new Promise((resolve, reject) => {
    let isFetching = false;

    const checkStatus = async () => {
      if (isFetching) return;
      isFetching = true;
      try {
        const statusRes = await fetch(`${API_URL}/operations/${operationId}/status`);
        if (!statusRes.ok) {
          console.warn(`Failed to poll status for operation ${operationId}: ${statusRes.status}`);
          return;
        }

        const statusData = await statusRes.json();

        if (onStatusUpdate) {
          onStatusUpdate(statusData);
        }

        if (onProgress) {
          const phase =
            statusData.phase ||
            statusData.progress?.phase ||
            statusData.progress?.phaseLabel ||
            statusData.progress?.phase_label ||
            statusData.message ||
            `Processing... (${statusData.status})`;
          const progressInfo = statusData.progress;
          let detail = '';
          if (progressInfo && typeof progressInfo.current === 'number' && typeof progressInfo.total === 'number') {
            detail = `${progressInfo.current} of ${progressInfo.total}`;
          }
          onProgress({
            id: `poll-progress-${operationId}`,
            status: 'active',
            label: phase,
            detail: detail,
          });
        }

        const status = statusData.status;

        // Non-final statuses: continue polling
        if (
          status === 'RUNNING' ||
          status === 'PAUSED' ||
          status === 'PAUSE_REQUESTED' ||
          status === 'RESUME_REQUESTED' ||
          status === 'STOP_REQUESTED'
        ) {
          return;
        }

        // Final status reached: clear interval
        const poll = activePolls.get(operationId);
        if (poll) {
          clearInterval(poll.intervalId);
          activePolls.delete(operationId);
        }

        if (status === 'COMPLETED' || status === 'AWAITING_APPROVAL') {
          resolve(statusData);
          return;
        }

        if (status === 'STOPPED') {
          reject(new StoppedError('Generation stopped'));
          return;
        }

        if (status === 'FAILED') {
          const mismatches = statusData.mismatches || statusData.result?.mismatches;
          const errorMsg = statusData.error || statusData.message || 'Operation failed';
          const error = new OperationFailedError(errorMsg, mismatches);
          (error as any).stage = statusData.stage || statusData.result?.stage;
          (error as any).missing = statusData.missing || statusData.missingDataSources || statusData.result?.missing || statusData.result?.missingDataSources;
          (error as any).required = statusData.required || statusData.requiredDataSources || statusData.result?.required || statusData.result?.requiredDataSources;
          (error as any).statusData = statusData;
          reject(error);
          return;
        }

        // Any unknown status: stop polling and reject
        reject(new UnknownStatusError(status));
      } catch (err) {
        console.error('Error polling operation:', err);
      } finally {
        isFetching = false;
      }
    };

    checkStatus();

    const intervalId = setInterval(checkStatus, intervalMs);
    activePolls.set(operationId, { operationId, intervalId, reject });
  });
}
