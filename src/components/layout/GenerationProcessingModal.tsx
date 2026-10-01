'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useWorkflow } from '../../context/WorkflowContext';
import { Loader2, Pause, Play, Square, XCircle, AlertCircle, CheckCircle } from 'lucide-react';
import { API_URL } from '../../services/api/config';


export interface GenerationProcessingModalProps {
  isOpen?: boolean;
  operationLabel?: string;
  supportingText?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Safely extract a 0–100 integer percentage from the backend progress field.
 *  Backend sends `progress` as an object { current, total, percentage, … } or
 *  occasionally as a plain number. Never let the raw object reach JSX. */
function extractPct(rawProgress: unknown): number {
  if (typeof rawProgress === 'number') {
    return Math.round(Math.min(100, Math.max(0, rawProgress)));
  }
  if (rawProgress && typeof rawProgress === 'object') {
    const p = rawProgress as Record<string, unknown>;
    const raw =
      typeof p.percentage === 'number'
        ? p.percentage
        : typeof p.current === 'number' && typeof p.total === 'number' && (p.total as number) > 0
        ? ((p.current as number) / (p.total as number)) * 100
        : 0;
    return Math.round(Math.min(100, Math.max(0, raw)));
  }
  return 0;
}

/** Format elapsed seconds as M:SS */
function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Build a human-readable step label from the progress object.
 *  Handles: step/totalSteps (pipeline-level), phaseLabel, current/total, currentName. */
function buildStepLabel(rawProgress: unknown): string | null {
  if (!rawProgress || typeof rawProgress !== 'object') return null;
  const p = rawProgress as Record<string, unknown>;

  const current = typeof p.current === 'number' ? p.current : undefined;
  const total   = typeof p.total   === 'number' ? p.total   : undefined;

  const phaseLabel: string | null =
    typeof p.phaseLabel   === 'string' ? p.phaseLabel   :
    typeof p.phase_label  === 'string' ? p.phase_label  :
    typeof p.message      === 'string' ? p.message      :
    null;

  const currentName: string | null =
    typeof p.currentName  === 'string' ? p.currentName  :
    typeof p.current_name === 'string' ? p.current_name :
    null;

  const step       = typeof p.step       === 'number' ? p.step       : undefined;
  const totalSteps = typeof p.totalSteps === 'number' ? p.totalSteps : undefined;

  const parts: string[] = [];

  if (step !== undefined && totalSteps !== undefined) {
    let stepPart = `Step ${step} of ${totalSteps}`;
    if (phaseLabel) stepPart += ` · ${phaseLabel}`;
    parts.push(stepPart);
  } else if (phaseLabel) {
    parts.push(phaseLabel);
  }

  if (current !== undefined && total !== undefined && (total as number) > 0) {
    const itemLabel = currentName
      ? `${current} of ${total}: ${currentName}`
      : `${current} of ${total}`;
    if (parts.length === 0) {
      parts.push(itemLabel);
    } else {
      parts[0] += ` (${itemLabel})`;
    }
  }

  return parts.length > 0 ? parts.join(' · ') : null;
}

/** Build ETA sub-line from progress object. */
function buildEtaLine(rawProgress: unknown): string | null {
  if (!rawProgress || typeof rawProgress !== 'object') return null;
  const p = rawProgress as Record<string, unknown>;
  if (typeof p.etaSeconds !== 'number') return null;
  let line = `About ${formatDuration(p.etaSeconds as number)} left`;
  if (p.estimated === true) line += ' (estimated)';
  return line;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const GenerationProcessingModal: React.FC<GenerationProcessingModalProps> = ({
  isOpen: propIsOpen,
  operationLabel: propOperationLabel,
  supportingText = 'DataTwin Engine is processing your request',
}) => {
  const {
    isGeneratingModalOpen,
    generationOperationLabel,
    workflow,
    activeOperation,
    setActiveOperation,
    closeGeneratingModal,
  } = useWorkflow();

  const isOpen = propIsOpen !== undefined ? propIsOpen : isGeneratingModalOpen;

  // Elapsed timer — ticks every second while modal is visible
  const [elapsedSecs, setElapsedSecs] = useState(0);
  const elapsedRef  = useRef(0);
  const timerRef    = useRef<NodeJS.Timeout | null>(null);

  // Never let the displayed percentage go backwards
  const maxPctRef = useRef(0);

  // Reset and start the elapsed counter when modal opens
  useEffect(() => {
    if (isOpen) {
      elapsedRef.current = 0;
      maxPctRef.current  = 0;
      setElapsedSecs(0);
      timerRef.current = setInterval(() => {
        elapsedRef.current += 1;
        setElapsedSecs(elapsedRef.current);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen]);

  // Polling for backend operation status — every 1 s for smooth bar movement
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const pollStatus = async () => {
      if (!activeOperation?.operationId) return;
      if (['COMPLETED', 'FAILED', 'STOPPED'].includes(activeOperation.status)) return;

      try {
        const res = await fetch(`${API_URL}/operations/${activeOperation.operationId}/status`);
        if (res.ok) {
          const data = await res.json();
          setActiveOperation(data);

          if (data.status === 'COMPLETED') {
            // Show 100 % bar briefly, then close
            setTimeout(() => {
              setActiveOperation(null);
              closeGeneratingModal();
            }, 500);
            return; // No further polling
          }

          if (data.status === 'STOPPED') {
            setActiveOperation(null);
            closeGeneratingModal();
            return;
          }
        }
      } catch (err) {
        console.error('Failed to poll operation status:', err);
      }

      timeoutId = setTimeout(pollStatus, 1000); // 1 s interval
    };

    if (isOpen && activeOperation) {
      timeoutId = setTimeout(pollStatus, 1000);
    }

    return () => clearTimeout(timeoutId);
  }, [isOpen, activeOperation, setActiveOperation, closeGeneratingModal]);

  if (!isOpen) return null;

  // ---------------------------------------------------------------------------
  // Derived display values
  // ---------------------------------------------------------------------------

  const currentStatus = activeOperation?.status || 'RUNNING';
  const isRunningLike  = ['RUNNING', 'PAUSE_REQUESTED', 'PAUSED', 'RESUME_REQUESTED'].includes(currentStatus);
  const isStopRequested = currentStatus === 'STOP_REQUESTED';
  const isCompleted     = currentStatus === 'COMPLETED';
  const showProgressBar = isRunningLike || isStopRequested || isCompleted;

  const rawProgress = activeOperation?.progress;
  const rawPct = extractPct(rawProgress);
  // Ratchet: clamp to max seen so the bar never retreats
  maxPctRef.current = Math.max(maxPctRef.current, rawPct);
  const pct = isCompleted ? 100 : maxPctRef.current;

  const stepLabel = buildStepLabel(rawProgress);
  const etaLine   = buildEtaLine(rawProgress);

  // STOP hint appears after 2 min of waiting
  const showStopHint = isStopRequested && elapsedSecs >= 120;

  // Operation title — never pass objects; use strings only
  const resolveOperationLabel = (): string => {
    if (propOperationLabel) return propOperationLabel;
    if (generationOperationLabel && generationOperationLabel !== 'Generating\u2026') {
      return generationOperationLabel;
    }
    switch (workflow.stage) {
      case 'business-input':
        return workflow.businessInput.isBusinessRequirementGenerated
          ? 'Generating Requirements\u2026'
          : 'Generating Business Requirement\u2026';
      case 'requirements':
        return 'Generating Schema Classes\u2026';
      case 'classes':
        return 'Generating Schema\u2026';
      default:
        return generationOperationLabel || 'Generating\u2026';
    }
  };

  const label = resolveOperationLabel();

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const handleAction = async (action: 'pause' | 'resume' | 'stop') => {
    if (!activeOperation?.operationId) return;
    try {
      if (action === 'pause')  setActiveOperation({ ...activeOperation, status: 'PAUSE_REQUESTED' });
      if (action === 'resume') setActiveOperation({ ...activeOperation, status: 'RESUME_REQUESTED' });
      if (action === 'stop')   setActiveOperation({ ...activeOperation, status: 'STOP_REQUESTED' });

      await fetch(`${API_URL}/operations/${activeOperation.operationId}/${action}`, { method: 'POST' });

      const res = await fetch(`${API_URL}/operations/${activeOperation.operationId}/status`);
      if (res.ok) {
        const data = await res.json();
        setActiveOperation(data);
      }
    } catch (err) {
      console.error(`Failed to ${action} operation:`, err);
    }
  };

  const isScdpExecution = activeOperation?.type === 'execute-schema';

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  const getStatusIcon = () => {
    switch (currentStatus) {
      case 'FAILED':    return <AlertCircle className="h-6 w-6 text-rose-500 mb-4" />;
      case 'COMPLETED': return <CheckCircle  className="h-6 w-6 text-emerald-500 mb-4" />;
      case 'STOPPED':   return <Square       className="h-6 w-6 text-neutral-500 mb-4" />;
      case 'PAUSED':    return <Pause        className="h-6 w-6 text-amber-500 mb-4" />;
      default:          return <Loader2      className="h-6 w-6 text-neutral-700 dark:text-neutral-300 animate-spin stroke-[2.25] mb-4" />;
    }
  };

  const renderButtons = () => {
    // All buttons are disabled while STOP is being processed
    const disabled = isStopRequested;

    switch (currentStatus) {
      case 'RUNNING':
        return (
          <>
            {!isScdpExecution && (
              <button
                onClick={() => handleAction('pause')}
                disabled={disabled}
                className="flex-1 flex justify-center items-center py-2 px-3 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 text-amber-600 dark:text-amber-400 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Pause className="w-3.5 h-3.5 mr-1.5" />
                Pause
              </button>
            )}
            <button
              onClick={() => handleAction('stop')}
              disabled={disabled}
              className="flex-1 flex justify-center items-center py-2 px-3 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Square className="w-3.5 h-3.5 mr-1.5" />
              Stop
            </button>
          </>
        );

      case 'PAUSE_REQUESTED':
        return (
          <>
            <button disabled className="flex-1 flex justify-center items-center py-2 px-3 bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 rounded-lg text-xs font-semibold cursor-not-allowed">
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              Pausing...
            </button>
            <button
              onClick={() => handleAction('stop')}
              className="flex-1 flex justify-center items-center py-2 px-3 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 rounded-lg text-xs font-semibold transition-colors"
            >
              <Square className="w-3.5 h-3.5 mr-1.5" />
              Stop
            </button>
          </>
        );

      case 'PAUSED':
        return (
          <>
            <button
              onClick={() => handleAction('resume')}
              className="flex-1 flex justify-center items-center py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors"
            >
              <Play className="w-3.5 h-3.5 mr-1.5" />
              Resume
            </button>
            <button
              onClick={() => handleAction('stop')}
              className="flex-1 flex justify-center items-center py-2 px-3 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 rounded-lg text-xs font-semibold transition-colors"
            >
              <Square className="w-3.5 h-3.5 mr-1.5" />
              Stop
            </button>
          </>
        );

      case 'RESUME_REQUESTED':
        return (
          <button disabled className="w-full flex justify-center items-center py-2 px-3 bg-blue-100 dark:bg-blue-900/40 text-blue-400 dark:text-blue-500 rounded-lg text-xs font-semibold cursor-not-allowed">
            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            Resuming...
          </button>
        );

      case 'STOP_REQUESTED':
        return (
          <button disabled className="w-full flex justify-center items-center py-2 px-3 bg-rose-100 dark:bg-rose-900/40 text-rose-400 dark:text-rose-500 rounded-lg text-xs font-semibold cursor-not-allowed">
            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            Stopping\u2026 (finishing current AI call)
          </button>
        );

      case 'STOPPED':
        return (
          <button
            onClick={() => { setActiveOperation(null); closeGeneratingModal(); }}
            className="w-full flex justify-center items-center py-2 px-3 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-900 rounded-lg text-xs font-semibold transition-colors"
          >
            <XCircle className="w-3.5 h-3.5 mr-1.5" />
            Close
          </button>
        );

      case 'FAILED':
        return (
          <button
            onClick={() => { setActiveOperation(null); closeGeneratingModal(); }}
            className="w-full flex justify-center items-center py-2 px-3 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-900 rounded-lg text-xs font-semibold transition-colors"
          >
            Acknowledge Error
          </button>
        );

      case 'COMPLETED':
        return null;
      default:
        return null;
    }
  };

  // ---------------------------------------------------------------------------
  // JSX
  // ---------------------------------------------------------------------------

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-live="polite"
      aria-label={label}
      className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/40 backdrop-blur-[2px] p-4 animate-in fade-in duration-150"
    >
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 rounded-2xl w-full max-w-[360px] p-6 shadow-xl dark:shadow-2xl text-center text-neutral-900 dark:text-neutral-100 animate-in fade-in zoom-in-95 duration-150">

        {/* Status icon */}
        <div className="flex items-center justify-center">
          {getStatusIcon()}
        </div>

        {/* Title */}
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-white tracking-tight">
          {label}
        </h3>

        {/* Error message */}
        {activeOperation?.error && (
          <p className="text-xs text-rose-500 dark:text-rose-400 mt-1.5 leading-relaxed">
            {String(activeOperation.error)}
          </p>
        )}

        {/* Progress bar + step info — visible while running or completing */}
        {showProgressBar && !activeOperation?.error && (
          <div className="mt-4 text-left">
            {/* Bar row */}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${pct}%`,
                    background: 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%)',
                    transition: 'width 300ms ease',
                  }}
                />
              </div>
              <span className="text-xs font-semibold tabular-nums text-neutral-700 dark:text-neutral-300 min-w-[34px] text-right">
                {pct}%
              </span>
            </div>

            {/* Step label */}
            {stepLabel && (
              <p className="mt-2 text-xs text-neutral-600 dark:text-neutral-400 leading-snug">
                {stepLabel}
              </p>
            )}

            {/* Elapsed · ETA */}
            <p className="mt-1 text-[11px] text-neutral-400 dark:text-neutral-500 leading-snug">
              Elapsed {formatDuration(elapsedSecs)}
              {etaLine ? ` · ${etaLine}` : ''}
            </p>

            {/* Stop-requested status */}
            {isStopRequested && (
              <p className="mt-2 text-xs text-rose-500 dark:text-rose-400 leading-snug">
                {showStopHint
                  ? 'Still waiting for the AI response \u2014 this can take up to a few minutes.'
                  : `Waiting for the current AI call to finish\u2026`}
              </p>
            )}
          </div>
        )}

        {/* Supporting text fallback — only when bar is not shown */}
        {!showProgressBar && !activeOperation?.error && supportingText && (
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1.5 leading-relaxed">
            {supportingText}
          </p>
        )}

        {/* Action buttons */}
        {(activeOperation || currentStatus !== 'RUNNING') && (
          <div className="mt-5 flex items-center gap-2">
            {renderButtons()}
          </div>
        )}
      </div>
    </div>
  );
};
