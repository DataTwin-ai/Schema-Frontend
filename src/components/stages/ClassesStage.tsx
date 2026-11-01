'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useWorkflow } from '../../context/WorkflowContext';
import { useAuth } from '../../context/AuthContext';
import { 
  ChevronDown, 
  ChevronRight, 
  Lock, 
  ArrowRight, 
  ArrowLeft, 
  Edit3, 
  Plus, 
  Check, 
  X, 
  History as HistoryIcon, 
  Clock,
  Trash2,
  Layers,
  AlertTriangle,
  Sparkles,
  Paperclip,
  Eye,
  Clipboard
} from 'lucide-react';
import { SchemaClass, ClassVersion, SchemaComponent, SchemaGenerationWorkflow } from '../../types';
import { StageActionBar } from '../layout/StageActionBar';
import { SaveDraftButton } from '../common/SaveDraftButton';
import { API_URL } from '../../services/api/config';
import { RequirementCategoryChip } from '../common/RequirementCategoryChip';
import { VersionDiffViewer, VersionOption } from '../requirements/VersionDiffViewer';
import { formatClassSpecification } from '../../utils/classUtils';
import { useStageData } from '../../hooks/useStageData';
import { GenerateWithInfoModal } from '../common/GenerateWithInfoModal';
import { ClassViewModal } from '../classes/ClassViewModal';
import { AdditionalRequirementUpload } from '../common/AdditionalRequirementUpload';
import { SCDPInputsModal } from './SCDPInputsModal';
import { StaleStageBanner } from '../common/StaleStageBanner';
import { PasteExistingModal, PasteOption } from '../common/PasteExistingModal';
import { ClassPlanApprovalModal } from '../common/ClassPlanApprovalModal';
import { apiClassPlanService, classService } from '../../services';
import { normalizeClassPlanData, ClassPlanData, DEFAULT_DATASOURCES } from '../../utils/classPlanUtils';
import { pollOperation, StoppedError, UnknownStatusError } from '../../services/api/pollOperation';

interface ClassRowProps {
  item: SchemaClass;
  isEditing: boolean;
  isHistoryOpen: boolean;
  onView: () => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: (updated: Partial<SchemaClass>) => void;
  onDelete?: () => void;
  onOpenHistory: () => void;
  userName: string;
  runId: string;
  onCloseHistory: () => void;
}

const ClassRow: React.FC<ClassRowProps> = ({
  item,
  isEditing,
  isHistoryOpen,
  onView,
  onStartEdit,
  onCancelEdit,
  onSave,
  onDelete,
  onOpenHistory,
  onCloseHistory,
  userName,
  runId,
}) => {
  const { files, updateFileContent, saveFile } = useWorkflow();
  const rawFileName = typeof item.metadata?.fileName === 'string' ? item.metadata.fileName : undefined;
  const fileKey: string = rawFileName
    ? (rawFileName.startsWith('output/') ? rawFileName : `output/class_prompt/${rawFileName}`)
    : 'output/class_wise_prompts.txt';
  const fileRecord = files[fileKey];

  const [editClassName, setEditClassName] = useState(item.className);
  const [editDatasource, setEditDatasource] = useState(item.datasource);
  const [editGrain, setEditGrain] = useState(item.grain);
  const [editPurpose, setEditPurpose] = useState(item.purpose);
  const [editComponents, setEditComponents] = useState<SchemaComponent[]>(item.components || []);
  const [editRawText, setEditRawText] = useState(fileRecord?.content ?? item.rawText ?? '');
  const [versions, setVersions] = useState<ClassVersion[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const loadVersions = useCallback(async () => {
    if (!item.metadata?.fileName) return;
    try {
      const res = await fetch(`${API_URL}/class-prompts/${item.metadata.fileName}/versions?runId=${runId}`);
      if (res.ok) {
        const data = await res.json();
        setVersions(data);
      }
    } catch (e) {}
  }, [item.metadata?.fileName, runId]);

  useEffect(() => {
    if (isHistoryOpen) {
      loadVersions();
    }
  }, [isHistoryOpen, loadVersions]);
  
  useEffect(() => {
    const handleFocus = () => { if (isHistoryOpen) loadVersions(); };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [isHistoryOpen, loadVersions]);


  // Sorted historical versions (newest first)
  const sortedHist = useMemo(() => {
    return [...versions].sort((a, b) => b.versionNumber - a.versionNumber);
  }, [versions]);

  // Selected Previous Version (Left) and Selected Current Version (Right)
  const [selectedPreviousVersionId, setSelectedPreviousVersionId] = useState<string>('');
  const [selectedCurrentVersionId, setSelectedCurrentVersionId] = useState<string>('current');

  useEffect(() => {
    if (versions.length > 0) {
      const latestPrev = sortedHist[0];
      setSelectedPreviousVersionId(latestPrev ? latestPrev.id : '');
      setSelectedCurrentVersionId('current');
    } else {
      setSelectedPreviousVersionId('');
      setSelectedCurrentVersionId('current');
    }
  }, [versions, isHistoryOpen, sortedHist]);

  // Compact selectable options for dropdowns
  const versionOptions: VersionOption[] = useMemo(() => {
    const currentOpt: VersionOption = {
      id: 'current',
      label: 'Current',
    };

    const histOpts: VersionOption[] = sortedHist.map((v) => ({
      id: v.id,
      label: `v${v.versionNumber}`,
    }));

    return [currentOpt, ...histOpts];
  }, [sortedHist]);

  // Resolve snapshot data for selected class version
  const resolveVersionData = useCallback(
    (id: string) => {
      if (id === 'current' || !id) {
        const currentData = isEditing ? {
          className: editClassName,
          datasource: editDatasource,
          grain: editGrain,
          purpose: editPurpose,
          components: editComponents
        } : item;
        
        return {
          id: 'current',
          isCurrent: true,
          title: `Class #${item.classNumber} \u00B7 ${currentData.className}`,
          content: formatClassSpecification(currentData as any),
          actor: userName,
          timestamp: isEditing ? 'Active Current State (Unsaved)' : 'Saved State',
          changeSummary: isEditing ? 'Live editable preview' : 'Saved source of truth',
        };
      }

      const hist = versions.find((v) => v.id === id) || sortedHist[0];
      if (hist) {
        return {
          id: hist.id,
          isCurrent: false,
          title: hist.title || `Class #${item.classNumber} \u00B7 ${hist.className}`,
          content: hist.specification || formatClassSpecification({
            className: hist.className,
            datasource: hist.datasource,
            grain: hist.grain,
            purpose: hist.purpose,
          }),
          actor: hist.actor,
          timestamp: hist.timestamp,
          changeSummary: hist.changeSummary || 'Domain class configuration edited',
        };
      }

      return {
        id: 'current',
        isCurrent: true,
        title: `Class #${item.classNumber} \u00B7 ${item.className}`,
        content: formatClassSpecification(item),
        actor: userName,
        timestamp: 'Active Current State',
        changeSummary: 'Live editable source of truth in workspace',
      };
    },
    [item, versions, sortedHist]
  );

  const previousData = useMemo(() => resolveVersionData(selectedPreviousVersionId), [resolveVersionData, selectedPreviousVersionId]);
  const currentData = useMemo(() => resolveVersionData(selectedCurrentVersionId), [resolveVersionData, selectedCurrentVersionId]);

  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    const minHeight = 100;
    const maxHeight = 520;
    const calculatedHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight);
    textarea.style.height = `${calculatedHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }, []);

  // Sync state on edit activation
  useEffect(() => {
    if (isEditing) {
      setEditClassName(item.className);
      setEditDatasource(item.datasource);
      setEditGrain(item.grain);
      setEditPurpose(item.purpose);
      setEditComponents(JSON.parse(JSON.stringify(item.components || [])));
      setEditRawText(fileRecord?.content ?? item.rawText ?? '');
    }
  }, [isEditing, item, fileRecord?.content]);

  // Adjust height on edit or content change
  useEffect(() => {
    if (isEditing) {
      const frameId = requestAnimationFrame(adjustTextareaHeight);
      return () => cancelAnimationFrame(frameId);
    }
  }, [isEditing, editPurpose, adjustTextareaHeight]);

  const [saveError, setSaveError] = useState<string | null>(null);
  
  
  const handleRestore = async (versionId: string) => {
    if (!confirm(`Restore v${versionId}? Your current state is kept as a version.`)) return;
    if (!item.metadata?.fileName) return;
    try {
      const res = await fetch(`${API_URL}/class-prompts/${item.metadata.fileName}/versions/${versionId}/restore?runId=${runId}`, {
        method: 'POST',
        headers: { 'X-User-Name': userName }
      });
      if (res.ok) {
        const returnedClass = await res.json();
        onSave({ ...returnedClass, id: item.id });
        setEditClassName(returnedClass.className || item.className);
        setEditDatasource(returnedClass.datasource || item.datasource);
        setEditGrain(returnedClass.grain || item.grain);
        setEditPurpose(returnedClass.purpose || item.purpose);
        setEditComponents(returnedClass.components || item.components || []);
        const restoredText = returnedClass.rawText || item.rawText || '';
        setEditRawText(restoredText);
        updateFileContent(fileKey, restoredText, false);
        if (isHistoryOpen) loadVersions();
      }
    } catch (e) {
      alert("Restore failed");
    }
  };

  const handleSave = async () => {
    setSaveError(null);
    const updatedFields = { rawText: editRawText };
    try {
      if (item.metadata?.fileName) {
        updateFileContent(fileKey, editRawText, true);
        const saveRes = await saveFile(fileKey);
        if (!saveRes.success) {
          throw new Error(saveRes.error || 'Failed to save file');
        }

        const res = await fetch(`${API_URL}/class-prompts/${item.metadata.fileName}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'X-User-Name': userName },
          body: JSON.stringify(updatedFields)
        });
        if (res.ok) {
          const returnedClass = await res.json();
          onSave({ ...returnedClass, id: item.id });
        } else {
          onSave({ ...item, rawText: editRawText });
        }
        if (isHistoryOpen) loadVersions();
      } else {
        onSave(updatedFields);
      }
    } catch (e: any) {
      setSaveError(e.message || 'Failed to save class');
    }
  };

  const lineCount = editPurpose.split('\n').length;
  const charCount = editPurpose.length;
  const primaryCompType = item.components && item.components.length > 0 ? item.components[0].type : undefined;

  return (
    <div
      className={`rounded-xl border transition-all overflow-hidden ${
        isEditing || isHistoryOpen
          ? 'bg-neutral-100/90 dark:bg-neutral-800/90 border-neutral-400 dark:border-neutral-600 shadow-sm ring-1 ring-neutral-400/20 dark:ring-neutral-600/30'
          : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 shadow-2xs'
      }`}
    >
      {/* Collapsed Header & Summary */}
      <div className="p-4 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5 min-w-0 pr-2">
            <span className="font-mono text-xs font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 px-2 py-0.5 rounded border border-neutral-200 dark:border-neutral-700 shrink-0">
              Class #{item.classNumber}
            </span>
            <h3 className="text-xs font-bold text-neutral-900 dark:text-white truncate">
              {item.className}
            </h3>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {/* Informational Metadata Tags */}
            <span
              className="inline-flex items-center text-[10px] font-mono text-neutral-500 dark:text-neutral-400 bg-neutral-100/60 dark:bg-neutral-800/40 px-1.5 py-0.5 rounded select-none"
              title={`Datasource: ${item.datasource}`}
            >
              DS: {item.datasource}
            </span>

            <span
              className="inline-flex items-center text-[10px] font-mono text-neutral-500 dark:text-neutral-400 bg-neutral-100/60 dark:bg-neutral-800/40 px-1.5 py-0.5 rounded select-none"
              title={`Grain: ${item.grain}`}
            >
              Grain: {item.grain}
            </span>

            {primaryCompType && (
              <RequirementCategoryChip category={primaryCompType} />
            )}

            {/* Action Buttons */}
            {!isEditing && !isHistoryOpen && (
              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={onView}
                  className="px-2.5 py-1 rounded-md text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white bg-neutral-100/80 hover:bg-neutral-200/80 dark:bg-neutral-800 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700 transition-colors flex items-center space-x-1 cursor-pointer shadow-2xs"
                  title="View domain class details and output"
                >
                  <Eye className="h-3 w-3 text-neutral-500" />
                  <span>View</span>
                </button>

                <button
                  type="button"
                  onClick={onOpenHistory}
                  className="px-2.5 py-1 rounded-md text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white bg-neutral-100/80 hover:bg-neutral-200/80 dark:bg-neutral-800 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700 transition-colors flex items-center space-x-1 cursor-pointer shadow-2xs"
                  title="Compare previous versions against current"
                >
                  <HistoryIcon className="h-3 w-3 text-neutral-500" />
                  <span>History</span>
                </button>

                <button
                  type="button"
                  onClick={onStartEdit}
                  className="px-2.5 py-1 rounded-md text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white bg-neutral-100/80 hover:bg-neutral-200/80 dark:bg-neutral-800 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700 transition-colors flex items-center space-x-1 cursor-pointer shadow-2xs"
                  title="Edit domain class"
                >
                  <Edit3 className="h-3 w-3" />
                  <span>Edit</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {!isEditing && !isHistoryOpen && (
          <>
            <p className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed font-sans">
              {item.purpose}
            </p>

            {/* Components Section */}
            {item.components && item.components.length > 0 && (
              <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800/80 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 block">
                  Components ({item.components.length})
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {item.components.map((comp) => (
                    <div
                      key={comp.id}
                      className="inline-flex items-center space-x-1.5 text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-100/70 dark:bg-neutral-800/50 text-neutral-700 dark:text-neutral-300 border border-neutral-200/60 dark:border-neutral-700/60 select-none"
                    >
                      <span className="font-semibold">{comp.name}</span>
                      <RequirementCategoryChip category={comp.type} />
                      {comp.expression && (
                        <span className="text-neutral-400 dark:text-neutral-500 text-[9px] font-normal truncate max-w-xs">
                          = {comp.expression}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Conditions / Gating if present */}
            {item.conditions && item.conditions.length > 0 && (
              <div className="p-2 rounded-lg bg-neutral-50 dark:bg-neutral-950 border border-neutral-200/70 dark:border-neutral-800/70 text-[11px] text-neutral-700 dark:text-neutral-300 flex items-start space-x-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-neutral-500 shrink-0 mt-0.5" />
                <span>Gate: {item.conditions[0]}</span>
              </div>
            )}

            {/* FULL CLASS SPECIFICATION Section */}
            <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800/80 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 block">
                FULL CLASS SPECIFICATION
              </span>
              <pre className="p-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200/70 dark:border-neutral-800/70 rounded-lg text-xs font-mono text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap break-words max-h-80 overflow-y-auto">
                {item.rawText ? item.rawText : 'Full class specification is not available.'}
              </pre>
            </div>

            {/* Footer Metadata */}
            <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-800/80 text-[11px] text-neutral-400 dark:text-neutral-500">
              <div className="flex items-center space-x-2">
                {versions.length > 0 && (
                  <span className="text-[10px] font-mono bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 px-1.5 py-0.2 rounded border border-neutral-200 dark:border-neutral-700">
                    {versions.length} prior {versions.length === 1 ? 'version' : 'versions'}
                  </span>
                )}
              </div>
              <span className="font-mono text-[10px]">{charCount.toLocaleString()} chars</span>
            </div>
          </>
        )}
      </div>

      {/* Expanded Inline Editor (Content-Aware Auto-Growing Height up to 520px with internal scroll) */}
      {isEditing && (
        <div className="border-t border-neutral-200 dark:border-neutral-700/80 bg-white dark:bg-neutral-950 p-4 space-y-3 animate-in fade-in duration-150">
          {/* Editor Header: Class Name and Save/Cancel Actions */}
          <div className="space-y-1.5 pb-2.5 border-b border-neutral-100 dark:border-neutral-800">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center space-x-2 min-w-0 flex-1">
                <span className="font-mono text-xs font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 px-2 py-0.5 rounded border border-neutral-200 dark:border-neutral-700 shrink-0">
                  Class #{item.classNumber}
                </span>
                <span className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                  Edit Class Configuration
                </span>
              </div>

              <div className="flex items-center space-x-2.5 shrink-0">
                <span className="text-[10px] font-mono text-neutral-400 dark:text-neutral-500 whitespace-nowrap">
                  {charCount.toLocaleString()} chars
                </span>

                {item.isCustomAdded && onDelete && (
                  <button
                    type="button"
                    onClick={onDelete}
                    className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-md transition-colors"
                    title="Delete Class"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={onCancelEdit}
                  className="px-2.5 py-1 text-xs text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSave}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:hover:bg-neutral-100 dark:text-neutral-900 rounded-md text-xs font-semibold transition-all shadow-2xs cursor-pointer"
                  title="Save configuration"
                  aria-label="Save configuration"
                >
                  <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                  <span>Save</span>
                </button>
              </div>
            </div>
          </div>

          {/* Raw Text Editor */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 block mb-2">
              Class Specification (Raw Text)
            </label>
            <textarea
              value={editRawText}
              onChange={(e) => {
                setEditRawText(e.target.value);
                updateFileContent(fileKey, e.target.value, true);
              }}
              className="w-full min-h-[400px] max-h-[600px] bg-[#0d0d0d] p-4 text-[11px] font-mono text-neutral-300 placeholder-neutral-600 rounded-lg border border-neutral-700 focus:outline-none focus:border-neutral-500 leading-relaxed resize-y"
            />
          </div>
        </div>
      )}

      {/* Expanded Inline History Comparison Workspace */}
      {isHistoryOpen && (
        <div className="border-t border-neutral-200 dark:border-neutral-700/80 bg-neutral-50/40 dark:bg-neutral-950 p-4 space-y-3.5 animate-in fade-in duration-150">
          {/* Comparison Header */}
          <div className="flex items-center justify-between pb-2.5 border-b border-neutral-200 dark:border-neutral-800">
            <div>
              <div className="flex items-center space-x-2">
                <HistoryIcon className="h-3.5 w-3.5 text-neutral-600 dark:text-neutral-400" />
                <span className="text-xs font-bold text-neutral-900 dark:text-white">
                  Class Version Comparison
                </span>
              </div>
              <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                <span className="font-mono font-semibold text-neutral-700 dark:text-neutral-300">Class #{item.classNumber}</span> \u00B7 {item.className}
              </div>
            </div>

            <button
              type="button"
              onClick={onCloseHistory}
              className="px-2.5 py-1 text-xs text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white flex items-center space-x-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md transition-colors cursor-pointer border border-neutral-200/80 dark:border-neutral-700/80"
              title="Close history comparison"
            >
              <X className="h-3.5 w-3.5" />
              <span>Close</span>
            </button>
          </div>

          {versions.length === 0 ? (
            <div className="p-6 text-center rounded-xl border border-dashed border-neutral-300 dark:border-neutral-800 bg-white dark:bg-neutral-900">
              <Clock className="h-5 w-5 text-neutral-400 mx-auto mb-1.5" />
              <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">No previous versions</p>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5">
                This domain class has not been modified since it was initially generated.
              </p>
            </div>
          ) : (
            <VersionDiffViewer
              previousTitle={previousData.title}
              currentTitle={currentData.title}
              previousContent={previousData.content}
              currentContent={currentData.content}
              previousActor={previousData.actor}
              previousTimestamp={previousData.timestamp}
              previousChangeSummary={previousData.changeSummary}
              isPreviousCurrent={previousData.isCurrent}
              currentActor={currentData.actor}
              currentTimestamp={currentData.timestamp}
              currentStatus={currentData.changeSummary}
              isCurrentReal={currentData.isCurrent}
              versionOptions={versionOptions}
              selectedPreviousVersionId={selectedPreviousVersionId}
              selectedCurrentVersionId={selectedCurrentVersionId}
              onSelectPreviousVersion={(id) => {
                if (id !== selectedCurrentVersionId) {
                  setSelectedPreviousVersionId(id);
                }
              }}
              onSelectCurrentVersion={(id) => {
                if (id !== selectedPreviousVersionId) {
                  setSelectedCurrentVersionId(id);
                }
              }}
            />
          )}
        </div>
      )}
    </div>
  );
};

const formatMismatch = (m: any): string => {
  if (typeof m === 'string') return m;
  const num = m.classNumber || m.class_no || m.class_number || m.line;
  const expected = m.expected || m.expectedClass || m.expected_class;
  const got = m.got || m.actual || m.actualClass || m.actual_class;
  if (num && expected && got) {
    return `Class ${num} expected ${expected}, got ${got}`;
  }
  if (num && expected) {
    return `Class ${num} expected ${expected}`;
  }
  return typeof m === 'object' ? JSON.stringify(m) : String(m);
};

export const ClassesStage: React.FC = () => {
  const { 
    workflow, 
    setStage,
    getClassVersions,
    updateClass, 
    addClass, 
    removeClass, 
    generateClasses,
    generateSchema,
    addAdditionalInformation,
    removeAdditionalInformation,
    updateWorkflowField,
    staleStages,
    clearStaleStage,
    seedClassPlan,
    seedClassPrompts,
    stageStatus,
    refreshStageStatus,
    setWorkflow,
    activeOperation,
    setActiveOperation,
    setIsGeneratingModalOpen,
    setGenerationOperationLabel,
    isClassPlanModalOpen,
    setIsClassPlanModalOpen,
    closeClassPlanModal,
    openClassPlanModal,
    classPlanData,
    setClassPlanData,
    showToast
  } = useWorkflow();
  const { user } = useAuth();
  const userName = user?.name || 'You';

  const classes = workflow.classes || [];

  // Single-open state for Class Editor or History (matches Requirements screen)
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [historyClassId, setHistoryClassId] = useState<string | null>(null);
  const [viewingClass, setViewingClass] = useState<SchemaClass | null>(null);
  const [isAddClassModalOpen, setIsAddClassModalOpen] = useState(false);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [isInputsModalOpen, setIsInputsModalOpen] = useState(false);
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const { data: stageData } = useStageData<any>('classes');

  useEffect(() => {
    refreshStageStatus();
  }, [refreshStageStatus]);

  // Hydrate from stageData if available
  useEffect(() => {
    if ((!classes || classes.length === 0) && stageData) {
      if (Array.isArray(stageData)) {
        updateWorkflowField('classes', stageData);
      } else if (stageData.classes && Array.isArray(stageData.classes)) {
        import('../../services').then(({ classService }) => {
          // @ts-ignore
          const mapped = (classService as any).mapClasses ? (classService as any).mapClasses(stageData.classes) : stageData.classes;
          updateWorkflowField('classes', mapped);
        });
      }
    }
  }, [stageData, classes, updateWorkflowField]);

  // Load classes if empty but runId exists
  useEffect(() => {
    const fetchClasses = async () => {
      if ((!classes || classes.length === 0) && workflow.runId) {
        try {
          const res = await fetch(`${API_URL}/class-prompts?run_id=${workflow.runId}`);
          if (res.ok) {
            const data = await res.json();
            if (data && data.classes && data.classes.length > 0) {
               import('../../services').then(({ classService }) => {
                 // @ts-ignore
                 const mapped = (classService as any).mapClasses ? (classService as any).mapClasses(data.classes) : data.classes;
                 updateWorkflowField('classes', mapped);
               });
            }
          }
        } catch (e) {
          console.error('Failed to fetch class prompts:', e);
        }
      }
    };
    fetchClasses();
  }, [workflow.runId]);

  // New Class Form State
  const [newClassName, setNewClassName] = useState('');
  const [newClassPurpose, setNewClassPurpose] = useState('');
  const [newClassDatasource, setNewClassDatasource] = useState('PrePaidReport');
  const [newClassGrain, setNewClassGrain] = useState('Per itemid Monthly');
  const [classPlanExpanded, setClassPlanExpanded] = useState(false);

  const availableDatasources = useMemo(() => {
    const set = new Set<string>(DEFAULT_DATASOURCES);
    classes.forEach((c) => {
      if (c.datasource) set.add(c.datasource);
    });
    return Array.from(set);
  }, [classes]);

  const handleApprovePlan = async (text: string, baseVersion: number) => {
    if (!workflow.runId) return;
    try {
      const response = await apiClassPlanService.approvePlan(workflow.runId, text, baseVersion);
      closeClassPlanModal();
      setIsGeneratingModalOpen(true);
      setGenerationOperationLabel('Generating Domain Classes...');

      const opId = response.operationId || activeOperation?.operationId;
      if (opId) {
        setActiveOperation({
          operationId: opId,
          type: 'generate-classes',
          status: 'RUNNING',
          message: 'Generating Domain Classes...',
        });
      }

      let statusData: any = null;
      if (opId) {
        statusData = await pollOperation(
          opId,
          (step) => {
            setWorkflow((prev: SchemaGenerationWorkflow) => {
              const existingIdx = prev.currentProgressSteps.findIndex((s) => s.id === step.id);
              const newSteps = [...prev.currentProgressSteps];
              if (existingIdx >= 0) {
                newSteps[existingIdx] = step;
              } else {
                newSteps.push(step);
              }
              return { ...prev, currentProgressSteps: newSteps };
            });
          },
          (data) => {
            setActiveOperation((prev: any) => ({
              ...prev,
              ...data,
              operationId: data.operationId || opId,
            }));
          }
        );
      }

      if (statusData?.status === 'AWAITING_APPROVAL') {
        setIsGeneratingModalOpen(false);
        const plan = statusData.plan || statusData.result?.plan;
        const normalized = normalizeClassPlanData(plan, 'generated');
        setClassPlanData(normalized);
        setIsClassPlanModalOpen(true);
        setWorkflow((prev: SchemaGenerationWorkflow) => ({
          ...prev,
          classPlanStatus: 'PENDING_APPROVAL',
          generationStatus: 'idle',
          classPlanText: normalized.text,
          classPlanVersion: normalized.version,
          classPlanSource: normalized.source,
        }));
        return;
      }

      // Load class prompts into existing cards
      let rawClasses: any[] = [];
      try {
        const promptsRes = await fetch(`${API_URL}/class-prompts?run_id=${workflow.runId}`);
        if (promptsRes.ok) {
          const promptsData = await promptsRes.json();
          rawClasses = promptsData.classes || [];
        }
      } catch (e) {
        console.warn('Failed to load class prompts:', e);
      }

      if (rawClasses.length === 0 && statusData) {
        rawClasses = Array.isArray(statusData.classes)
          ? statusData.classes
          : (statusData.result?.classes || statusData.result || []);
      }

      const mapped = (classService as any).mapClasses ? (classService as any).mapClasses(rawClasses) : rawClasses;
      const count = statusData?.count ?? statusData?.result?.count ?? mapped.length;

      setWorkflow((prev: SchemaGenerationWorkflow) => ({
        ...prev,
        classes: mapped,
        stage: 'classes',
        generationStatus: 'completed',
        classPlanStatus: 'APPROVED',
        updatedAt: new Date().toISOString(),
      }));
      setIsGeneratingModalOpen(false);
      showToast(`Generated ${count} classes successfully`, 'success');
    } catch (err: any) {
      setIsGeneratingModalOpen(false);
      if (err.name === 'StoppedError') {
        showToast("Generation stopped", 'info');
        setActiveOperation(null);
      } else if (err.name === 'UnknownStatusError') {
        showToast(`Unknown operation status: ${err.rawStatus || err.message}`, 'error');
        setActiveOperation(null);
      } else {
        showToast(err.message || 'Approval failed', 'error');
        if (err.mismatches || err.status === 'FAILED') {
          setWorkflow((prev) => ({
            ...prev,
            generationStatus: 'error',
            runStatus: 'FAILED',
            lastError: err.mismatches ? 'planMismatch' : err.message,
            mismatches: err.mismatches || [err.message],
            outputs: { ...(prev.outputs || {}), mismatches: err.mismatches || [err.message] }
          }));
          setActiveOperation((prev: any) => prev ? { ...prev, status: 'FAILED', error: err.message, mismatches: err.mismatches } : null);
        }
      }
      throw err;
    }
  };

  const handleSaveDraftPlan = async (text: string, baseVersion: number): Promise<ClassPlanData> => {
    if (!workflow.runId) throw new Error('No run ID');
    try {
      const res = await apiClassPlanService.saveDraft(workflow.runId, text, baseVersion);
      const normalized = normalizeClassPlanData(res, 'edited');
      setClassPlanData(normalized);
      setWorkflow((prev) => ({
        ...prev,
        classPlanText: normalized.text,
        classPlanVersion: normalized.version,
        classPlanSource: 'edited',
      }));
      showToast('Draft saved successfully', 'success');
      return normalized;
    } catch (err: any) {
      if (err.status !== 409 && err.status !== 422) {
        showToast(err.message || 'Failed to save draft', 'error');
      }
      throw err;
    }
  };

  const handleRegeneratePlan = async (): Promise<ClassPlanData> => {
    if (!workflow.runId) throw new Error('No run ID');
    try {
      const res = await apiClassPlanService.regeneratePlan(workflow.runId);
      const normalized = normalizeClassPlanData(res, 'generated');
      setClassPlanData(normalized);
      setWorkflow((prev) => ({
        ...prev,
        classPlanText: normalized.text,
        classPlanVersion: normalized.version,
        classPlanSource: 'generated',
      }));
      showToast('Class plan regenerated', 'success');
      return normalized;
    } catch (err: any) {
      showToast(err.message || 'Failed to regenerate class plan', 'error');
      throw err;
    }
  };

  const handleRejectPlan = async () => {
    if (!workflow.runId) return;
    try {
      await apiClassPlanService.rejectPlan(workflow.runId);
      closeClassPlanModal();
      setWorkflow((prev) => ({
        ...prev,
        classPlanStatus: 'REJECTED',
        generationStatus: 'idle',
      }));
      showToast('Class generation stopped', 'info');
    } catch (err: any) {
      showToast(err.message || 'Failed to reject class plan', 'error');
      throw err;
    }
  };

  const handleFetchServerPlan = async (): Promise<ClassPlanData | null> => {
    if (!workflow.runId) return null;
    try {
      const res = await apiClassPlanService.getClassPlan(workflow.runId);
      if (res) {
        const normalized = normalizeClassPlanData(res, res.source || 'generated');
        setClassPlanData(normalized);
        return normalized;
      }
      return null;
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch server plan', 'error');
      throw err;
    }
  };

  const handleOpenReviewPlan = async () => {
    if (!classPlanData) {
      try {
        const serverPlan = await handleFetchServerPlan();
        if (!serverPlan && workflow.classPlanText) {
          const fallback = normalizeClassPlanData(workflow.classPlanText, workflow.classPlanSource || 'generated');
          setClassPlanData(fallback);
        }
      } catch (e) {
        if (workflow.classPlanText) {
          const fallback = normalizeClassPlanData(workflow.classPlanText, workflow.classPlanSource || 'generated');
          setClassPlanData(fallback);
        }
      }
    }
    openClassPlanModal();
  };

  const pasteOptions: PasteOption[] = [
    {
      id: 'class-plan',
      label: 'Locked Class Plan',
      description: 'Paste a locked class plan (seed/class-plan). The run button will generate classes directly from this plan.',
      placeholder: 'e.g.\n1. ClassName: PrePaidExpenseAllocation | Datasource: PrePaidReport | Trigger: 2\n2. ClassName: ExpenseReconciliation | Datasource: GeneralLedger | Trigger: 1...'
    },
    {
      id: 'class-prompts',
      label: 'Class Prompts',
      description: 'Paste class prompts (seed/class-prompts). Can be combined text or separate class blocks.',
      placeholder: '### CLASS_START\nClassNumber: 1\nClassName: PrePaidExpenseAllocation\n...\n### CLASS_END'
    }
  ];

  const handlePasteSubmit = async (text: string, optionId?: string) => {
    if (optionId === 'class-plan') {
      await seedClassPlan(text);
    } else {
      await seedClassPrompts({ combinedText: text });
    }
  };

  const isStartedLater = !!(workflow.startStage && workflow.startStage === 'schema_studio');
  const isClassesReady = stageStatus?.classes?.ready ?? !!(workflow.requirements || (stageData && stageData.length > 0) || workflow.lockedPlanText);
  const missingInputs = !isClassesReady ? 'Requirements or locked class plan' : '';

  if (classes.length === 0) {
    return (
      <div className="flex flex-col min-h-full">
        <StageActionBar
          title="Domain Classes Architecture"
          description={isStartedLater ? `This run started at ${workflow.startStage}.` : "Classes not yet generated."}
          leftActions={
            <button
              onClick={() => setStage('requirements')}
              className="p-1.5 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white rounded-md transition-colors"
              title="Back to Requirements"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          }
          rightActions={
            <div className="flex items-center space-x-2">
              {workflow.classPlanStatus === 'PENDING_APPROVAL' && (
                <button
                  type="button"
                  onClick={handleOpenReviewPlan}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700 rounded-lg text-xs font-semibold transition-all shadow-xs cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Review class plan</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsPasteModalOpen(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-semibold rounded-lg text-xs transition-colors cursor-pointer shadow-xs"
              >
                <Clipboard className="h-3.5 w-3.5" />
                <span>Paste existing</span>
              </button>
            </div>
          }
        />
        <div className="flex-1 p-12 text-center text-neutral-600 dark:text-neutral-400">
          {isStartedLater ? (
            <div className="space-y-3">
              <p className="text-xs">This run started at <span className="font-semibold text-neutral-900 dark:text-white">{workflow.startStage}</span>.</p>
              <p className="text-[11px] text-neutral-500">Class prompts were not generated for this run.</p>
              <div className="pt-2">
                <button
                  onClick={() => setIsPasteModalOpen(true)}
                  className="px-4 py-2 bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 rounded-lg text-xs font-semibold cursor-pointer shadow-xs"
                >
                  Paste Existing Class Plan / Prompts
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs">
                {(workflow.generationStatus === 'completed' || workflow.runStatus === 'COMPLETED' || workflow.classPlanStatus === 'APPROVED')
                  ? 'Generation finished but no class files were found'
                  : 'No domain classes generated yet.'}
              </p>
              {workflow.generationStatus === 'error' && (
                <div className="max-w-xl mx-auto mb-4 bg-rose-50 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-800/30 rounded-lg p-4 text-left">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="text-xs font-bold text-rose-700 dark:text-rose-400 mb-1">
                        {workflow.lastError?.includes('planMismatch') || (workflow.mismatches && workflow.mismatches.length > 0)
                          ? 'Plan Mismatch'
                          : 'Generation Failed'}
                      </h4>
                      <p className="text-[11px] text-rose-600 dark:text-rose-400/80 mb-3">
                        {workflow.lastError?.includes('planMismatch') || (workflow.mismatches && workflow.mismatches.length > 0)
                          ? 'The generated classes did not match the locked class plan.'
                          : (workflow.lastError || 'An error occurred during generation.')}
                      </p>
                      {workflow.mismatches && workflow.mismatches.length > 0 && (
                        <div className="mb-3 space-y-1">
                          <ul className="list-disc pl-4 space-y-0.5 text-[11px] font-mono text-rose-600 dark:text-rose-400">
                            {workflow.mismatches.map((m: any, idx: number) => (
                              <li key={idx}>{formatMismatch(m)}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => generateClasses && generateClasses()}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-bold transition-colors cursor-pointer"
                      >
                        Retry generation
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {!isClassesReady && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400">
                  Missing inputs: {missingInputs}. Please complete previous stages or paste existing data.
                </p>
              )}
              <div className="flex items-center justify-center space-x-3 mt-4">
                <button
                  onClick={() => setStage('requirements')}
                  className="px-4 py-2 border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Go to Requirements
                </button>
                <button
                  onClick={() => setIsPasteModalOpen(true)}
                  className="px-4 py-2 border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Paste Existing
                </button>
                {workflow.classPlanStatus === 'PENDING_APPROVAL' && (
                  <button
                    type="button"
                    onClick={handleOpenReviewPlan}
                    className="flex items-center space-x-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-xs transition-colors"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Review class plan</span>
                  </button>
                )}
                <button
                  onClick={() => generateClasses && generateClasses()}
                  disabled={!isClassesReady}
                  title={!isClassesReady ? `Disabled: Missing ${missingInputs}` : 'Generate Classes'}
                  className="px-4 py-2 bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Generate Classes
                </button>
              </div>
            </div>
          )}
        </div>
        <PasteExistingModal
          isOpen={isPasteModalOpen}
          onClose={() => setIsPasteModalOpen(false)}
          title="Paste Existing Class Plan or Prompts"
          subtitle="Seed a locked class plan or class prompts directly"
          options={pasteOptions}
          defaultOptionId="class-plan"
          onPaste={handlePasteSubmit}
        />
        {isClassPlanModalOpen && classPlanData && (
          <ClassPlanApprovalModal
            isOpen={isClassPlanModalOpen}
            onClose={closeClassPlanModal}
            runId={workflow.runId || ''}
            initialPlan={classPlanData}
            registeredDatasources={availableDatasources}
            onApprove={handleApprovePlan}
            onSaveDraft={handleSaveDraftPlan}
            onRegenerate={handleRegeneratePlan}
            onReject={handleRejectPlan}
            onFetchServerPlan={handleFetchServerPlan}
          />
        )}
      </div>
    );
  }

  const handleDeleteClass = async (cls: SchemaClass) => {
    if (!cls.metadata?.fileName) {
      removeClass(cls.id);
      return;
    }
    try {
      const res = await fetch(`${API_URL}/class-prompts/${cls.metadata.fileName}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        if (res.status === 409) {
          alert(`Cannot delete class. Dependent classes: ${errData.dependencies?.join(', ') || 'Unknown'}`);
          return;
        }
        throw new Error(errData.detail || `HTTP ${res.status}`);
      }
      removeClass(cls.id);
    } catch (e: any) {
      alert(e.message || 'Failed to delete class');
    }
  };

  
  const handleCreateClass = () => {
    if (!newClassName.trim()) return;
    const nextNumber = classes.length + 1;
    const newCls: SchemaClass = {
      id: `class-${Date.now()}`,
      classNumber: nextNumber,
      className: newClassName.trim(),
      purpose: newClassPurpose.trim() || 'Custom SCDP Processing Class',
      datasource: newClassDatasource.trim(),
      grain: newClassGrain.trim(),
      classLevelFields: ['documentnumber', 'itemid', 'forprdfrom', 'forprdto'],
      lookupRules: [],
      formulaRules: [],
      components: [
        {
          id: `comp-${Date.now()}-1`,
          name: 'amount',
          type: 'MATH',
          expression: 'amount',
          description: 'Calculated transaction component amount',
        },
      ],
      criteria: ['forprdfrom, forprdto overlap logic'],
      conditions: [],
      expectedOutput: 'TT',
      dependencies: ['NA'],
      exposes: ['amount'],
      reviewPoints: 'Verify datasource connectivity and column mappings.',
      isCustomAdded: true,
    };
    addClass(newCls);
    setIsAddClassModalOpen(false);
    setNewClassName('');
    setNewClassPurpose('');
  };

  const handleReplan = async () => {
    if (!confirm("Build a new class plan? The class list may change.")) return;
    try {
      await fetch(`${API_URL}/runs/${workflow.runId}/class-plan/replan`, { method: 'POST' });
      if (generateClasses) generateClasses();
    } catch (e) {
      console.error(e);
    }
  };

  const toggleTrigger = async (triggerId: string, included: boolean) => {
    try {
      const updatedTriggers = workflow.classPlan?.uncertainTriggers?.map(t => t.id === triggerId ? { ...t, included } : t) || [];
      await fetch(`${API_URL}/runs/${workflow.runId}/class-plan`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uncertainTriggers: updatedTriggers })
      });
      if (confirm("Regenerate class prompts with the updated plan?")) {
        if (generateClasses) generateClasses();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex flex-col min-h-full">

      {/* 1. Sticky Workspace Top Action Bar */}
      <StageActionBar
        title="Domain Classes Architecture"
        description={`Designed ${classes.length} composable SCDP domain processing classes.`}
        leftActions={
          <button
            onClick={() => setStage('requirements')}
            className="p-1.5 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            title="Back to Requirements"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        }
        rightActions={
          <>
            {workflow.classPlanStatus === 'PENDING_APPROVAL' && (
              <button
                type="button"
                onClick={handleOpenReviewPlan}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700 rounded-lg text-xs font-semibold transition-all shadow-xs cursor-pointer mr-2"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                <span>Review class plan</span>
              </button>
            )}

            <button
              onClick={() => setIsInputsModalOpen(true)}
              className="flex items-center space-x-1 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs font-semibold transition-all shadow-xs cursor-pointer mr-2"
            >
              <Eye className="h-3.5 w-3.5 text-neutral-600 dark:text-neutral-400" />
              <span>View Inputs</span>
            </button>

            <button
              onClick={() => setIsPasteModalOpen(true)}
              className="flex items-center space-x-1 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs font-semibold transition-all shadow-xs cursor-pointer mr-2"
            >
              <Clipboard className="h-3.5 w-3.5 text-neutral-600 dark:text-neutral-400" />
              <span>Paste existing</span>
            </button>

            <button
              onClick={() => setIsAddClassModalOpen(true)}
              className="flex items-center space-x-1 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs font-semibold transition-all shadow-xs cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5 text-neutral-600 dark:text-neutral-400" />
              <span>Add Class</span>
            </button>

            <button
              onClick={() => setIsGenerateModalOpen(true)}
              className="flex items-center space-x-1.5 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:hover:bg-neutral-100 dark:text-neutral-900 font-semibold rounded-lg text-xs transition-all shadow-sm shrink-0 cursor-pointer"
            >
              <span>Generate Schema</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </>
        }
      />

      {/* 2. Main Workspace Single-Column Content */}
      <div className="flex-1 p-5 lg:p-6 max-w-5xl w-full mx-auto space-y-3 pb-16">
        {(staleStages.classes || staleStages.class) && (
          <StaleStageBanner
            stageName="Classes"
            reason={staleStages.classes || staleStages.class}
            onRegenerate={async () => {
              if (generateClasses) await generateClasses();
              clearStaleStage('classes');
              clearStaleStage('class');
            }}
          />
        )}

        {/* Additional Information / Rules Banner if any */}
        {workflow.additionalInformation.length > 0 && (
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 shadow-sm space-y-2.5 transition-colors mb-4">
            <div className="flex items-center justify-between pb-1.5 border-b border-neutral-100 dark:border-neutral-800">
              <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 flex items-center space-x-1.5">
                <Sparkles className="h-3.5 w-3.5 text-neutral-500" />
                <span>User-Appended Context & Rules ({workflow.additionalInformation.length})</span>
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {workflow.additionalInformation.map((info) => (
                <div
                  key={info.id}
                  className="p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 flex items-start justify-between space-x-2 text-xs"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-700">
                        {info.category}
                      </span>
                      {info.content && (
                        <span className="text-neutral-800 dark:text-neutral-200">{info.content}</span>
                      )}
                    </div>
                    {info.files && info.files.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {info.files.map((file, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-neutral-200/80 dark:bg-neutral-800 text-[10px] font-mono text-neutral-700 dark:text-neutral-300 border border-neutral-300/80 dark:border-neutral-700/80"
                          >
                            <Paperclip className="h-2.5 w-2.5 shrink-0" />
                            <span className="truncate max-w-[140px]">{typeof file === 'string' ? file : file.name}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => removeAdditionalInformation(info.id)}
                    className="text-neutral-400 hover:text-rose-500 shrink-0 p-1 transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {workflow.classPlan && (
          <div className="mb-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-3">
            <div className="flex justify-between items-center cursor-pointer" onClick={() => setClassPlanExpanded(!classPlanExpanded)}>
              <div className="flex items-center space-x-2 text-xs font-bold text-neutral-800 dark:text-neutral-200">
                 {workflow.classPlan.locked ? <Lock className="h-3.5 w-3.5 text-neutral-500" /> : <Layers className="h-3.5 w-3.5 text-neutral-500" />}
                 <span>{workflow.classPlan.locked ? 'Plan locked \u00B7 ' : 'Plan \u00B7 '} {workflow.classPlan.plannedClasses?.length || 0} classes</span>
              </div>
              <div className="flex items-center space-x-2">
                 <button onClick={(e) => { e.stopPropagation(); handleReplan(); }} className="px-2 py-1 text-[10px] bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded font-semibold hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors">Re-plan</button>
                 {classPlanExpanded ? <ChevronDown className="h-4 w-4 text-neutral-400" /> : <ChevronRight className="h-4 w-4 text-neutral-400" />}
              </div>
            </div>
            {classPlanExpanded && (
              <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800 text-xs">
                <ul className="space-y-1 text-neutral-600 dark:text-neutral-400 font-mono">
                   {workflow.classPlan.plannedClasses?.map(pc => (
                      <li key={pc.className} title={pc.evidenceQuote || ''}>
                         {pc.order} \u00B7 {pc.className} \u00B7 {pc.datasource} \u00B7 Trigger {pc.triggerId}
                      </li>
                   ))}
                </ul>
                {workflow.classPlan.uncertainTriggers && workflow.classPlan.uncertainTriggers.length > 0 && (
                   <div className="mt-3 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-lg text-amber-800 dark:text-amber-400">
                     {workflow.classPlan.uncertainTriggers.map(t => (
                       <div key={t.id} className="flex justify-between items-center mb-1 last:mb-0">
                          <span>Trigger {t.id} ({t.description}) was chosen by {t.votes} of {t.totalVotes} plan votes \u2014 review.</span>
                          <button onClick={() => toggleTrigger(t.id, !t.included)} className="px-2 py-1 bg-white dark:bg-neutral-900 rounded border border-amber-200 dark:border-amber-700 text-[10px] font-bold hover:bg-amber-100 dark:hover:bg-amber-800/30 transition-colors">
                             {t.included ? 'Exclude' : 'Include'}
                          </button>
                       </div>
                     ))}
                   </div>
                )}
              </div>
            )}
          </div>
        )}

        {workflow.generationStatus === 'error' && (
          <div className="mb-4 bg-rose-50 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-800/30 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-xs font-bold text-rose-700 dark:text-rose-400 mb-1">
                  {workflow.lastError?.includes('planMismatch') || (workflow.mismatches && workflow.mismatches.length > 0)
                    ? 'Plan Mismatch'
                    : 'Generation Failed'}
                </h4>
                <p className="text-[11px] text-rose-600 dark:text-rose-400/80 mb-3">
                  {workflow.lastError?.includes('planMismatch') || (workflow.mismatches && workflow.mismatches.length > 0)
                    ? 'The generated classes did not match the locked class plan.'
                    : (workflow.lastError || 'An error occurred during generation.')}
                </p>
                {workflow.mismatches && workflow.mismatches.length > 0 ? (
                  <div className="mb-3 space-y-1">
                    <ul className="list-disc pl-4 space-y-0.5 text-[11px] font-mono text-rose-600 dark:text-rose-400">
                      {workflow.mismatches.map((m: any, idx: number) => (
                        <li key={idx}>{formatMismatch(m)}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4 text-[10px] font-mono mb-3">
                    <div>
                      <div className="font-bold text-rose-700 dark:text-rose-400 mb-1">Planned classes</div>
                      <ul className="list-disc pl-4 text-rose-600 dark:text-rose-400/80">
                        {workflow.classPlan?.plannedClasses?.map(c => <li key={c.className}>{c.className}</li>)}
                      </ul>
                    </div>
                    <div>
                      <div className="font-bold text-rose-700 dark:text-rose-400 mb-1">Generated classes</div>
                      <ul className="list-disc pl-4 text-rose-600 dark:text-rose-400/80">
                        {workflow.classes?.map(c => <li key={c.className}>{c.className}</li>)}
                      </ul>
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => generateClasses && generateClasses()}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-bold transition-colors cursor-pointer"
                >
                  Retry generation
                </button>
              </div>
            </div>
          </div>
        )}

        {workflow.generationStatus === 'error' && workflow.lastError?.includes('spec changed') && (
          <div className="mb-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-lg p-3 flex items-center space-x-3 text-amber-800 dark:text-amber-400">
             <AlertTriangle className="h-4 w-4 shrink-0" />
             <span className="text-xs font-medium">The case spec changed, so a new class plan was built.</span>
          </div>
        )}

        {classes.map((cls) => {
          const versions = getClassVersions(cls.id);
          return (
            <ClassRow
              key={cls.id}
              item={cls}
              userName={userName}
              runId={workflow.runId || ""}
              isEditing={editingClassId === cls.id}
              isHistoryOpen={historyClassId === cls.id}
              onView={() => setViewingClass(cls)}
              onStartEdit={() => {
                setEditingClassId(cls.id);
                setHistoryClassId(null);
              }}
              onCancelEdit={() => setEditingClassId(null)}
              onSave={(updated) => {
                updateClass(cls.id, updated);
                setEditingClassId(null);
              }}
              onDelete={cls.isCustomAdded ? () => handleDeleteClass(cls) : undefined}
              onOpenHistory={() => {
                setHistoryClassId(cls.id);
                setEditingClassId(null);
              }}
              onCloseHistory={() => setHistoryClassId(null)}
            />
          );
        })}
      </div>

      {/* Add Class Modal */}
      {isAddClassModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl w-full max-w-lg p-5 shadow-2xl text-neutral-900 dark:text-neutral-100 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-neutral-800">
              <h3 className="text-xs font-bold flex items-center space-x-1.5">
                <Plus className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
                <span>Create New Schema Domain Class</span>
              </h3>
              <button
                onClick={() => setIsAddClassModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {createError && (
              <div className="p-2 bg-rose-50 text-rose-600 rounded text-xs border border-rose-200">
                {createError}
              </div>
            )}
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">Class Name</label>
                <input
                  type="text"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="E.g. PrePaidVarianceCheck or AccountGroupSummary"
                  className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-lg px-2.5 py-1.5 text-neutral-900 dark:text-neutral-200 focus:outline-none focus:border-neutral-400"
                />
              </div>

              <div>
                <label className="font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">Primary Datasource</label>
                <input
                  type="text"
                  value={newClassDatasource}
                  onChange={(e) => setNewClassDatasource(e.target.value)}
                  className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-lg px-2.5 py-1.5 text-neutral-900 dark:text-neutral-200 focus:outline-none focus:border-neutral-400"
                />
              </div>

              <div>
                <label className="font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">Settlement Grain</label>
                <input
                  type="text"
                  value={newClassGrain}
                  onChange={(e) => setNewClassGrain(e.target.value)}
                  className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-lg px-2.5 py-1.5 text-neutral-900 dark:text-neutral-200 focus:outline-none focus:border-neutral-400"
                />
              </div>

              <div>
                <label className="font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">Purpose & Business Logic</label>
                <textarea
                  rows={3}
                  value={newClassPurpose}
                  onChange={(e) => setNewClassPurpose(e.target.value)}
                  placeholder="Describe the operational role and output of this class..."
                  className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-lg p-2 text-neutral-900 dark:text-neutral-200 focus:outline-none focus:border-neutral-400"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setIsAddClassModalOpen(false)}
                className="px-3.5 py-1.5 text-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateClass}
                disabled={!newClassName.trim()}
                className="px-4 py-1.5 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900 font-bold rounded-lg text-xs cursor-pointer disabled:opacity-50"
              >
                Create Class
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generate with Info Modal */}
      <GenerateWithInfoModal
        isOpen={isGenerateModalOpen}
        onClose={() => setIsGenerateModalOpen(false)}
        onGenerate={(info) => {
          if (info && Array.isArray(info)) {
            info.forEach(entry => addAdditionalInformation(entry));
          } else if (info) {
            addAdditionalInformation(info as any);
          }
          generateSchema();
        }}
        title="Do you want to add any additional information?"
        generationLabel="Generate Schema"
      />

      {/* View Class Details Modal */}
      <ClassViewModal
        isOpen={!!viewingClass}
        onClose={() => setViewingClass(null)}
        cls={viewingClass}
      />

      <SCDPInputsModal
        isOpen={isInputsModalOpen}
        onClose={() => setIsInputsModalOpen(false)}
      />

      <PasteExistingModal
        isOpen={isPasteModalOpen}
        onClose={() => setIsPasteModalOpen(false)}
        title="Paste Existing Class Plan or Prompts"
        subtitle="Seed a locked class plan or class prompts directly"
        options={pasteOptions}
        defaultOptionId="class-plan"
        onPaste={handlePasteSubmit}
      />

      {isClassPlanModalOpen && classPlanData && (
        <ClassPlanApprovalModal
          isOpen={isClassPlanModalOpen}
          onClose={closeClassPlanModal}
          runId={workflow.runId || ''}
          initialPlan={classPlanData}
          registeredDatasources={availableDatasources}
          onApprove={handleApprovePlan}
          onSaveDraft={handleSaveDraftPlan}
          onRegenerate={handleRegeneratePlan}
          onReject={handleRejectPlan}
          onFetchServerPlan={handleFetchServerPlan}
        />
      )}
    </div>
  );
};
