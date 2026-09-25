'use client';

import React, { useEffect, useCallback } from 'react';
import { useWorkflow } from '../../context/WorkflowContext';
import { Loader2, Pause, Play, Square, XCircle, AlertCircle, CheckCircle } from 'lucide-react';
import { API_URL } from '../../services/api/config';

export interface GenerationProcessingModalProps {
  isOpen?: boolean;
  operationLabel?: string;
  supportingText?: string;
}

export const GenerationProcessingModal: React.FC<GenerationProcessingModalProps> = ({
  isOpen: propIsOpen,
  operationLabel: propOperationLabel,
  supportingText = 'DataTwin Engine is processing your request',
}) => {
  const { isGeneratingModalOpen, generationOperationLabel, workflow, activeOperation, setActiveOperation, closeGeneratingModal } = useWorkflow();


  const isOpen = propIsOpen !== undefined ? propIsOpen : isGeneratingModalOpen;

  // Polling for backend operation status if we have an activeOperation
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const pollStatus = async () => {
      if (!activeOperation?.operationId) return;
      if (['COMPLETED', 'FAILED', 'STOPPED'].includes(activeOperation.status)) return;
      
      try {
        const res = await fetch(`${API_URL}/operations/${activeOperation.operationId}/status`);
        if (res.ok) {
          const data = await res.json();
          // Update only if it changed to prevent constant re-renders
          if (data.status !== activeOperation.status || data.message !== activeOperation.message || data.progress !== activeOperation.progress) {
             setActiveOperation(data);
          }
          if (data.status === 'COMPLETED') {
             setTimeout(() => {
               setActiveOperation(null);
               closeGeneratingModal();
             }, 1500);
          }
        }
      } catch (err) {
        console.error('Failed to poll operation status:', err);
      }
      
      timeoutId = setTimeout(pollStatus, 2000); // Poll every 2 seconds
    };

    if (isOpen && activeOperation) {
      timeoutId = setTimeout(pollStatus, 2000);
    }
    
    return () => clearTimeout(timeoutId);
  }, [isOpen, activeOperation, setActiveOperation, closeGeneratingModal]);

  if (!isOpen) return null;

  const handleAction = async (action: 'pause' | 'resume' | 'stop') => {
    if (!activeOperation?.operationId) return;

    try {
      if (action === 'pause') setActiveOperation({ ...activeOperation, status: 'PAUSE_REQUESTED' });
      if (action === 'resume') setActiveOperation({ ...activeOperation, status: 'RESUME_REQUESTED' });
      if (action === 'stop') setActiveOperation({ ...activeOperation, status: 'STOP_REQUESTED' });

      await fetch(`${API_URL}/operations/${activeOperation.operationId}/${action}`, { method: 'POST' });

      // Immediately poll for the updated status
      const res = await fetch(`${API_URL}/operations/${activeOperation.operationId}/status`);
      if (res.ok) {
        const data = await res.json();
        setActiveOperation(data);
      }
    } catch (err) {
      console.error(`Failed to ${action} operation:`, err);
    }
  };

  // Resolve operation label: explicit prop -> context label -> fallback stage derivation
  const resolveOperationLabel = (): string => {
    if (activeOperation?.message) return activeOperation.message;
    if (propOperationLabel) return propOperationLabel;
    if (generationOperationLabel && generationOperationLabel !== 'Generating…') {
      return generationOperationLabel;
    }
    switch (workflow.stage) {
      case 'business-input':
        return workflow.businessInput.isBusinessRequirementGenerated
          ? 'Generating Requirements…'
          : 'Generating Business Requirement…';
      case 'requirements':
        return 'Generating Schema Classes…';
      case 'classes':
        return 'Generating Schema…';
      default:
        return generationOperationLabel || 'Generating…';
    }
  };

  const label = resolveOperationLabel();
  const currentStatus = activeOperation?.status || 'RUNNING';

  const renderButtons = () => {
    switch (currentStatus) {
      case 'RUNNING':
        return (
          <>
            <button
              onClick={() => handleAction('pause')}
              className="flex-1 flex justify-center items-center py-2 px-3 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 rounded-lg text-xs font-semibold transition-colors"
            >
              <Pause className="w-3.5 h-3.5 mr-1.5" />
              Pause
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
            Stopping...
          </button>
        );
      case 'STOPPED':
        return (
          <button
            onClick={() => {
              setActiveOperation(null);
              closeGeneratingModal();
            }}
            className="w-full flex justify-center items-center py-2 px-3 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-900 rounded-lg text-xs font-semibold transition-colors"
          >
            <XCircle className="w-3.5 h-3.5 mr-1.5" />
            Close
          </button>
        );
      case 'FAILED':
        return (
          <button
            onClick={() => {
              setActiveOperation(null);
              closeGeneratingModal();
            }}
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

  const getStatusIcon = () => {
    switch (currentStatus) {
      case 'FAILED':
        return <AlertCircle className="h-6 w-6 text-rose-500 mb-4" />;
      case 'COMPLETED':
        return <CheckCircle className="h-6 w-6 text-emerald-500 mb-4" />;
      case 'STOPPED':
        return <Square className="h-6 w-6 text-neutral-500 mb-4" />;
      case 'PAUSED':
        return <Pause className="h-6 w-6 text-amber-500 mb-4" />;
      default:
        return <Loader2 className="h-6 w-6 text-neutral-700 dark:text-neutral-300 animate-spin stroke-[2.25] mb-4" />;
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-live="polite"
      aria-label={label}
      className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/40 backdrop-blur-[2px] p-4 animate-in fade-in duration-150"
    >
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 rounded-2xl w-full max-w-[340px] p-6 shadow-xl dark:shadow-2xl text-center text-neutral-900 dark:text-neutral-100 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-center">
          {getStatusIcon()}
        </div>

        <h3 className="text-sm font-semibold text-neutral-900 dark:text-white tracking-tight">
          {label}
        </h3>

        {activeOperation?.error ? (
          <p className="text-xs text-rose-500 dark:text-rose-400 mt-1.5 leading-relaxed">
            {activeOperation.error}
          </p>
        ) : supportingText ? (
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1.5 leading-relaxed">
            {activeOperation?.progress ? `Progress: ${activeOperation.progress}%` : supportingText}
          </p>
        ) : null}

        {/* Action Buttons */}
        {(activeOperation || currentStatus !== 'RUNNING') && (
          <div className="mt-5 flex items-center gap-2">
            {renderButtons()}
          </div>
        )}
      </div>
    </div>
  );
};
