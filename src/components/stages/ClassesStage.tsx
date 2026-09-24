'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useWorkflow } from '../../context/WorkflowContext';
import { 
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
  Eye
} from 'lucide-react';
import { SchemaClass, ClassVersion, SchemaComponent } from '../../types';
import { StageActionBar } from '../layout/StageActionBar';
import { RequirementCategoryChip } from '../common/RequirementCategoryChip';
import { VersionDiffViewer, VersionOption } from '../requirements/VersionDiffViewer';
import { formatClassSpecification } from '../../utils/classUtils';
import { GenerateWithInfoModal } from '../common/GenerateWithInfoModal';
import { ClassViewModal } from '../classes/ClassViewModal';
import { AdditionalRequirementUpload } from '../common/AdditionalRequirementUpload';
import { SCDPInputsModal } from './SCDPInputsModal';

interface ClassRowProps {
  item: SchemaClass;
  isEditing: boolean;
  isHistoryOpen: boolean;
  versions: ClassVersion[];
  onView: () => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: (updated: Partial<SchemaClass>) => void;
  onDelete?: () => void;
  onOpenHistory: () => void;
  onCloseHistory: () => void;
}

const ClassRow: React.FC<ClassRowProps> = ({
  item,
  isEditing,
  isHistoryOpen,
  versions,
  onView,
  onStartEdit,
  onCancelEdit,
  onSave,
  onDelete,
  onOpenHistory,
  onCloseHistory,
}) => {
  const [editClassName, setEditClassName] = useState(item.className);
  const [editDatasource, setEditDatasource] = useState(item.datasource);
  const [editGrain, setEditGrain] = useState(item.grain);
  const [editPurpose, setEditPurpose] = useState(item.purpose);
  const [editComponents, setEditComponents] = useState<SchemaComponent[]>(item.components || []);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
        return {
          id: 'current',
          isCurrent: true,
          title: `Class #${item.classNumber} · ${item.className}`,
          content: formatClassSpecification(item),
          actor: 'Logaprasanth (User)',
          timestamp: 'Active Current State',
          changeSummary: 'Live editable source of truth in workspace',
        };
      }

      const hist = versions.find((v) => v.id === id) || sortedHist[0];
      if (hist) {
        return {
          id: hist.id,
          isCurrent: false,
          title: hist.title || `Class #${item.classNumber} · ${hist.className}`,
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
        title: `Class #${item.classNumber} · ${item.className}`,
        content: formatClassSpecification(item),
        actor: 'Logaprasanth (User)',
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
    }
  }, [isEditing, item]);

  // Adjust height on edit or content change
  useEffect(() => {
    if (isEditing) {
      const frameId = requestAnimationFrame(adjustTextareaHeight);
      return () => cancelAnimationFrame(frameId);
    }
  }, [isEditing, editPurpose, adjustTextareaHeight]);

  const handleSave = () => {
    onSave({
      className: editClassName.trim() || item.className,
      datasource: editDatasource.trim() || item.datasource,
      grain: editGrain.trim() || item.grain,
      purpose: editPurpose.trim() || item.purpose,
      components: editComponents,
    });
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
                  {lineCount} {lineCount === 1 ? 'line' : 'lines'} · {charCount.toLocaleString()} chars
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

          {/* Form Fields Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 block mb-1">
                Class Name
              </label>
              <input
                type="text"
                value={editClassName}
                onChange={(e) => setEditClassName(e.target.value)}
                placeholder="Class name..."
                className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-500 transition-colors"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 block mb-1">
                Datasource
              </label>
              <input
                type="text"
                value={editDatasource}
                onChange={(e) => setEditDatasource(e.target.value)}
                placeholder="Datasource name..."
                className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-500 transition-colors"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 block mb-1">
                Settlement Grain
              </label>
              <input
                type="text"
                value={editGrain}
                onChange={(e) => setEditGrain(e.target.value)}
                placeholder="Settlement grain..."
                className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-500 transition-colors"
              />
            </div>
          </div>

          {/* Purpose & Business Logic Textarea with Content-Aware Auto-Grow */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 block mb-1">
              Purpose & Business Logic
            </label>
            <textarea
              ref={textareaRef}
              value={editPurpose}
              onChange={(e) => {
                setEditPurpose(e.target.value);
                adjustTextareaHeight();
              }}
              placeholder="Describe the operational role and business logic..."
              className="w-full min-h-[100px] max-h-[520px] bg-neutral-50/70 dark:bg-neutral-900 p-3 text-xs font-sans text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-600 rounded-lg border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-500 leading-relaxed resize-none"
            />
          </div>

          {/* Components Config Section */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                Components ({editComponents.length})
              </label>
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {editComponents.map((comp, idx) => (
                <div
                  key={comp.id || idx}
                  className="p-2 rounded-lg bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-xs gap-2"
                >
                  <div className="flex items-center space-x-2 min-w-0">
                    <span className="font-semibold text-neutral-900 dark:text-white">{comp.name}</span>
                    <RequirementCategoryChip category={comp.type} />
                  </div>
                  <span className="font-mono text-[11px] text-neutral-500 dark:text-neutral-400 truncate max-w-sm">
                    {comp.expression || comp.description || 'No formula'}
                  </span>
                </div>
              ))}
            </div>
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
                <span className="font-mono font-semibold text-neutral-700 dark:text-neutral-300">Class #{item.classNumber}</span> · {item.className}
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

export const ClassesStage: React.FC = () => {
  const { 
    workflow, 
    setStage,
    getClassVersions,
    updateClass, 
    addClass, 
    removeClass, 
    generateSchema,
    addAdditionalInformation,
    removeAdditionalInformation
  } = useWorkflow();

  const classes = workflow.classes || [];

  // Single-open state for Class Editor or History (matches Requirements screen)
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [historyClassId, setHistoryClassId] = useState<string | null>(null);
  const [viewingClass, setViewingClass] = useState<SchemaClass | null>(null);
  const [isAddClassModalOpen, setIsAddClassModalOpen] = useState(false);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [isInputsModalOpen, setIsInputsModalOpen] = useState(false);

  // New Class Form State
  const [newClassName, setNewClassName] = useState('');
  const [newClassPurpose, setNewClassPurpose] = useState('');
  const [newClassDatasource, setNewClassDatasource] = useState('PrePaidReport');
  const [newClassGrain, setNewClassGrain] = useState('Per itemid Monthly');

  if (classes.length === 0) {
    return (
      <div className="flex flex-col min-h-full">
        <StageActionBar
          title="Domain Classes Architecture"
          description="Classes not yet generated."
          leftActions={
            <button
              onClick={() => setStage('requirements')}
              className="p-1.5 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white rounded-md transition-colors"
              title="Back to Requirements"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          }
        />
        <div className="flex-1 p-12 text-center text-neutral-600 dark:text-neutral-400">
          <p className="text-xs">No domain classes generated yet. Please return to Requirements stage.</p>
          <button
            onClick={() => setStage('requirements')}
            className="mt-4 px-4 py-2 bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 rounded-lg text-xs font-semibold"
          >
            Go to Requirements
          </button>
        </div>
      </div>
    );
  }

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
            <button
              onClick={() => setIsInputsModalOpen(true)}
              className="flex items-center space-x-1 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs font-semibold transition-all shadow-xs cursor-pointer mr-2"
            >
              <Eye className="h-3.5 w-3.5 text-neutral-600 dark:text-neutral-400" />
              <span>View Inputs</span>
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
        {classes.map((cls) => {
          const versions = getClassVersions(cls.id);
          return (
            <ClassRow
              key={cls.id}
              item={cls}
              isEditing={editingClassId === cls.id}
              isHistoryOpen={historyClassId === cls.id}
              versions={versions}
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
              onDelete={cls.isCustomAdded ? () => removeClass(cls.id) : undefined}
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
          if (info) {
            addAdditionalInformation(info);
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
    </div>
  );
};
