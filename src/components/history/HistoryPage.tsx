'use client';

import React, { useState, useEffect } from 'react';
import { useWorkflow } from '../../context/WorkflowContext';
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
  Loader2
} from 'lucide-react';
import { StageActionBar } from '../layout/StageActionBar';

interface HistoryManifest {
  runId: string;
  status: string;
  createdAt: string;
  completedAt?: string;
  outputs?: {
    oneLinerToBO?: string[];
    scdpSchemaOutput?: string[];
  };
}

// Minimal metadata we extract from the JSON
interface RunMetadata {
  title: string;
  classCount: number;
  componentCount: number;
  domain?: string;
  highLevelRequirement?: string;
}

export const HistoryPage: React.FC = () => {
  const { startNewSchema, loadHistoricalSchemaForEdit } = useWorkflow();
  const [runs, setRuns] = useState<HistoryManifest[]>([]);
  const [metadataCache, setMetadataCache] = useState<Record<string, RunMetadata>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  
  const [selectedRun, setSelectedRun] = useState<HistoryManifest | null>(null);

  // Define dynamic backend URL
  const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const fetchHistory = async () => {
    setIsLoading(true);
    setIsError(false);
    
    const requestUrl = `${backendUrl}/api/history`;
    console.log(`[HISTORY FE] Loading history from: ${requestUrl}`);
    
    try {
      const res = await fetch(requestUrl);
      if (res.ok) {
        const data = await res.json();
        setRuns(data.runs || []);
      } else {
        console.error(`[HISTORY FE] History API failed\nstatus: ${res.status}\nerror: Response not ok`);
        setIsError(true);
      }
    } catch (err: any) {
      console.error(`[HISTORY FE] History API failed\nstatus: 0\nerror: ${err.message || String(err)}`);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // Fetch metadata for runs to populate class counts/title
  useEffect(() => {
    const fetchMetadataForRuns = async () => {
      const newCache = { ...metadataCache };
      let updated = false;

      for (const run of runs) {
        if (!newCache[run.runId] && run.outputs?.scdpSchemaOutput && run.outputs.scdpSchemaOutput.length > 0) {
          try {
            const scdpFiles = run.outputs.scdpSchemaOutput;
            const targetFile = scdpFiles.find(f => f.includes('SCDP_Generated_Schema')) || scdpFiles[0];
            
            const res = await fetch(`${backendUrl}/api/history/${run.runId}/file/SCDP_SCHEMA_OUTPUT/${encodeURIComponent(targetFile)}`);
            if (res.ok) {
              const text = await res.text();
              const json = JSON.parse(text);
              
              let title = `Run ${run.runId.split('_').pop()}`;
              let classCount = 0;
              let compCount = 0;
              let domain = 'Not Available';
              let highLevelRequirement = 'Not Available';
              
              if (Array.isArray(json) && json.length > 0) {
                const root = json[0];
                const children = root.children || [];
                const schemaGroup = children.find((c: any) => c.technicalName === 'SchemaGroupName');
                if (schemaGroup && schemaGroup.val) {
                  title = schemaGroup.val;
                  domain = title;
                  highLevelRequirement = `Generated schema for ${title}`;
                }
                
                const schemaClassNode = children.find((c: any) => c.technicalName === 'SchemaClass');
                if (schemaClassNode && schemaClassNode.children) {
                  classCount = schemaClassNode.children.length;
                  const countNodes = (nodes: any[]): number => {
                    return nodes.reduce((acc, curr) => acc + 1 + countNodes(curr.children || []), 0);
                  };
                  compCount = countNodes(schemaClassNode.children);
                }
              }
              
              newCache[run.runId] = { title, classCount, componentCount: compCount, domain, highLevelRequirement };
              updated = true;
            }
          } catch (e) {
            console.error('Metadata fetch error for', run.runId, e);
          }
        }
      }
      
      if (updated) {
        setMetadataCache(newCache);
      }
    };

    if (runs.length > 0) {
      fetchMetadataForRuns();
    }
  }, [runs, backendUrl]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Delete this saved schema history?')) {
      try {
        const res = await fetch(`${backendUrl}/api/history/${id}`, { method: 'DELETE' });
        if (res.ok) {
          setRuns(prev => prev.filter(r => r.runId !== id));
          if (selectedRun?.runId === id) setSelectedRun(null);
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
    const scdpFiles = run.outputs?.scdpSchemaOutput || [];
    const targetFile = scdpFiles.find(f => f.includes('SCDP_Generated_Schema')) || scdpFiles[0];
    
    if (!targetFile) {
      alert("No SCDP schema output found for this run.");
      return;
    }

    try {
      const res = await fetch(`${backendUrl}/api/history/${run.runId}/file/SCDP_SCHEMA_OUTPUT/${encodeURIComponent(targetFile)}`);
      if (res.ok) {
        const text = await res.text();
        loadHistoricalSchemaForEdit(text);
      } else {
        alert("Failed to load historical schema JSON.");
      }
    } catch (err) {
      console.error(err);
      alert("Error loading schema.");
    }
  };

  const filteredRecords = runs.filter((r) => {
    const meta = metadataCache[r.runId];
    const title = meta?.title || r.runId;
    const domain = meta?.domain || '';
    const hlr = meta?.highLevelRequirement || '';
    
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      title.toLowerCase().includes(query) ||
      r.runId.toLowerCase().includes(query) ||
      domain.toLowerCase().includes(query) ||
      hlr.toLowerCase().includes(query);
    
    const displayStatus = r.status.charAt(0).toUpperCase() + r.status.slice(1);
    const matchesStatus = selectedStatus === 'All' || displayStatus === selectedStatus;
    
    return matchesSearch && matchesStatus;
  });

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
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

        {/* Content States */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-neutral-500 dark:text-neutral-400">
            <Loader2 className="h-8 w-8 mb-4 animate-spin text-blue-500" />
            <p className="text-sm font-semibold">Loading saved schemas...</p>
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-20 text-rose-500 dark:text-rose-400">
            <AlertCircle className="h-10 w-10 mb-4 opacity-50" />
            <h3 className="text-sm font-bold mb-2">Unable to load schema history.</h3>
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
              const meta = metadataCache[record.runId];
              const displayStatus = record.status.toUpperCase();
              
              return (
                <div 
                  key={record.runId}
                  className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all group flex flex-col justify-between shadow-sm"
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-neutral-900 dark:text-white line-clamp-1 mb-1">
                          {meta?.title || record.runId}
                        </h3>
                        <p className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400">
                          {record.runId}
                        </p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase border ${
                        displayStatus === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/50' :
                        displayStatus === 'FAILED' ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/50' :
                        'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50'
                      }`}>
                        {displayStatus}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 text-xs text-neutral-600 dark:text-neutral-400">
                        <span className="font-semibold w-16 shrink-0">Domain:</span>
                        <span className="truncate">{meta?.domain || 'Loading...'}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-xs text-neutral-600 dark:text-neutral-400">
                        <span className="font-semibold w-16 shrink-0">Updated:</span>
                        <span>{formatDate(record.completedAt || record.createdAt)}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-xs text-neutral-600 dark:text-neutral-400">
                        <span className="font-semibold w-16 shrink-0">Classes:</span>
                        <span>{meta?.classCount || 0}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-xs text-neutral-600 dark:text-neutral-400">
                        <span className="font-semibold w-16 shrink-0">Components:</span>
                        <span>{meta?.componentCount || 0}</span>
                      </div>
                    </div>
                    
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2 italic">
                      {meta?.highLevelRequirement || 'No description available'}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mt-5 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                    <button
                      onClick={(e) => handleOpenEdit(e, record)}
                      className="flex-1 flex items-center justify-center space-x-1.5 px-3 py-2 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-900 font-semibold rounded-lg text-xs transition-colors cursor-pointer"
                    >
                      <FolderOpen className="h-3.5 w-3.5" />
                      <span>Open & Edit</span>
                    </button>
                    
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
