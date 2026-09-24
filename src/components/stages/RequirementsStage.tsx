'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useWorkflow } from '../../context/WorkflowContext';
import { 
  Edit3, 
  X, 
  Plus, 
  Sparkles, 
  ArrowRight, 
  ArrowLeft, 
  FileCheck, 
  ShieldCheck, 
  Calculator, 
  Workflow as WorkflowIcon, 
  Trash2, 
  Check,
  History as HistoryIcon,
  Clock,
  Paperclip
} from 'lucide-react';
import { StageActionBar } from '../layout/StageActionBar';
import { RequirementVersion } from '../../types';
import { RequirementCategoryChip } from '../common/RequirementCategoryChip';
import { VersionDiffViewer, VersionOption } from '../requirements/VersionDiffViewer';
import { GenerateWithInfoModal } from '../common/GenerateWithInfoModal';
import { AddNewBusinessRequirementModal } from '../common/AddNewBusinessRequirementModal';
import { AdditionalRequirementUpload } from '../common/AdditionalRequirementUpload';

interface RequirementItem {
  id: string;
  code: string;
  title: string;
  description: string;
  category?: string;
  isAiGenerated?: boolean;
  derivedFrom?: string;
}

interface RequirementRowProps {
  item: RequirementItem;
  isEditing: boolean;
  isHistoryOpen: boolean;
  versions: RequirementVersion[];
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: (title: string, description: string) => void;
  onOpenHistory: () => void;
  onCloseHistory: () => void;
}

const RequirementRow: React.FC<RequirementRowProps> = ({
  item,
  isEditing,
  isHistoryOpen,
  versions,
  onStartEdit,
  onCancelEdit,
  onSave,
  onOpenHistory,
  onCloseHistory,
}) => {
  const [editTitle, setEditTitle] = useState(item.title);
  const [editDescription, setEditDescription] = useState(item.description);
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

  // Resolve snapshot data for selected version
  const resolveVersionData = useCallback(
    (id: string) => {
      if (id === 'current' || !id) {
        return {
          id: 'current',
          isCurrent: true,
          title: item.title,
          content: item.description,
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
          title: hist.title,
          content: hist.description,
          actor: hist.actor,
          timestamp: hist.timestamp,
          changeSummary: hist.changeSummary || 'Requirement edited',
        };
      }

      return {
        id: 'current',
        isCurrent: true,
        title: item.title,
        content: item.description,
        actor: 'Logaprasanth (User)',
        timestamp: 'Active Current State',
        changeSummary: 'Live editable source of truth in workspace',
      };
    },
    [item.title, item.description, versions, sortedHist]
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
      setEditTitle(item.title);
      setEditDescription(item.description);
    }
  }, [isEditing, item.title, item.description]);

  // Adjust height on edit or content change
  useEffect(() => {
    if (isEditing) {
      const frameId = requestAnimationFrame(adjustTextareaHeight);
      return () => cancelAnimationFrame(frameId);
    }
  }, [isEditing, editDescription, adjustTextareaHeight]);

  const handleSave = () => {
    onSave(editTitle.trim() || item.title, editDescription);
  };

  const lineCount = editDescription.split('\n').length;
  const charCount = editDescription.length;

  return (
    <div
      className={`rounded-xl border transition-all overflow-hidden ${
        isEditing || isHistoryOpen
          ? 'bg-neutral-100/90 dark:bg-neutral-800/90 border-neutral-400 dark:border-neutral-600 shadow-sm ring-1 ring-neutral-400/20 dark:ring-neutral-600/30'
          : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 shadow-2xs'
      }`}
    >
      {/* Collapsed Header & Preview */}
      <div className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5 min-w-0 pr-2">
            <span className="font-mono text-xs font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 px-2 py-0.5 rounded border border-neutral-200 dark:border-neutral-700 shrink-0">
              {item.code}
            </span>
            <span className="text-xs font-bold text-neutral-900 dark:text-white truncate">
              {item.title}
            </span>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {item.category && (
              <RequirementCategoryChip category={item.category} />
            )}

            {!isEditing && !isHistoryOpen && (
              <div className="flex items-center space-x-1.5">
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
                  title="Edit requirement"
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
            <p className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed line-clamp-3 font-sans">
              {item.description}
            </p>

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

      {/* Expanded Inline Editor (Content-Aware Auto-Growing Height up to 520px max with internal scroll) */}
      {isEditing && (
        <div className="border-t border-neutral-200 dark:border-neutral-700/80 bg-white dark:bg-neutral-950 p-4 space-y-3 animate-in fade-in duration-150">
          {/* Editor Header: Title input and metadata/actions vertically centered on one unified toolbar */}
          <div className="space-y-1.5 pb-2.5 border-b border-neutral-100 dark:border-neutral-800">
            <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 block">
              Requirement Title
            </label>
            <div className="flex items-center justify-between gap-3">
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Requirement title..."
                className="flex-1 min-w-0 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-1.5 text-xs font-semibold text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-500 transition-colors"
              />

              <div className="flex items-center space-x-2.5 shrink-0">
                <span className="text-[10px] font-mono text-neutral-400 dark:text-neutral-500 whitespace-nowrap">
                  {lineCount} {lineCount === 1 ? 'line' : 'lines'} · {charCount.toLocaleString()} chars
                </span>

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
                  title="Save changes"
                  aria-label="Save changes"
                >
                  <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                  <span>Save</span>
                </button>
              </div>
            </div>
          </div>

          {/* Multiline Monospace Textarea with Content-Aware Auto-Grow */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 block mb-1">
              Specification & Details
            </label>
            <textarea
              ref={textareaRef}
              value={editDescription}
              onChange={(e) => {
                setEditDescription(e.target.value);
                adjustTextareaHeight();
              }}
              placeholder="Requirement specification..."
              className="w-full min-h-[100px] max-h-[520px] bg-neutral-50/70 dark:bg-neutral-900 p-3 text-xs font-mono text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-600 rounded-lg border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-500 leading-relaxed resize-none"
            />
          </div>
        </div>
      )}

      {/* Expanded Inline History Comparison Workspace (Selectable Version A on Left, Selectable Version B on Right with Diff Highlighting) */}
      {isHistoryOpen && (
        <div className="border-t border-neutral-200 dark:border-neutral-700/80 bg-neutral-50/40 dark:bg-neutral-950 p-4 space-y-3.5 animate-in fade-in duration-150">
          {/* Comparison Header */}
          <div className="flex items-center justify-between pb-2.5 border-b border-neutral-200 dark:border-neutral-800">
            <div>
              <div className="flex items-center space-x-2">
                <HistoryIcon className="h-3.5 w-3.5 text-neutral-600 dark:text-neutral-400" />
                <span className="text-xs font-bold text-neutral-900 dark:text-white">
                  Requirement Version Comparison
                </span>
              </div>
              <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                <span className="font-mono font-semibold text-neutral-700 dark:text-neutral-300">{item.code}</span> · {item.title}
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
                This requirement has not been modified since it was initially generated.
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



export const RequirementsStage: React.FC = () => {
  const { 
    workflow, 
    setStage,
    getRequirementVersions,
    updateProblemStatement, 
    updateBusinessObjective, 
    updateBusinessRequirement, 
    addBusinessRequirement,
    updateFinanceRequirement, 
    updateTechnicalRequirement,
    addAdditionalInformation,
    removeAdditionalInformation,
    generateClasses
  } = useWorkflow();

  const req = workflow.requirements;
  const [activeTab, setActiveTab] = useState<'all' | 'ps' | 'bo' | 'br' | 'fr' | 'tr'>('all');
  
  // Single active expanded card interaction across the stage (either inline edit or inline history comparison)
  const [activeInteraction, setActiveInteraction] = useState<{
    type: 'edit' | 'history';
    id: string;
  } | null>(null);

  const handleStartEdit = (id: string) => {
    setActiveInteraction({ type: 'edit', id });
  };

  const handleOpenHistory = (id: string) => {
    setActiveInteraction({ type: 'history', id });
  };

  const handleCloseInteraction = () => {
    setActiveInteraction(null);
  };

  // Add Business Requirement modal
  const [isAddReqModalOpen, setIsAddReqModalOpen] = useState(false);

  // Generate with info modal
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);

  if (!req) {
    return (
      <div className="flex flex-col min-h-full">
        <StageActionBar
          title="Structured Requirements"
          description="Requirements not yet generated."
          leftActions={
            <button
              onClick={() => setStage('business-input')}
              className="p-1 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white rounded-md transition-colors"
              title="Back to Business Input"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          }
        />
        <div className="flex-1 p-12 text-center text-neutral-600 dark:text-neutral-400">
          <p className="text-xs">No requirements generated yet. Please return to the Business Input stage.</p>
          <button
            onClick={() => setStage('business-input')}
            className="mt-4 px-4 py-2 bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 rounded-lg text-xs font-semibold"
          >
            Go to Business Input
          </button>
        </div>
      </div>
    );
  }


  const totalReqCount = 
    req.problemStatements.length + 
    req.businessObjectives.length + 
    req.businessRequirements.length + 
    req.financeRequirements.length + 
    req.technicalRequirements.length;

  return (
    <div className="flex flex-col min-h-full">
      {/* 1. Sticky Workspace Top Action Bar */}
      <StageActionBar
        title="Review Structured Requirements"
        description={`Derived ${totalReqCount} traceable specs across 5 architectural layers.`}
        leftActions={
          <button
            onClick={() => setStage('business-input')}
            className="p-1.5 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            title="Back to Business Input"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        }
        rightActions={
          <>
            <button
              onClick={() => setIsAddReqModalOpen(true)}
              className="flex items-center space-x-1 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs font-semibold transition-all shadow-xs cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5 text-neutral-600 dark:text-neutral-400" />
              <span>Add New Business Requirement</span>
            </button>

            <button
              onClick={() => setIsGenerateModalOpen(true)}
              className="flex items-center space-x-1.5 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:hover:bg-neutral-100 dark:text-neutral-900 font-semibold rounded-lg text-xs transition-all shadow-sm shrink-0 cursor-pointer"
            >
              <span>Generate Classes</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </>
        }
      />

      {/* 2. Main Workspace Content */}
      <div className="flex-1 p-5 lg:p-6 max-w-5xl w-full mx-auto space-y-4 pb-16">
        {/* Layer Navigation Tabs (Traceability Map Tab Removed) */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-1.5 shadow-sm">
          <div className="flex items-center space-x-1 overflow-x-auto text-xs select-none">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-semibold shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              All Layers ({totalReqCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ps')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer ${
                activeTab === 'ps'
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-semibold shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              Problem Statements ({req.problemStatements.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('bo')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer ${
                activeTab === 'bo'
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-semibold shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              Objectives ({req.businessObjectives.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('br')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer ${
                activeTab === 'br'
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-semibold shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              Business ({req.businessRequirements.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('fr')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer ${
                activeTab === 'fr'
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-semibold shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              Finance ({req.financeRequirements.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('tr')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer ${
                activeTab === 'tr'
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-semibold shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              Technical ({req.technicalRequirements.length})
            </button>
          </div>
        </div>

        {/* Additional Information / Rules Banner if any */}
        {workflow.additionalInformation.length > 0 && (
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 shadow-sm space-y-2.5 transition-colors">
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

        {/* Single-Column Expandable Requirements List */}
        <div className="space-y-6">
          {/* 1. Problem Statements */}
          {(activeTab === 'all' || activeTab === 'ps') && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-300 flex items-center space-x-1.5">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Problem Statements ({req.problemStatements.length})</span>
                </h3>
                <span className="text-[11px] text-neutral-500 dark:text-neutral-400">Core operational pain points</span>
              </div>

              <div className="space-y-3">
                {req.problemStatements.map((ps) => {
                  const versions = getRequirementVersions(ps.id).length > 0 
                    ? getRequirementVersions(ps.id) 
                    : getRequirementVersions(ps.code);

                  return (
                    <RequirementRow
                      key={ps.id}
                      item={{
                        id: ps.id,
                        code: ps.code,
                        title: ps.title,
                        description: ps.description,
                        category: ps.category,
                        isAiGenerated: ps.isAiGenerated,
                      }}
                      isEditing={activeInteraction?.type === 'edit' && activeInteraction?.id === ps.id}
                      isHistoryOpen={activeInteraction?.type === 'history' && activeInteraction?.id === ps.id}
                      versions={versions}
                      onStartEdit={() => handleStartEdit(ps.id)}
                      onCancelEdit={handleCloseInteraction}
                      onOpenHistory={() => handleOpenHistory(ps.id)}
                      onCloseHistory={handleCloseInteraction}
                      onSave={(title, description) => {
                        updateProblemStatement(ps.id, { title, description });
                        handleCloseInteraction();
                      }}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. Business Objectives */}
          {(activeTab === 'all' || activeTab === 'bo') && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-300 flex items-center space-x-1.5">
                  <FileCheck className="h-3.5 w-3.5" />
                  <span>Business Objectives ({req.businessObjectives.length})</span>
                </h3>
                <span className="text-[11px] text-neutral-500 dark:text-neutral-400">Measurable operational goals</span>
              </div>

              <div className="space-y-3">
                {req.businessObjectives.map((bo) => {
                  const versions = getRequirementVersions(bo.id).length > 0 
                    ? getRequirementVersions(bo.id) 
                    : getRequirementVersions(bo.code);

                  return (
                    <RequirementRow
                      key={bo.id}
                      item={{
                        id: bo.id,
                        code: bo.code,
                        title: bo.title,
                        description: bo.description,
                        derivedFrom: `from ${bo.derivedFromPsCode}`,
                        isAiGenerated: bo.isAiGenerated,
                      }}
                      isEditing={activeInteraction?.type === 'edit' && activeInteraction?.id === bo.id}
                      isHistoryOpen={activeInteraction?.type === 'history' && activeInteraction?.id === bo.id}
                      versions={versions}
                      onStartEdit={() => handleStartEdit(bo.id)}
                      onCancelEdit={handleCloseInteraction}
                      onOpenHistory={() => handleOpenHistory(bo.id)}
                      onCloseHistory={handleCloseInteraction}
                      onSave={(title, description) => {
                        updateBusinessObjective(bo.id, { title, description });
                        handleCloseInteraction();
                      }}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. Business Requirements */}
          {(activeTab === 'all' || activeTab === 'br') && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-300 flex items-center space-x-1.5">
                  <FileCheck className="h-3.5 w-3.5" />
                  <span>Business Requirements ({req.businessRequirements.length})</span>
                </h3>
                <span className="text-[11px] text-neutral-500 dark:text-neutral-400">Functional processing rules</span>
              </div>

              <div className="space-y-3">
                {req.businessRequirements.map((br) => {
                  const versions = getRequirementVersions(br.id).length > 0 
                    ? getRequirementVersions(br.id) 
                    : getRequirementVersions(br.code);

                  return (
                    <RequirementRow
                      key={br.id}
                      item={{
                        id: br.id,
                        code: br.code,
                        title: br.title,
                        description: br.description,
                        category: br.category,
                        derivedFrom: `from ${br.derivedFromBoCode}`,
                        isAiGenerated: br.isAiGenerated,
                      }}
                      isEditing={activeInteraction?.type === 'edit' && activeInteraction?.id === br.id}
                      isHistoryOpen={activeInteraction?.type === 'history' && activeInteraction?.id === br.id}
                      versions={versions}
                      onStartEdit={() => handleStartEdit(br.id)}
                      onCancelEdit={handleCloseInteraction}
                      onOpenHistory={() => handleOpenHistory(br.id)}
                      onCloseHistory={handleCloseInteraction}
                      onSave={(title, description) => {
                        updateBusinessRequirement(br.id, { title, description });
                        handleCloseInteraction();
                      }}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. Finance Requirements */}
          {(activeTab === 'all' || activeTab === 'fr') && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-300 flex items-center space-x-1.5">
                  <Calculator className="h-3.5 w-3.5" />
                  <span>Finance Requirements ({req.financeRequirements.length})</span>
                </h3>
                <span className="text-[11px] text-neutral-500 dark:text-neutral-400">Accounting, GL & allocation formulas</span>
              </div>

              <div className="space-y-3">
                {req.financeRequirements.map((fr) => {
                  const versions = getRequirementVersions(fr.id).length > 0 
                    ? getRequirementVersions(fr.id) 
                    : getRequirementVersions(fr.code);

                  return (
                    <RequirementRow
                      key={fr.id}
                      item={{
                        id: fr.id,
                        code: fr.code,
                        title: fr.title,
                        description: fr.description,
                        derivedFrom: `from ${fr.derivedFromBrCode}`,
                        isAiGenerated: fr.isAiGenerated,
                      }}
                      isEditing={activeInteraction?.type === 'edit' && activeInteraction?.id === fr.id}
                      isHistoryOpen={activeInteraction?.type === 'history' && activeInteraction?.id === fr.id}
                      versions={versions}
                      onStartEdit={() => handleStartEdit(fr.id)}
                      onCancelEdit={handleCloseInteraction}
                      onOpenHistory={() => handleOpenHistory(fr.id)}
                      onCloseHistory={handleCloseInteraction}
                      onSave={(title, description) => {
                        updateFinanceRequirement(fr.id, { title, description });
                        handleCloseInteraction();
                      }}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* 5. Technical Requirements */}
          {(activeTab === 'all' || activeTab === 'tr') && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-300 flex items-center space-x-1.5">
                  <WorkflowIcon className="h-3.5 w-3.5" />
                  <span>Technical Requirements ({req.technicalRequirements.length})</span>
                </h3>
                <span className="text-[11px] text-neutral-500 dark:text-neutral-400">SCDP classes, schemas, grain & pipelines</span>
              </div>

              <div className="space-y-3">
                {req.technicalRequirements.map((tr) => {
                  const versions = getRequirementVersions(tr.id).length > 0 
                    ? getRequirementVersions(tr.id) 
                    : getRequirementVersions(tr.code);

                  return (
                    <RequirementRow
                      key={tr.id}
                      item={{
                        id: tr.id,
                        code: tr.code,
                        title: tr.title,
                        description: tr.description,
                        derivedFrom: `from ${tr.derivedFromFrCodes.join(', ')}`,
                        isAiGenerated: tr.isAiGenerated,
                      }}
                      isEditing={activeInteraction?.type === 'edit' && activeInteraction?.id === tr.id}
                      isHistoryOpen={activeInteraction?.type === 'history' && activeInteraction?.id === tr.id}
                      versions={versions}
                      onStartEdit={() => handleStartEdit(tr.id)}
                      onCancelEdit={handleCloseInteraction}
                      onOpenHistory={() => handleOpenHistory(tr.id)}
                      onCloseHistory={handleCloseInteraction}
                      onSave={(title, description) => {
                        updateTechnicalRequirement(tr.id, { title, description });
                        handleCloseInteraction();
                      }}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Generate with Info Modal */}
      <GenerateWithInfoModal
        isOpen={isGenerateModalOpen}
        onClose={() => setIsGenerateModalOpen(false)}
        onGenerate={(info) => {
          if (info) {
            addAdditionalInformation(info);
          }
          generateClasses();
        }}
        title="Do you want to add any additional information?"
        generationLabel="Proceed to Classes"
      />

      {/* Add New Business Requirement Modal */}
      <AddNewBusinessRequirementModal
        isOpen={isAddReqModalOpen}
        onClose={() => setIsAddReqModalOpen(false)}
        onSave={addBusinessRequirement}
      />
    </div>
  );
};

