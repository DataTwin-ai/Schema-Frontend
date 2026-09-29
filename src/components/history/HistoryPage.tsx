'use client';

import React, { useState, useEffect } from 'react';
import { useWorkflow } from '../../context/WorkflowContext';
import { API_URL } from '../../services/api/config';
import { 
  History as HistoryIcon, 
  Search, 
  Plus, 
  ArrowRight, 
  Clock, 
  Trash2,
  FileText,
  ChevronLeft,
  FolderOpen,
  X,
  Code2,
  AlertCircle,
  RefreshCw,
  Loader2,
  Edit2,
  Check
} from 'lucide-react';
import { StageActionBar } from '../layout/StageActionBar';

interface HistoryManifest {
  runId: string;
  displayName: string;
  status: string;
  stage?: string;
  createdAt: string;
  completedAt?: string;
  draftSavedAt?: string;
  updatedAt?: string;
  domain?: string;
  hlrSnippet?: string;
  classCount?: number;
}

export const HistoryPage: React.FC = () => {
  const { workflow, startNewSchema, loadHistoricalSchemaForEdit, continueDraft, setStage, saveDraft } = useWorkflow();
  const [runs, setRuns] = useState<HistoryManifest[]>([]);
  const [errorsCount, setErrorsCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  
  const [isLoading, setIsLoading] = useState(true);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  
  // Rename state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renameError, setRenameError] = useState('');

  const fetchHistory = async () => {
    setIsLoading(true);
    setErrorDetails(null);
    setErrorsCount(0);
    
    try {
      const res = await fetch(`${API_URL}/history`);
      if (res.ok) {
        const data = await res.json();
        setRuns(data.items || []);
        setErrorsCount(data.errors?.length || 0);
      } else {
        const errData = await res.json().catch(() => ({}));
        setErrorDetails(`HTTP ${res.status}: ${errData.detail || res.statusText}`);
      }
    } catch (err: any) {
      setErrorDetails(`Backend not reachable at ${API_URL}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Delete this saved schema history?')) {
      try {
        const res = await fetch(`${API_URL}/history/${id}`, { method: 'DELETE' });
        if (res.ok) {
          setRuns(prev => prev.filter(r => r.runId !== id));
        } else {
          alert('Failed to delete run from backend.');
        }
      } catch (err) {
        console.error('Failed to delete', err);
        alert('Error communicating with backend to delete.');
      }
    }
  };

  const handleOpenEdit = async (e: React.MouseEvent, run: HistoryManifest) => {
    e.stopPropagation();
    try {
      const res = await fetch(`${API_URL}/history/${run.runId}`);
      if (res.ok) {
        const data = await res.json();
        loadHistoricalSchemaForEdit(data);
      } else {
        const errText = await res.text();
        alert(`Failed to load historical schema JSON: ${errText}`);
      }
    } catch (err) {
      console.error(err);
      alert('Error loading schema.');
    }
  };

  const handleContinue = async (e: React.MouseEvent, run: HistoryManifest) => {
    e.stopPropagation();
    
    // Dirty check
    if (workflow.runId && workflow.runId !== run.runId) {
      const isDirty = !workflow.lastDraftSavedAt || (new Date(workflow.updatedAt || 0) > new Date(workflow.lastDraftSavedAt));
      if (isDirty) {
        if (confirm('Save current work as draft before switching?\n\nOK = Save & continue\nCancel = Discard & continue')) {
          try {
            await saveDraft();
          } catch (e: any) {
            alert('Failed to save draft. Cannot continue.');
            return;
          }
        }
      }
    }
    
    try {
      await continueDraft(run.runId);
      // setStage is called inside continueDraft
    } catch (err: any) {
      alert(`Failed to continue draft: ${err.message}`);
    }
  };

  const startRename = (e: React.MouseEvent, run: HistoryManifest) => {
    e.stopPropagation();
    setEditingId(run.runId);
    setRenameValue(run.displayName || run.runId);
    setRenameError('');
  };

  const submitRename = async (id: string) => {
    if (!renameValue.trim()) {
      setRenameError('Name cannot be empty');
      return;
    }
    try {
      const res = await fetch(`${API_URL}/history/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: renameValue })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setRenameError(err.detail || 'Failed to rename');
        return;
      }
      const updated = await res.json();
      setRuns(prev => prev.map(r => r.runId === id ? updated : r));
      setEditingId(null);
    } catch (err) {
      setRenameError('Error saving name');
    }
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') {
      submitRename(id);
    } else if (e.key === 'Escape') {
      setEditingId(null);
    }
  };

  const filteredRecords = runs.filter((r) => {
    const query = searchQuery.toLowerCase();
    const displayName = r.displayName || '';
    const domain = r.domain || '';
    const hlr = r.hlrSnippet || '';
    
    const matchesSearch = 
      displayName.toLowerCase().includes(query) ||
      r.runId.toLowerCase().includes(query) ||
      domain.toLowerCase().includes(query) ||
      hlr.toLowerCase().includes(query);
    
    let matchesStatus = true;
    if (selectedStatus === 'Completed') matchesStatus = r.status === 'completed';
    if (selectedStatus === 'Draft') matchesStatus = r.status === 'draft';
    if (selectedStatus === 'Failed') matchesStatus = r.status === 'failed';
    // in_progress shows under All automatically
    
    return matchesSearch && matchesStatus;
  });

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="flex flex-col min-h-full">
      <StageActionBar
        title="Schema History & Saved Sessions"
        description="Select a previously generated schema to open it in Edit Mode, or start a new schema."
        rightActions={
          <button
            onClick={startNewSchema}
            className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs transition-all shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Schema</span>
          </button>
        }
      />
      
      <div className="flex-1 p-5 lg:p-6 max-w-5xl w-full mx-auto space-y-6 pb-16">
        
        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div className="flex items-center space-x-2 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-lg border border-neutral-200 dark:border-neutral-700 text-xs">
            {['All', 'Completed', 'Draft', 'Failed'].map((status) => (
              <button
                key={status}
                onClick={() => setSelectedStatus(status)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  selectedStatus === status
                    ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
            <input
              type="text"
              placeholder="Search by schema name or domain..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>
        </div>

        {errorsCount > 0 && (
          <div className="text-[11px] text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-lg border border-amber-200 dark:border-amber-800/50">
            {errorsCount} runs couldn't be read.
          </div>
        )}

        {/* Content States */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-neutral-500 dark:text-neutral-400">
            <Loader2 className="h-8 w-8 mb-4 animate-spin text-blue-500" />
            <p className="text-sm font-semibold">Loading saved schemas...</p>
          </div>
        ) : errorDetails ? (
          <div className="flex flex-col items-center justify-center py-20 text-rose-500 dark:text-rose-400">
            <AlertCircle className="h-10 w-10 mb-4 opacity-50" />
            <h3 className="text-sm font-bold mb-2">Unable to load schema history.</h3>
            <p className="text-xs mb-4 opacity-80">{errorDetails}</p>
            <button
              onClick={fetchHistory}
              className="flex items-center space-x-2 px-4 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 rounded-lg text-xs font-semibold transition-colors mt-2"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Retry</span>
            </button>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-neutral-500 dark:text-neutral-400 text-center">
            <HistoryIcon className="h-12 w-12 mb-4 opacity-20" />
            <h3 className="text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-1">No saved generations yet.</h3>
            <p className="text-xs">
              {searchQuery || selectedStatus !== 'All' 
                ? 'Try adjusting your search or filters.' 
                : 'Generated schemas will appear here.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredRecords.map((record) => {
              const displayStatus = (record.status || 'UNKNOWN').toUpperCase();
              
              return (
                <div 
                  key={record.runId}
                  className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all group flex flex-col justify-between shadow-sm"
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 mr-4">
                        {editingId === record.runId ? (
                          <div className="mb-1">
                            <div className="flex items-center space-x-2">
                              <input
                                autoFocus
                                type="text"
                                value={renameValue}
                                onChange={e => setRenameValue(e.target.value)}
                                onKeyDown={e => handleRenameKeyDown(e, record.runId)}
                                className="w-full bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded px-2 py-1 text-sm font-bold focus:outline-none focus:border-blue-500"
                              />
                              <button onClick={() => submitRename(record.runId)} className="p-1 text-green-600 hover:bg-green-50 rounded">
                                <Check className="h-4 w-4" />
                              </button>
                              <button onClick={() => setEditingId(null)} className="p-1 text-neutral-400 hover:bg-neutral-100 rounded">
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                            {renameError && <p className="text-[10px] text-rose-500 mt-1">{renameError}</p>}
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2 group/title">
                            <h3 className="text-sm font-bold text-neutral-900 dark:text-white line-clamp-1 mb-1">
                              {record.displayName}
                            </h3>
                            <button onClick={(e) => startRename(e, record)} className="opacity-0 group-hover/title:opacity-100 p-1 text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 transition-opacity">
                              <Edit2 className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                        <p className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400">
                          {record.runId}
                        </p>
                      </div>
                      <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase border ${
                        displayStatus === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/50' :
                        displayStatus === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800/50' :
                        displayStatus === 'FAILED' ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/50' :
                        'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50'
                      }`}>
                        {displayStatus === 'IN_PROGRESS' ? 'ACTIVE' : displayStatus}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 text-xs text-neutral-600 dark:text-neutral-400">
                        <span className="font-semibold w-16 shrink-0">Domain:</span>
                        <span className="truncate">{record.domain || 'Not Available'}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-xs text-neutral-600 dark:text-neutral-400">
                        <span className="font-semibold w-16 shrink-0">Updated:</span>
                        <span>{formatDate(record.updatedAt || record.createdAt)}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-xs text-neutral-600 dark:text-neutral-400">
                        <span className="font-semibold w-16 shrink-0">Classes:</span>
                        <span>{record.classCount || 0}</span>
                      </div>
                      {(displayStatus === 'DRAFT' || displayStatus === 'IN_PROGRESS') && record.stage && (
                        <div className="flex items-center space-x-2 text-xs text-neutral-600 dark:text-neutral-400">
                          <span className="font-semibold w-16 shrink-0">Stopped at:</span>
                          <span className="capitalize">{record.stage.replace('-', ' ')}</span>
                        </div>
                      )}
                    </div>
                    
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2 italic">
                      {record.hlrSnippet || 'No description available'}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mt-5 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                    {displayStatus === 'COMPLETED' ? (
                      <button
                        onClick={(e) => handleOpenEdit(e, record)}
                        className="flex-1 flex items-center justify-center space-x-1.5 px-3 py-2 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-900 font-semibold rounded-lg text-xs transition-colors cursor-pointer"
                      >
                        <FolderOpen className="h-3.5 w-3.5" />
                        <span>Open</span>
                      </button>
                    ) : (
                      <button
                        onClick={(e) => handleContinue(e, record)}
                        className="flex-1 flex items-center justify-center space-x-1.5 px-3 py-2 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-900 font-semibold rounded-lg text-xs transition-colors cursor-pointer"
                      >
                        <ArrowRight className="h-3.5 w-3.5" />
                        <span>Continue</span>
                      </button>
                    )}
                    
                    <button
                      onClick={(e) => handleDelete(e, record.runId)}
                      className="flex items-center justify-center px-3 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                      title="Delete Run"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span className="ml-1.5 sm:hidden">Delete</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
