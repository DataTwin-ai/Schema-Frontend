'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useWorkflow } from '../../context/WorkflowContext';
import { 
  Search, 
  ChevronRight, 
  ChevronDown, 
  Copy, 
  Check, 
  Save, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft,
  FileCode,
  FolderTree,
  Code2,
  Edit3,
  History as HistoryIcon,
  Clock,
  X,
  Sparkles,
  Paperclip,
  Trash2
} from 'lucide-react';
import { SchemaTreeNode } from '../../types';
import { StageActionBar } from '../layout/StageActionBar';
import { VersionDiffViewer, VersionOption } from '../requirements/VersionDiffViewer';
import { GenerateWithInfoModal } from '../common/GenerateWithInfoModal';
import { AdditionalRequirementUpload } from '../common/AdditionalRequirementUpload';

export const SchemaStudioStage: React.FC = () => {
  const { 
    workflow, 
    setStage, 
    editedSchemaJson, 
    setEditedSchemaJson, 
    saveSchemaChanges, 
    copySchemaJson,
    getSchemaVersions,
    addAdditionalInformation,
    removeAdditionalInformation
  } = useWorkflow();

  const [isProceedModalOpen, setIsProceedModalOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });
  const [collapsedNodes, setCollapsedNodes] = useState<Record<string, boolean>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const schemaVersions = getSchemaVersions();
  const [selectedPreviousVersionId, setSelectedPreviousVersionId] = useState<string>('');

  useEffect(() => {
    if (!selectedPreviousVersionId && schemaVersions.length > 0) {
      setSelectedPreviousVersionId(schemaVersions[schemaVersions.length - 1].id);
    }
  }, [schemaVersions, selectedPreviousVersionId]);

  useEffect(() => {
    if (!editedSchemaJson && workflow.schema) {
      setEditedSchemaJson(workflow.schema.rawJson);
    }
  }, [workflow.schema, editedSchemaJson, setEditedSchemaJson]);

  if (!workflow.schema) {
    return (
      <div className="flex flex-col min-h-full">
        <StageActionBar
          title="Schema Studio"
          description="Schema not yet generated."
          leftActions={
            <button
              onClick={() => setStage('classes')}
              className="p-1.5 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white rounded-md transition-colors"
              title="Back to Classes"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          }
        />
        <div className="flex-1 p-12 text-center text-neutral-600 dark:text-neutral-400">
          <p className="text-xs">No schema generated yet. Please return to Classes stage.</p>
          <button
            onClick={() => setStage('classes')}
            className="mt-4 px-4 py-2 bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 rounded-lg text-xs font-semibold"
          >
            Go to Classes
          </button>
        </div>
      </div>
    );
  }

  const handleCopy = async () => {
    const success = await copySchemaJson();
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleFormatJson = () => {
    try {
      const parsed = JSON.parse(editedSchemaJson);
      setEditedSchemaJson(JSON.stringify(parsed, null, 2));
      setSaveStatus({ type: 'success', message: 'JSON formatted cleanly' });
      setTimeout(() => setSaveStatus({ type: null, message: '' }), 2500);
    } catch (err: any) {
      setSaveStatus({ type: 'error', message: `Cannot format: ${err?.message}` });
    }
  };

  const handleSave = () => {
    const result = saveSchemaChanges();
    if (result.success) {
      setSaveStatus({ type: 'success', message: 'Schema changes saved successfully to workflow model!' });
      setTimeout(() => setSaveStatus({ type: null, message: '' }), 3000);
    } else {
      setSaveStatus({ type: 'error', message: result.error || 'Syntax error in JSON' });
    }
  };

  const versionOptions: VersionOption[] = useMemo(() => {
    return schemaVersions.map((v) => ({
      id: v.id,
      label: `Version ${v.versionNumber}`,
    }));
  }, [schemaVersions]);

  const previousVersionData = useMemo(() => {
    const selected = schemaVersions.find((v) => v.id === selectedPreviousVersionId) || schemaVersions[0];
    if (selected) {
      return {
        id: selected.id,
        title: `SCDP Schema JSON (v${selected.versionNumber})`,
        content: selected.rawJson,
        actor: selected.actor,
        timestamp: selected.timestamp,
        changeSummary: selected.changeSummary || 'Schema version generated',
        isCurrent: false,
      };
    }
    return {
      id: 'current',
      title: 'SCDP Schema JSON (Live Model)',
      content: workflow.schema?.rawJson || '',
      actor: 'Logaprasanth (User)',
      timestamp: 'Active Current State',
      changeSummary: 'Live editable source of truth in workspace',
      isCurrent: true,
    };
  }, [schemaVersions, selectedPreviousVersionId, workflow.schema]);

  const currentVersionData = useMemo(() => {
    return {
      id: 'current',
      title: 'SCDP Schema JSON (Current Live)',
      content: editedSchemaJson || workflow.schema?.rawJson || '',
      actor: 'Logaprasanth (User)',
      timestamp: 'Active Current State',
      changeSummary: 'Live editable source of truth in workspace',
      isCurrent: true,
    };
  }, [editedSchemaJson, workflow.schema]);

  const toggleNode = (nodeKey: string) => {
    setCollapsedNodes((prev) => ({
      ...prev,
      [nodeKey]: !prev[nodeKey],
    }));
  };

  // Render tree node recursively
  const renderTreeNode = (node: SchemaTreeNode, path: string, depth = 0) => {
    const key = `${path}-${node.technicalName || node.title}`;
    const isCollapsed = !!collapsedNodes[key];
    const hasChildren = node.children && node.children.length > 0;
    
    // Filter matching
    const matchesSearch = !searchQuery || 
      node.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      node.technicalName.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (node.val && node.val.toLowerCase().includes(searchQuery.toLowerCase()));

    if (searchQuery && !matchesSearch && !hasChildren) {
      return null;
    }

    return (
      <div key={key} className="text-xs select-none">
        <div
          onClick={() => hasChildren && toggleNode(key)}
          className={`flex items-center space-x-1.5 py-1 px-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800/80 cursor-pointer group transition-colors ${
            depth === 0 ? 'bg-neutral-100/70 dark:bg-neutral-900/60 font-semibold' : ''
          }`}
          style={{ paddingLeft: `${Math.max(8, depth * 16)}px` }}
        >
          {hasChildren ? (
            isCollapsed ? (
              <ChevronRight className="h-3.5 w-3.5 text-neutral-400 group-hover:text-neutral-700 dark:group-hover:text-neutral-200 shrink-0" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-neutral-400 group-hover:text-neutral-700 dark:group-hover:text-neutral-200 shrink-0" />
            )
          ) : (
            <span className="h-3.5 w-3.5 flex items-center justify-center text-neutral-400 text-[10px] shrink-0">•</span>
          )}

          <span
            className={`${
              node.title.startsWith('#SchemaClass')
                ? 'text-neutral-900 dark:text-neutral-100 font-bold'
                : node.title.startsWith('#Components')
                ? 'text-neutral-800 dark:text-neutral-200 font-semibold'
                : node.title.startsWith('#Conditions')
                ? 'text-neutral-700 dark:text-neutral-300 font-semibold'
                : hasChildren
                ? 'text-neutral-800 dark:text-neutral-200'
                : 'text-neutral-600 dark:text-neutral-400'
            }`}
          >
            {node.title}
          </span>

          {node.val !== undefined && (
            <span className="font-mono text-[11px] text-neutral-600 dark:text-neutral-400 truncate max-w-xs">
              : &quot;{node.val}&quot;
            </span>
          )}

          {node.equality && (
            <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
              {node.equality}
            </span>
          )}
        </div>

        {hasChildren && !isCollapsed && (
          <div className="border-l border-neutral-200 dark:border-neutral-800/80 ml-3">
            {node.children!.map((child, idx) => renderTreeNode(child, `${key}-${idx}`, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-full">
      {/* 1. Sticky Workspace Top Action Bar */}
      <StageActionBar
        title="SCDP Schema Studio"
        description="Dual-pane visual tree hierarchy and raw JSON code editor."
        leftActions={
          <button
            onClick={() => setStage('classes')}
            className="p-1.5 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            title="Back to Classes"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        }
        rightActions={
          <>
            <button
              onClick={handleFormatJson}
              className="px-2.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs font-semibold transition-colors shadow-xs cursor-pointer"
            >
              Format
            </button>
            <button
              onClick={handleCopy}
              className="flex items-center space-x-1 px-2.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs font-semibold transition-colors shadow-xs cursor-pointer"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-neutral-800 dark:text-neutral-200" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
            <button
              onClick={() => setIsHistoryOpen(!isHistoryOpen)}
              className={`flex items-center space-x-1 px-3 py-1.5 border rounded-lg text-xs font-semibold transition-all shadow-xs cursor-pointer ${
                isHistoryOpen
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 border-neutral-900 dark:border-white'
                  : 'bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700'
              }`}
            >
              <HistoryIcon className="h-3.5 w-3.5" />
              <span>History</span>
            </button>
            <button
              onClick={handleSave}
              className="flex items-center space-x-1 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs font-semibold transition-colors shadow-xs cursor-pointer"
            >
              <Save className="h-3.5 w-3.5" />
              <span>Save Copy</span>
            </button>
            <button
              onClick={() => setIsProceedModalOpen(true)}
              className="flex items-center space-x-1.5 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:hover:bg-neutral-100 dark:text-neutral-900 font-semibold rounded-lg text-xs transition-all shadow-sm shrink-0 cursor-pointer"
            >
              <span>Proceed to Final Output</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </>
        }
      />

      {/* 2. Main Workspace Content */}
      <div className="flex-1 p-5 lg:p-6 max-w-5xl w-full mx-auto space-y-4 pb-16">
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
                    className="text-neutral-400 hover:text-rose-500 shrink-0 p-1 transition-colors cursor-pointer"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* Status Notification Banner */}
        {saveStatus.type && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-center justify-between animate-in fade-in duration-150 ${
              saveStatus.type === 'success'
                ? 'bg-neutral-50 border-neutral-300 text-neutral-800 dark:bg-neutral-950 dark:border-neutral-700 dark:text-neutral-200'
                : 'bg-rose-50 border-rose-300 text-rose-800 dark:bg-rose-950/50 dark:border-rose-500/40 dark:text-rose-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              {saveStatus.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 text-neutral-700 dark:text-neutral-300 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />
              )}
              <span>{saveStatus.message}</span>
            </div>
            <button onClick={() => setSaveStatus({ type: null, message: '' })} className="text-neutral-400 hover:text-neutral-700 dark:hover:text-white">
              ✕
            </button>
          </div>
        )}

        {/* Schema Version Comparison Workspace */}
        {isHistoryOpen && (
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 shadow-sm space-y-3.5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-2.5 border-b border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center space-x-2">
                <HistoryIcon className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
                <h3 className="text-xs font-bold text-neutral-900 dark:text-white">
                  Schema Version Comparison
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsHistoryOpen(false)}
                className="px-2.5 py-1 text-xs text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white flex items-center space-x-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md transition-colors cursor-pointer border border-neutral-200/80 dark:border-neutral-700/80"
                title="Close history comparison"
              >
                <X className="h-3.5 w-3.5" />
                <span>Close</span>
              </button>
            </div>

            {schemaVersions.length === 0 ? (
              <div className="p-6 text-center rounded-xl border border-dashed border-neutral-300 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950">
                <Clock className="h-5 w-5 text-neutral-400 mx-auto mb-1.5" />
                <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">No previous versions</p>
                <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5">
                  This schema has not been modified since it was initially generated.
                </p>
              </div>
            ) : (
              <VersionDiffViewer
                previousTitle={previousVersionData.title}
                currentTitle={currentVersionData.title}
                previousContent={previousVersionData.content}
                currentContent={currentVersionData.content}
                previousActor={previousVersionData.actor}
                previousTimestamp={previousVersionData.timestamp}
                previousChangeSummary={previousVersionData.changeSummary}
                isPreviousCurrent={previousVersionData.isCurrent}
                currentActor={currentVersionData.actor}
                currentTimestamp={currentVersionData.timestamp}
                currentStatus={currentVersionData.changeSummary}
                isCurrentReal={currentVersionData.isCurrent}
                versionOptions={versionOptions}
                selectedPreviousVersionId={selectedPreviousVersionId || schemaVersions[0]?.id || ''}
                selectedCurrentVersionId="current"
                onSelectPreviousVersion={(id) => setSelectedPreviousVersionId(id)}
                onSelectCurrentVersion={() => {}}
              />
            )}
          </div>
        )}

        {/* Dual Pane Studio Container */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[580px]">
          {/* Left Pane: Hierarchical Schema Tree (5 cols) */}
          <div className="lg:col-span-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 shadow-sm flex flex-col justify-between transition-colors">
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-neutral-800">
                <div className="flex items-center space-x-2">
                  <FolderTree className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
                  <h3 className="text-xs font-bold text-neutral-900 dark:text-white">Hierarchical Schema Tree</h3>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700">
                  {workflow.schema.root.length} {workflow.schema.root.length === 1 ? 'Class' : 'Classes'}
                </span>
              </div>

              {/* Tree Search Box */}
              <div className="relative">
                <Search className="h-3.5 w-3.5 absolute left-3 top-2 text-neutral-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search nodes, fields, lookups..."
                  className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 focus:border-neutral-400 rounded-lg pl-8 pr-3 py-1 text-xs text-neutral-800 dark:text-neutral-200 placeholder-neutral-400 focus:outline-none"
                />
              </div>

              {/* Tree View Content */}
              <div className="max-h-[480px] overflow-y-auto space-y-0.5 pr-1 font-mono text-xs">
                {workflow.schema.root.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center space-y-2">
                    <AlertCircle className="h-5 w-5 text-neutral-400" />
                    <p className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400">
                      Schema tree is empty
                    </p>
                    <p className="text-[10px] text-neutral-400 dark:text-neutral-500 max-w-[200px]">
                      The backend returned an empty root. The JSON editor on the right contains the complete raw response.
                    </p>
                  </div>
                ) : (
                  workflow.schema.root.map((rootNode, idx) =>
                    renderTreeNode(rootNode, `root-${idx}`, 0)
                  )
                )}
              </div>
            </div>

            <div className="pt-2.5 border-t border-neutral-100 dark:border-neutral-800 text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center justify-between">
              <span>SCDP JSON Structure Valid</span>
              <span className="text-neutral-800 dark:text-neutral-200 font-mono font-semibold">100% Deterministic</span>
            </div>
          </div>

          {/* Right Pane: Live JSON Code Editor (7 cols) */}
          <div className="lg:col-span-7 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 shadow-sm flex flex-col justify-between transition-colors">
            <div className="space-y-3 flex-1 flex flex-col">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-neutral-800">
                <div className="flex items-center space-x-2">
                  <FileCode className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
                  <h3 className="text-xs font-bold text-neutral-900 dark:text-white">Formatted SCDP JSON Editor</h3>
                </div>
                
                <div className="flex items-center space-x-2.5">
                  <span className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400">
                    {(editedSchemaJson.length / 1024).toFixed(1)} KB • {isEditing ? 'Editing' : 'Read-Only'}
                  </span>

                  {!isEditing ? (
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold text-neutral-700 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700 rounded-md transition-colors cursor-pointer"
                      title="Edit schema JSON directly"
                    >
                      <Edit3 className="h-3 w-3" />
                      <span>Edit</span>
                    </button>
                  ) : (
                    <div className="flex items-center space-x-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setEditedSchemaJson(workflow.schema?.rawJson || '');
                          setIsEditing(false);
                        }}
                        className="px-2 py-1 text-xs text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-white rounded-md transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleSave();
                          setIsEditing(false);
                        }}
                        className="flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold text-white dark:text-neutral-900 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 rounded-md transition-colors cursor-pointer shadow-xs"
                      >
                        <Check className="h-3 w-3" />
                        <span>Save</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Editor Area */}
              <div className="flex-1 min-h-[440px] relative rounded-lg bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 overflow-hidden">
                <textarea
                  readOnly={!isEditing}
                  value={editedSchemaJson}
                  onChange={(e) => setEditedSchemaJson(e.target.value)}
                  spellCheck={false}
                  className={`w-full h-full min-h-[440px] p-4 font-mono text-xs leading-relaxed resize-none focus:outline-none transition-colors ${
                    !isEditing
                      ? 'bg-neutral-50/50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 select-text cursor-default'
                      : 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100'
                  }`}
                />
              </div>
            </div>

            <div className="pt-2.5 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400">
              <span>
                {isEditing
                  ? 'Editing enabled • Click Save to commit changes to workspace model'
                  : 'Read-only view • Click Edit above to modify JSON'}
              </span>
              <span className="font-mono text-neutral-500 dark:text-neutral-400">Deterministic SCDP Model</span>
            </div>
          </div>
        </div>
      </div>

      {/* Proceed with Info Modal */}
      <GenerateWithInfoModal
        isOpen={isProceedModalOpen}
        onClose={() => setIsProceedModalOpen(false)}
        onGenerate={(info) => {
          if (info) {
            addAdditionalInformation(info);
          }
          setStage('output');
        }}
        title="Do you want to add any additional information?"
        generationLabel="Proceed to Final Output"
      />
    </div>
  );
};
