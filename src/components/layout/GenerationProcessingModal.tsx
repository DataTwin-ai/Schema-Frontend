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

/**
 * Server-provided percentage only. Never compute percentage on the client from current/total.
 * Clamps to 99% maximum while running; 100% is only shown on COMPLETED.
 */
function extractServerPct(rawProgress: unknown, activeOp?: any): number {
  if (typeof rawProgress === 'number') {
    return Math.round(Math.min(99, Math.max(0, rawProgress)));
  }
  if (rawProgress && typeof rawProgress === 'object') {
    const p = rawProgress as Record<string, unknown>;
    if (typeof p.percentage === 'number') {
      return Math.round(Math.min(99, Math.max(0, p.percentage)));
    }
    if (typeof p.percent === 'number') {
      return Math.round(Math.min(99, Math.max(0, p.percent)));
    }
  }
  if (activeOp && typeof activeOp.percentage === 'number') {
    return Math.round(Math.min(99, Math.max(0, activeOp.percentage)));
  }
  return 0;
}

/** Format elapsed seconds as M:SS */
function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

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

/**
 * Build human-readable server message or step count under the bar.
 * Example: "Class 7/15: GSTR9C_Table5_6"
 */
function buildPhaseAndCount(rawProgress: unknown, activeOp?: any): string | null {
  const p = (rawProgress && typeof rawProgress === 'object') ? (rawProgress as Record<string, unknown>) : {};

  // 1. Show the server's message ("Class 7/15: GSTR9C_Table5_6") instead of raw phase name
  const serverMsg =
    (typeof p.message === 'string' && p.message && !isGenericTitle(p.message)) ? p.message :
    (activeOp && typeof activeOp.message === 'string' && activeOp.message && !isGenericTitle(activeOp.message)) ? activeOp.message :
    null;

  if (serverMsg) {
    return serverMsg;
  }

  // 2. Format class-wise progress if current, total, and class name exist
  const current = typeof p.current === 'number' ? p.current : (typeof activeOp?.current === 'number' ? activeOp.current : undefined);
  const total   = typeof p.total   === 'number' ? p.total   : (typeof activeOp?.total   === 'number' ? activeOp.total   : undefined);
  const currentName =
    typeof p.currentName === 'string' ? p.currentName :
    typeof p.current_name === 'string' ? p.current_name :
    typeof p.className === 'string' ? p.className :
    typeof p.class_name === 'string' ? p.class_name :
    typeof activeOp?.currentName === 'string' ? activeOp.currentName :
    null;

  if (current !== undefined && total !== undefined && (total as number) > 0) {
    if (currentName) {
      return `Class ${current}/${total}: ${currentName}`;
    }
    return `${current} of ${total}`;
  }

  // 3. Fallback to phase
  const phase: string | null =
    (activeOp && typeof activeOp.phase === 'string' && activeOp.phase) ? activeOp.phase :
    (typeof p.phase === 'string' && p.phase) ? p.phase :
    (typeof p.phaseLabel === 'string' && p.phaseLabel) ? p.phaseLabel :
    (typeof p.phase_label === 'string' && p.phase_label) ? p.phase_label :
    (activeOp && typeof activeOp.message === 'string' && activeOp.message) ? activeOp.message :
    (typeof p.message === 'string' && p.message) ? p.message :
    null;

  return phase;
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

  // Elapsed timer & stall guard
  const [elapsedSecs, setElapsedSecs] = useState(0);
  const elapsedRef = useRef(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [isStalled, setIsStalled] = useState(false);
  const isStalledRef = useRef(false);
  const lastUpdatedAtRef = useRef<string | null>(null);
  const lastProgressTimeRef = useRef<number>(Date.now());

  // Never let the displayed percentage go backwards
  const maxPctRef = useRef(0);

  const currentUpdatedAt = (activeOperation as any)?.updatedAt || (activeOperation as any)?.updated_at || null;

  // Reset and start elapsed & stall timers when modal opens
  useEffect(() => {
    if (isOpen) {
      elapsedRef.current = 0;
      maxPctRef.current  = 0;
      setElapsedSecs(0);
      lastProgressTimeRef.current = Date.now();
      lastUpdatedAtRef.current = currentUpdatedAt;
      setIsStalled(false);
      isStalledRef.current = false;

      timerRef.current = setInterval(() => {
        elapsedRef.current += 1;
        setElapsedSecs(elapsedRef.current);

        // Stall guard: check if updatedAt hasn't changed for 120 s
        const now = Date.now();
        if (!isStalledRef.current && (now - lastProgressTimeRef.current >= 120 * 1000)) {
          setIsStalled(true);
          isStalledRef.current = true;
        }
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      setIsStalled(false);
      isStalledRef.current = false;
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen]);

  // When server sends a new updatedAt timestamp, reset the stall timer
  useEffect(() => {
    if (currentUpdatedAt && currentUpdatedAt !== lastUpdatedAtRef.current) {
      lastUpdatedAtRef.current = currentUpdatedAt;
      lastProgressTimeRef.current = Date.now();
      setIsStalled(false);
      isStalledRef.current = false;
    }
  }, [currentUpdatedAt]);

  if (!isOpen) return null;

  // ---------------------------------------------------------------------------
  // Derived display values
  // ---------------------------------------------------------------------------

  const currentStatus: string = (activeOperation as any)?.status || 'RUNNING';
  const isRunningLike = ['RUNNING', 'PAUSE_REQUESTED', 'PAUSED', 'RESUME_REQUESTED'].includes(currentStatus);
  const isStopRequested = currentStatus === 'STOP_REQUESTED';
  const isCompleted = currentStatus === 'COMPLETED' || currentStatus === 'COMPLETED_WITH_ERRORS';
  const showProgressBar = isRunningLike || isStopRequested || isCompleted;

  const rawProgress = activeOperation?.progress;
  const rawPct = extractServerPct(rawProgress, activeOperation);
  // Ratchet: clamp to max seen so the bar never retreats, but clamp to 99 while not completed
  maxPctRef.current = Math.min(99, Math.max(maxPctRef.current, rawPct));
  const pct = isCompleted ? 100 : maxPctRef.current;

  const stepLabel = buildPhaseAndCount(rawProgress, activeOperation);

  // STOP hint appears after 2 min of waiting
  const showStopHint = isStopRequested && elapsedSecs >= 120;

  // Operation title
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
      case 'COMPLETED':
      case 'COMPLETED_WITH_ERRORS':
        return <CheckCircle  className="h-6 w-6 text-emerald-500 mb-4" />;
      case 'STOPPED':   return <Square       className="h-6 w-6 text-neutral-500 mb-4" />;
      case 'PAUSED':    return <Pause        className="h-6 w-6 text-amber-500 mb-4" />;
      default:          return <Loader2      className="h-6 w-6 text-neutral-700 dark:text-neutral-300 animate-spin stroke-[2.25] mb-4" />;
    }
  };

  const renderButtons = () => {
    const disabled = isStopRequested;

    switch (currentStatus) {
      case 'RUNNING':
        return (
          <>
            {!isScdpExecution && (
              <button
                onClick={() => handleAction('pause')}
                disabled={disabled}
                className="flex-1 flex justify-center items-center py-2 px-3 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 text-amber-600 dark:text-amber-400 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <Pause className="w-3.5 h-3.5 mr-1.5" />
                Pause
              </button>
            )}
            <button
              onClick={() => handleAction('stop')}
              disabled={disabled}
              className="flex-1 flex justify-center items-center py-2 px-3 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
              className="flex-1 flex justify-center items-center py-2 px-3 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
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
              className="flex-1 flex justify-center items-center py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 mr-1.5" />
              Resume
            </button>
            <button
              onClick={() => handleAction('stop')}
              className="flex-1 flex justify-center items-center py-2 px-3 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
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
            className="w-full flex justify-center items-center py-2 px-3 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-900 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            <XCircle className="w-3.5 h-3.5 mr-1.5" />
            Close
          </button>
        );

      case 'FAILED':
        return (
          <button
            onClick={() => { setActiveOperation(null); closeGeneratingModal(); }}
            className="w-full flex justify-center items-center py-2 px-3 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-900 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            Acknowledge Error
          </button>
        );

      case 'COMPLETED':
      case 'COMPLETED_WITH_ERRORS':
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

        {/* Progress bar + step info */}
        {showProgressBar && !activeOperation?.error && (
          <div className="mt-4 text-left">
            {/* Bar row */}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.max(pct, 2)}%`,
                    background: 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%)',
                    transition: 'width 300ms ease',
                  }}
                />
              </div>
              <span className="text-xs font-semibold tabular-nums text-neutral-700 dark:text-neutral-300 min-w-[34px] text-right">
                {pct}%
              </span>
            </div>

            {/* Step label: phase and count */}
            {stepLabel && (
              <p className="mt-2 text-xs text-neutral-600 dark:text-neutral-400 leading-snug">
                {stepLabel}
              </p>
            )}

            {/* Stall notice */}
            {isStalled && (
              <div className="mt-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 text-left">
                <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                  No progress from server
                </p>
                <div className="mt-2.5 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      lastProgressTimeRef.current = Date.now();
                      isStalledRef.current = false;
                      setIsStalled(false);
                    }}
                    className="flex-1 py-1.5 px-3 text-xs font-semibold bg-white dark:bg-neutral-800 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 rounded-md hover:bg-amber-50 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
                  >
                    Keep waiting
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAction('stop')}
                    className="flex-1 py-1.5 px-3 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-md transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Stop-requested status */}
            {isStopRequested && (
              <p className="mt-2 text-xs text-rose-500 dark:text-rose-400 leading-snug">
                {showStopHint
                  ? 'Still waiting for the AI response \u2014 this can take up to a few minutes.'
                  : 'Waiting for the current AI call to finish\u2026'}
              </p>
            )}
          </div>
        )}

        {/* Supporting text fallback */}
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
