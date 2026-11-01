'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  X, 
  Check, 
  AlertTriangle, 
  RotateCcw, 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Code, 
  Table as TableIcon,
  Loader2,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { 
  ClassPlanRow, 
  ClassPlanData,
  VALID_TRIGGERS, 
  DEFAULT_DATASOURCES, 
  parseLockedPlan, 
  renderLockedPlan, 
  validateClassPlanRows 
} from '../../utils/classPlanUtils';

export type { ClassPlanData };


interface ClassPlanApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  runId: string;
  initialPlan: ClassPlanData;
  registeredDatasources?: string[];
  onApprove: (text: string, baseVersion: number) => Promise<void>;
  onSaveDraft: (text: string, baseVersion: number) => Promise<ClassPlanData>;
  onRegenerate: () => Promise<ClassPlanData>;
  onReject: () => Promise<void>;
  onFetchServerPlan: () => Promise<ClassPlanData | null>;
}

export const ClassPlanApprovalModal: React.FC<ClassPlanApprovalModalProps> = ({
  isOpen,
  onClose,
  runId,
  initialPlan,
  registeredDatasources = [],
  onApprove,
  onSaveDraft,
  onRegenerate,
  onReject,
  onFetchServerPlan,
}) => {
  const [viewMode, setViewMode] = useState<'table' | 'raw'>('table');
  const [classes, setClasses] = useState<ClassPlanRow[]>([]);
  const [rawText, setRawText] = useState<string>('');
  const [unmetText, setUnmetText] = useState<string>('');
  const [version, setVersion] = useState<number>(1);
  const [source, setSource] = useState<'generated' | 'edited' | 'seeded'>('generated');
  const [serverErrors, setServerErrors] = useState<Record<number, string[]>>({});
  const [conflictError, setConflictError] = useState<{ serverVersion: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<'approve' | 'draft' | 'regenerate' | 'reject' | null>(null);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string | null>(null);

  // Initialize from initialPlan
  useEffect(() => {
    if (isOpen && initialPlan) {
      let initClasses = initialPlan.classes || [];
      let initText = initialPlan.text || '';
      let initUnmet = '';

      if (initText && (!initClasses || initClasses.length === 0)) {
        const parsed = parseLockedPlan(initText);
        initClasses = parsed.classes;
        initUnmet = parsed.unmetText;
      } else if (initClasses.length > 0 && !initText) {
        initText = renderLockedPlan(initClasses);
      }

      setClasses(initClasses);
      setRawText(initText);
      setUnmetText(initUnmet);
      setVersion(initialPlan.version || 1);
      setSource(initialPlan.source || 'generated');
      setConflictError(null);
      setServerErrors({});
      setSaveSuccessNotice(null);
    }
  }, [isOpen, initialPlan]);

  // Combined available datasources
  const availableDatasources = useMemo(() => {
    const set = new Set<string>(DEFAULT_DATASOURCES);
    registeredDatasources.forEach((ds) => set.add(ds));
    classes.forEach((c) => {
      if (c.datasource) set.add(c.datasource);
    });
    return Array.from(set);
  }, [registeredDatasources, classes]);

  // Inline client-side validation errors
  const clientErrors = useMemo(() => {
    return validateClassPlanRows(classes, availableDatasources);
  }, [classes, availableDatasources]);

  // Merge client errors and server 422 errors
  const mergedErrorsByLine = useMemo(() => {
    const merged: Record<number, string[]> = { ...clientErrors };
    Object.entries(serverErrors).forEach(([lineStr, errs]) => {
      const line = Number(lineStr);
      if (!merged[line]) merged[line] = [];
      errs.forEach((e) => {
        if (!merged[line].includes(e)) merged[line].push(e);
      });
    });
    return merged;
  }, [clientErrors, serverErrors]);

  const hasErrors = Object.keys(mergedErrorsByLine).length > 0 || classes.length === 0;

  // Sync to Raw Text
  const syncToRawText = useCallback((currentClasses: ClassPlanRow[], currentUnmet?: string) => {
    const rendered = renderLockedPlan(currentClasses, currentUnmet ?? unmetText);
    setRawText(rendered);
  }, [unmetText]);

  // Sync from Raw Text
  const syncFromRawText = useCallback((textVal: string) => {
    const parsed = parseLockedPlan(textVal);
    setClasses(parsed.classes);
    setUnmetText(parsed.unmetText);
  }, []);

  // Switch view mode
  const handleToggleViewMode = (mode: 'table' | 'raw') => {
    if (mode === 'raw') {
      syncToRawText(classes, unmetText);
    } else {
      syncFromRawText(rawText);
    }
    setViewMode(mode);
  };

  // Table row changes
  const handleRowChange = (index: number, field: keyof ClassPlanRow, value: string) => {
    setClasses((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      syncToRawText(updated, unmetText);
      return updated;
    });
    // Clear server error for this row on edit
    if (serverErrors[index + 1]) {
      setServerErrors((prev) => {
        const next = { ...prev };
        delete next[index + 1];
        return next;
      });
    }
  };

  // Move row
  const handleMoveRow = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= classes.length) return;

    setClasses((prev) => {
      const updated = [...prev];
      const temp = updated[index];
      updated[index] = updated[targetIdx];
      updated[targetIdx] = temp;
      // Auto renumber
      const renumbered = updated.map((c, i) => ({ ...c, number: i + 1 }));
      syncToRawText(renumbered, unmetText);
      return renumbered;
    });
  };

  // Delete row
  const handleDeleteRow = (index: number) => {
    setClasses((prev) => {
      const filtered = prev.filter((_, i) => i !== index);
      const renumbered = filtered.map((c, i) => ({ ...c, number: i + 1 }));
      syncToRawText(renumbered, unmetText);
      return renumbered;
    });
  };

  // Add row
  const handleAddRow = () => {
    setClasses((prev) => {
      const nextNum = prev.length + 1;
      const newRow: ClassPlanRow = {
        number: nextNum,
        className: `Class_${nextNum}`,
        datasource: availableDatasources[0] || 'Active_TaxSys',
        trigger: '2',
      };
      const updated = [...prev, newRow];
      syncToRawText(updated, unmetText);
      return updated;
    });
  };

  // Action: Save Draft (PUT)
  const handleSaveDraft = async () => {
    const currentText = viewMode === 'raw' ? rawText : renderLockedPlan(classes, unmetText);
    setActionLoading('draft');
    setConflictError(null);
    setSaveSuccessNotice(null);

    try {
      const updated = await onSaveDraft(currentText, version);
      setVersion(updated.version);
      setSource('edited');
      setSaveSuccessNotice(`Draft saved (v${updated.version})`);
      setTimeout(() => setSaveSuccessNotice(null), 3000);
    } catch (err: any) {
      if (err.status === 409) {
        // Version conflict
        const match = err.message?.match(/current version is (\d+)/);
        const serverV = match ? parseInt(match[1], 10) : version + 1;
        setConflictError({ serverVersion: serverV });
      } else if (err.status === 422 && err.errors) {
        const errorMap: Record<number, string[]> = {};
        err.errors.forEach((e: any) => {
          const line = e.line || 1;
          if (!errorMap[line]) errorMap[line] = [];
          errorMap[line].push(e.message);
        });
        setServerErrors(errorMap);
      }
    } finally {
      setActionLoading(null);
    }
  };

  // Action: Approve & Generate (POST approve)
  const handleApprove = async () => {
    if (hasErrors) return;
    const currentText = viewMode === 'raw' ? rawText : renderLockedPlan(classes, unmetText);
    setActionLoading('approve');
    setConflictError(null);

    try {
      await onApprove(currentText, version);
      onClose();
    } catch (err: any) {
      if (err.status === 409) {
        const match = err.message?.match(/current version is (\d+)/);
        const serverV = match ? parseInt(match[1], 10) : version + 1;
        setConflictError({ serverVersion: serverV });
      } else if (err.status === 422 && err.errors) {
        const errorMap: Record<number, string[]> = {};
        err.errors.forEach((e: any) => {
          const line = e.line || 1;
          if (!errorMap[line]) errorMap[line] = [];
          errorMap[line].push(e.message);
        });
        setServerErrors(errorMap);
      }
    } finally {
      setActionLoading(null);
    }
  };

  // Action: Regenerate
  const handleRegenerate = async () => {
    setActionLoading('regenerate');
    setConflictError(null);
    setServerErrors({});
    try {
      const regenerated = await onRegenerate();
      let newClasses = regenerated.classes || [];
      let newText = regenerated.text || '';
      let newUnmet = '';

      if (newText && (!newClasses || newClasses.length === 0)) {
        const parsed = parseLockedPlan(newText);
        newClasses = parsed.classes;
        newUnmet = parsed.unmetText;
      } else if (newClasses.length > 0 && !newText) {
        newText = renderLockedPlan(newClasses);
      }

      setClasses(newClasses);
      setRawText(newText);
      setUnmetText(newUnmet);
      setVersion(regenerated.version);
      setSource('generated');
    } catch (err: any) {
      alert(err.message || 'Failed to regenerate class plan');
    } finally {
      setActionLoading(null);
    }
  };

  // Action: Reject
  const handleReject = async () => {
    if (!window.confirm('Reject class plan and stop class generation?')) return;
    setActionLoading('reject');
    try {
      await onReject();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to reject class plan');
    } finally {
      setActionLoading(null);
    }
  };

  // Conflict resolution handlers
  const handleReloadServerVersion = async () => {
    try {
      const serverPlan = await onFetchServerPlan();
      if (serverPlan) {
        let newClasses = serverPlan.classes || [];
        let newText = serverPlan.text || '';
        let newUnmet = '';

        if (newText && (!newClasses || newClasses.length === 0)) {
          const parsed = parseLockedPlan(newText);
          newClasses = parsed.classes;
          newUnmet = parsed.unmetText;
        } else if (newClasses.length > 0 && !newText) {
          newText = renderLockedPlan(newClasses);
        }

        setClasses(newClasses);
        setRawText(newText);
        setUnmetText(newUnmet);
        setVersion(serverPlan.version);
        setSource(serverPlan.source);
        setConflictError(null);
        setServerErrors({});
      }
    } catch (err: any) {
      alert(err.message || 'Failed to fetch server plan');
    }
  };

  const handleKeepMine = () => {
    if (conflictError) {
      setVersion(conflictError.serverVersion);
      setConflictError(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl flex flex-col w-full max-w-4xl max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
                Review Locked Class Plan
              </h2>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                {source}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                v{version}
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              {classes.length} classes planned • Approve to generate exact domain specifications
            </p>
          </div>

          <div className="flex items-center space-x-2">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 p-0.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-xs">
              <button
                type="button"
                onClick={() => handleToggleViewMode('table')}
                className={`flex items-center space-x-1 px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                <TableIcon className="h-3.5 w-3.5" />
                <span>Table</span>
              </button>
              <button
                type="button"
                onClick={() => handleToggleViewMode('raw')}
                className={`flex items-center space-x-1 px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  viewMode === 'raw'
                    ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                <Code className="h-3.5 w-3.5" />
                <span>Raw Text</span>
              </button>
            </div>

            {/* Close Button (Does NOT reject, leaves PENDING_APPROVAL) */}
            <button
              type="button"
              onClick={onClose}
              title="Close modal (plan remains pending review)"
              className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* 409 Conflict Banner */}
        {conflictError && (
          <div className="bg-amber-500/10 border-b border-amber-300 dark:border-amber-700/60 p-3 px-6 text-amber-900 dark:text-amber-200 flex items-center justify-between text-xs animate-in fade-in duration-150">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
              <span>
                <strong>Version conflict:</strong> The class plan was modified on the server (v{conflictError.serverVersion}).
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleReloadServerVersion}
                className="px-2.5 py-1 bg-white dark:bg-neutral-900 border border-amber-300 dark:border-amber-700 rounded text-xs font-semibold hover:bg-amber-50 dark:hover:bg-neutral-800 cursor-pointer"
              >
                Reload server version
              </button>
              <button
                type="button"
                onClick={handleKeepMine}
                className="px-2.5 py-1 bg-amber-600 text-white rounded text-xs font-semibold hover:bg-amber-700 cursor-pointer"
              >
                Keep mine (re-save with v{conflictError.serverVersion})
              </button>
            </div>
          </div>
        )}

        {/* Save Draft Success Banner */}
        {saveSuccessNotice && (
          <div className="bg-emerald-50 dark:bg-emerald-950/30 border-b border-emerald-200 dark:border-emerald-800 p-2.5 px-6 text-emerald-800 dark:text-emerald-300 flex items-center space-x-2 text-xs">
            <Check className="h-3.5 w-3.5 text-emerald-600" />
            <span>{saveSuccessNotice}</span>
          </div>
        )}

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {viewMode === 'table' ? (
            <div className="space-y-3">
              <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-neutral-100/70 dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 font-semibold">
                      <th className="py-2.5 px-3 w-12 text-center">#</th>
                      <th className="py-2.5 px-3">ClassName</th>
                      <th className="py-2.5 px-3 w-48">Datasource</th>
                      <th className="py-2.5 px-3 w-28">Trigger</th>
                      <th className="py-2.5 px-3 w-24 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {classes.map((cls, idx) => {
                      const rowErrors = mergedErrorsByLine[idx + 1] || [];
                      const hasRowError = rowErrors.length > 0;

                      return (
                        <React.Fragment key={idx}>
                          <tr className={`hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors ${
                            hasRowError ? 'bg-rose-50/30 dark:bg-rose-950/20' : ''
                          }`}>
                            {/* Number (Read-only, auto-renumbered) */}
                            <td className="py-2 px-3 text-center font-mono text-neutral-400 dark:text-neutral-500 font-semibold select-none">
                              {idx + 1}
                            </td>

                            {/* ClassName */}
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={cls.className}
                                onChange={(e) => handleRowChange(idx, 'className', e.target.value)}
                                placeholder="e.g. Active_TaxSys"
                                className={`w-full px-2.5 py-1.5 rounded-lg border font-mono text-xs bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 focus:outline-none transition-colors ${
                                  hasRowError
                                    ? 'border-rose-300 dark:border-rose-700 focus:border-rose-500'
                                    : 'border-neutral-300 dark:border-neutral-700 focus:border-neutral-500'
                                }`}
                              />
                            </td>

                            {/* Datasource */}
                            <td className="py-2 px-3">
                              <select
                                value={cls.datasource}
                                onChange={(e) => handleRowChange(idx, 'datasource', e.target.value)}
                                className="w-full px-2.5 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 font-mono text-xs bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-neutral-500 cursor-pointer"
                              >
                                {availableDatasources.map((ds) => (
                                  <option key={ds} value={ds}>
                                    {ds}
                                  </option>
                                ))}
                              </select>
                            </td>

                            {/* Trigger */}
                            <td className="py-2 px-3">
                              <select
                                value={cls.trigger}
                                onChange={(e) => handleRowChange(idx, 'trigger', e.target.value)}
                                className="w-full px-2.5 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 font-mono text-xs bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-neutral-500 cursor-pointer"
                              >
                                {VALID_TRIGGERS.map((trig) => (
                                  <option key={trig} value={trig}>
                                    {trig}
                                  </option>
                                ))}
                              </select>
                            </td>

                            {/* Actions: Move Up, Move Down, Delete */}
                            <td className="py-2 px-3 text-right">
                              <div className="flex items-center justify-end space-x-1">
                                <button
                                  type="button"
                                  onClick={() => handleMoveRow(idx, 'up')}
                                  disabled={idx === 0}
                                  title="Move Up"
                                  className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                                >
                                  <ArrowUp className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleMoveRow(idx, 'down')}
                                  disabled={idx === classes.length - 1}
                                  title="Move Down"
                                  className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                                >
                                  <ArrowDown className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRow(idx)}
                                  title="Delete Class"
                                  className="p-1 text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* Inline validation errors below row */}
                          {hasRowError && (
                            <tr className="bg-rose-50/50 dark:bg-rose-950/30">
                              <td colSpan={5} className="py-1 px-3 pl-12 text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                                <div className="flex items-center space-x-1.5">
                                  <AlertCircle className="h-3 w-3 shrink-0" />
                                  <span>{rowErrors.join(' • ')}</span>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Add Class Button */}
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleAddRow}
                  className="flex items-center space-x-1.5 px-3 py-1.5 border border-dashed border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Class</span>
                </button>
                <span className="text-[11px] text-neutral-500 font-mono">
                  Total classes: {classes.length}
                </span>
              </div>
            </div>
          ) : (
            /* Raw Text Editor */
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
                <span>Exact locked class plan text representation:</span>
                <span className="font-mono text-[10px]">Format: N. ClassName: ... | Datasource: ... | Trigger: ...</span>
              </div>
              <textarea
                value={rawText}
                onChange={(e) => {
                  setRawText(e.target.value);
                  syncFromRawText(e.target.value);
                }}
                spellCheck={false}
                rows={16}
                className="w-full p-4 font-mono text-xs leading-relaxed rounded-xl border border-neutral-300 dark:border-neutral-700 bg-[#0d0d0d] text-neutral-200 focus:outline-none focus:border-neutral-500 resize-y"
              />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
          {/* Left Actions: Reject & Regenerate */}
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleReject}
              disabled={actionLoading !== null}
              className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg border border-transparent hover:border-rose-200 dark:hover:border-rose-800 transition-colors cursor-pointer disabled:opacity-50"
            >
              {actionLoading === 'reject' ? 'Rejecting...' : 'Reject'}
            </button>
            <button
              type="button"
              onClick={handleRegenerate}
              disabled={actionLoading !== null}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className={`h-3.5 w-3.5 ${actionLoading === 'regenerate' ? 'animate-spin' : ''}`} />
              <span>{actionLoading === 'regenerate' ? 'Regenerating...' : 'Regenerate Plan'}</span>
            </button>
          </div>

          {/* Right Actions: Save Draft & Approve */}
          <div className="flex items-center space-x-2.5">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={actionLoading !== null}
              className="px-3.5 py-1.5 text-xs font-semibold text-neutral-800 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              {actionLoading === 'draft' ? 'Saving...' : 'Save draft'}
            </button>

            <button
              type="button"
              onClick={handleApprove}
              disabled={actionLoading !== null || hasErrors}
              title={hasErrors ? 'Fix validation errors before approving' : 'Approve and generate classes'}
              className="flex items-center space-x-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100 rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {actionLoading === 'approve' ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Approving...</span>
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>Approve & generate</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
