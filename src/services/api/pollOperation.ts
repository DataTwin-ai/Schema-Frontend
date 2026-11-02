import { API_URL } from './config';
import { ProgressCallback } from '../interfaces';

function isGenericTitle(msg?: string): boolean {
  if (!msg) return true;
  const m = msg.trim().toLowerCase();
  return (
    m === 'generating domain classes...' ||
    m === 'generating domain classes\u2026' ||
    m === 'generating domain classes' ||
    m === 'generating requirements...' ||
    m === 'generating requirements\u2026' ||
    m === 'generating requirements' ||
    m === 'generating business requirement...' ||
    m === 'generating business requirement\u2026' ||
    m === 'generating business requirement' ||
    m === 'generating schema...' ||
    m === 'generating schema\u2026' ||
    m === 'generating schema' ||
    m === 'generating schema classes...' ||
    m === 'generating schema classes\u2026' ||
    m === 'executing schema...' ||
    m === 'executing schema' ||
    m === 'generating...' ||
    m === 'generating\u2026' ||
    m === 'processing...' ||
    m === 'processing\u2026'
  );
}

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
          const current = statusData.progress?.current ?? statusData.current;
          const total = statusData.progress?.total ?? statusData.total;
          const currentName =
            statusData.progress?.currentName ||
            statusData.progress?.current_name ||
            statusData.progress?.className ||
            statusData.progress?.class_name ||
            statusData.currentName ||
            statusData.className;

          let serverMessage = statusData.message;
          if (!serverMessage || isGenericTitle(serverMessage)) {
            if (current !== undefined && total !== undefined && total > 0 && currentName) {
              serverMessage = `Class ${current}/${total}: ${currentName}`;
            } else {
              serverMessage =
                statusData.phase ||
                statusData.progress?.phase ||
                statusData.progress?.phaseLabel ||
                statusData.progress?.phase_label ||
                `Processing... (${statusData.status})`;
            }
          }

          let detail = '';
          if (typeof current === 'number' && typeof total === 'number') {
            detail = `${current} of ${total}`;
          }

          onProgress({
            id: `poll-progress-${operationId}`,
            status: 'active',
            label: serverMessage,
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

        if (status === 'COMPLETED' || status === 'COMPLETED_WITH_ERRORS' || status === 'AWAITING_APPROVAL') {
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
