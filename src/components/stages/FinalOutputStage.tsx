import React, { useState, useEffect, useMemo, useRef } from 'react';
import { API_URL } from '../../services/api/config';
import { useWorkflow } from '../../context/WorkflowContext';
import { pollOperation } from '../../services/api/pollOperation';
import { FinalOutputInputsModal } from '../common/FinalOutputInputsModal';
import { 
  CheckCircle2, 
  Download, 
  Copy, 
  Check, 
  ArrowLeft, 
  FileJson,
  AlertCircle,
  Database,
  Play,
  X,
  Table as TableIcon,
  Code as CodeIcon,
  Search,
  Layers,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText
} from 'lucide-react';
import { StageActionBar } from '../layout/StageActionBar';
import { SaveDraftButton } from '../common/SaveDraftButton';
import { GenerationProcessingModal } from '../layout/GenerationProcessingModal';

export const FinalOutputStage: React.FC = () => {
  const { 
    workflow, 
    setStage, 
    setRunStatus, 
    setActiveOperation,

    updateWorkflowField
  } = useWorkflow();
  
  const [copied, setCopied] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [resultViewerTab, setResultViewerTab] = useState<'actual' | 'expected' | 'diffs'>('actual');
  const [showAllDiffs, setShowAllDiffs] = useState(false);
  const [hasExecuted, setHasExecuted] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const executionLockRef = useRef<boolean>(false);
  const autoTriggeredRef = useRef<boolean>(false);

  // Class-wise viewer state
  const [selectedClass, setSelectedClass] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'table' | 'json'>('table');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const pageSize = 25;
  const viewerSectionRef = useRef<HTMLDivElement>(null);

  // Initialize: load existing result or auto-trigger execution if finalOutputInputs exist and haven't executed yet
  useEffect(() => {
    let mounted = true;
    const fetchExisting = async () => {
       if (workflow.runId && mounted) {
         try {
           const res = await fetch(`${API_URL}/runs/${workflow.runId}/final-output`);
           if (res.ok) {
              const data = await res.json();
              if (mounted && data && !data.error) {
                 setExecutionResult(data);
                 if (data.runStatus) setRunStatus(data.runStatus);
                 setHasExecuted(true);
              }
           }
         } catch(e) {}
       }
    };
    fetchExisting();
    return () => { mounted = false; };
  }, [workflow.runId]);

  useEffect(() => {
     // Auto-trigger execution if we entered this stage with inputs and haven't executed yet
     if (
       workflow.finalOutputInputs &&
       !hasExecuted &&
       !executionResult &&
       !executionError &&
       !executionLockRef.current &&
       !autoTriggeredRef.current
     ) {
        autoTriggeredRef.current = true;
        executeSchema(workflow.finalOutputInputs);
     }
  }, [workflow.finalOutputInputs, hasExecuted, executionResult, executionError]);

  const executeSchema = async (inputs: any) => {
    if (executionLockRef.current) {
      console.warn("Execution already in progress, skipping duplicate call.");
      return;
    }
    executionLockRef.current = true;
    autoTriggeredRef.current = true;

    setHasExecuted(true);
    setExecutionError(null);
    setShowErrorPopup(false);
    setExecutionResult(null);
    setIsExecuting(true);
    
    try {
      const response = await fetch(`${API_URL}/execute-schema`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          runId: workflow.runId,
          eventJson: inputs.eventJson,
          expectedOutput: inputs.expectedOutput,
          schemaKey: inputs.schemaKey,
          uploadSchema: false,
          confirmOverwrite: false
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `Server returned ${response.status}`);
      }
      
      const opData = await response.json();
      
      if (opData.operationId) {
         setActiveOperation({
            operationId: opData.operationId,
            type: 'execute-schema',
            status: 'RUNNING',
            message: 'Executing Schema'
         });
         
         const finalData = await pollOperation(opData.operationId, (step) => {
            // Processing updates
         }, 2000);
         
         setExecutionResult(finalData);
         if (finalData.runStatus) {
           setRunStatus(finalData.runStatus);
         } else {
           const resultStatus = finalData.evaluationResult || finalData.status || 'UNKNOWN';
           if (resultStatus.toUpperCase() === 'PASS') {
             setRunStatus('COMPLETED');
           } else {
             setRunStatus('FAILED');
           }
         }
      } else {
         // Immediate result fallback
         setExecutionResult(opData);
         const resultStatus = opData.evaluationResult || opData.status || 'UNKNOWN';
         if (resultStatus.toUpperCase() === 'PASS') {
           setRunStatus('COMPLETED');
         } else {
           setRunStatus('FAILED');
         }
      }

    } catch (err: any) {
      console.error("Execution failed:", err);
      if (err.name === 'StoppedError' || (err.message && err.message.toLowerCase().includes('stopped'))) {
          setExecutionError("Execution stopped by user.");
      } else {
          let msg = err.message || "Failed to execute schema against the provided Event JSON.";
          setExecutionError(msg);
      }
      setShowErrorPopup(true);
      setRunStatus('FAILED');
    } finally {
      setIsExecuting(false);
      setActiveOperation(null);
      executionLockRef.current = false;
    }
  };

  const handleCopyExpected = async () => {
    if (workflow.finalOutputInputs?.expectedOutput) {
       try {
         await navigator.clipboard.writeText(JSON.stringify(workflow.finalOutputInputs.expectedOutput, null, 2));
         setCopied(true);
         setTimeout(() => setCopied(false), 2000);
       } catch(e) {}
    }
  };

  const inputs = workflow.finalOutputInputs;

  // 1. Available Classes extraction
  const availableClasses = useMemo(() => {
    const classSet = new Set<string>();

    if (executionResult?.comparison?.schemas) {
      Object.keys(executionResult.comparison.schemas).forEach(k => classSet.add(k));
    }
    if (Array.isArray(executionResult?.schemaComparisons)) {
      executionResult.schemaComparisons.forEach((c: any) => {
        if (c.schema) classSet.add(c.schema);
      });
    }
    const actual = executionResult?.actualOutput || executionResult?.output;
    if (actual) {
      if (typeof actual === 'object' && !Array.isArray(actual)) {
        Object.keys(actual).forEach(k => classSet.add(k));
      } else if (Array.isArray(actual)) {
        actual.forEach((r: any) => {
          const name = r?.schemaname || r?.schema || r?.className || r?.class;
          if (name) classSet.add(name);
        });
      }
    }
    const expected = executionResult?.expectedOutput || inputs?.expectedOutput;
    if (expected) {
      if (typeof expected === 'object' && !Array.isArray(expected) && expected._type !== 'file') {
        Object.keys(expected).forEach(k => classSet.add(k));
      } else if (Array.isArray(expected)) {
        expected.forEach((r: any) => {
          const name = r?.schemaname || r?.schema || r?.className || r?.class;
          if (name) classSet.add(name);
        });
      }
    }
    if (Array.isArray(workflow?.classes)) {
      workflow.classes.forEach((c: any) => {
        if (c.className) classSet.add(c.className);
      });
    }

    return Array.from(classSet);
  }, [executionResult, inputs, workflow?.classes]);

  // 2. Helper to get records for a given class
  const getRecordsForClass = (data: any, clsName: string): any[] => {
    if (!data) return [];

    if (typeof data === 'object' && !Array.isArray(data) && data._type !== 'file') {
      if (clsName === 'ALL') {
        const all: any[] = [];
        Object.entries(data).forEach(([key, val]) => {
          if (Array.isArray(val)) {
            val.forEach(item => {
              if (typeof item === 'object' && item !== null && !item.schemaname && !item.schema && !item.className) {
                all.push({ ...item, _class: key });
              } else {
                all.push(item);
              }
            });
          }
        });
        return all;
      }
      return Array.isArray(data[clsName]) ? data[clsName] : [];
    }

    if (Array.isArray(data)) {
      if (clsName === 'ALL') return data;
      return data.filter((r: any) => {
        if (!r || typeof r !== 'object') return false;
        const primary = r.schemaname || r.schema || r.className || r.class || r._class;
        if (primary) {
          return primary === clsName || (typeof primary === 'string' && primary.toLowerCase() === clsName.toLowerCase());
        }
        const secondary = r.recordtype || r.type;
        if (secondary) {
          return secondary === clsName || (typeof secondary === 'string' && secondary.toLowerCase() === clsName.toLowerCase());
        }
        return false;
      });
    }

    return [];
  };

  // 3. Class comparisons for the evaluation table
  const classComparisons = useMemo(() => {
    if (!executionResult) return [];

    const rawSchemas = executionResult.comparison?.schemas;
    const rawList = executionResult.schemaComparisons;
    const actual = executionResult.actualOutput || executionResult.output;
    const expected = executionResult.expectedOutput || inputs?.expectedOutput;

    const rows: Array<{ schema: string; expected: number; actual: number; matched: number; status: string }> = [];
    const seen = new Set<string>();

    if (Array.isArray(rawList) && rawList.length > 0) {
      rawList.forEach((row: any) => {
        const sName = row.schema || row.className || 'Unknown';
        seen.add(sName.toLowerCase());
        rows.push({
          schema: sName,
          expected: row.expectedCount ?? row.expected ?? 0,
          actual: row.actualCount ?? row.actual ?? 0,
          matched: row.matchedCount ?? row.matched ?? 0,
          status: (row.status || 'UNKNOWN').toUpperCase()
        });
      });
    } else if (rawSchemas && typeof rawSchemas === 'object' && Object.keys(rawSchemas).length > 0) {
      Object.entries(rawSchemas).forEach(([name, data]: [string, any]) => {
        seen.add(name.toLowerCase());
        const exp = data.expectedCount ?? data.expected ?? 0;
        const act = data.actualCount ?? data.actual ?? 0;
        const mat = data.matchedCount ?? data.matched ?? 0;
        let st = (data.status || '').toUpperCase();
        if (st === 'MATCH') st = 'PASS';
        else if (st === 'MISMATCH') st = 'FAIL';
        else if (st === 'MISSING_IN_ACTUAL') st = 'MISSING';
        else if (st === 'EXTRA_IN_ACTUAL') st = 'EXTRA';
        else if (!st) st = (exp === act && mat === exp) ? 'PASS' : 'FAIL';

        rows.push({
          schema: name,
          expected: exp,
          actual: act,
          matched: mat,
          status: st
        });
      });
    }

    // Merge any other available classes not yet present in rows
    availableClasses.forEach((clsName) => {
      if (!seen.has(clsName.toLowerCase())) {
        const actRecs = getRecordsForClass(actual, clsName);
        const expRecs = getRecordsForClass(expected, clsName);
        const actCount = Array.isArray(actRecs) ? actRecs.length : 0;
        const expCount = Array.isArray(expRecs) ? expRecs.length : 0;
        let st = 'PASS';
        if (expCount === 0 && actCount > 0) st = 'EXTRA';
        else if (expCount > 0 && actCount === 0) st = 'MISSING';
        else if (expCount !== actCount) st = 'MISMATCH';

        rows.push({
          schema: clsName,
          expected: expCount,
          actual: actCount,
          matched: st === 'PASS' ? actCount : 0,
          status: st
        });
        seen.add(clsName.toLowerCase());
      }
    });

    return rows;
  }, [executionResult, availableClasses, inputs]);

  // 4. Differences
  const allDiffs = useMemo(() => {
    if (Array.isArray(executionResult?.comparison?.diffs)) return executionResult.comparison.diffs;
    if (Array.isArray(executionResult?.differences)) return executionResult.differences;
    if (Array.isArray(executionResult?.diffs)) return executionResult.diffs;
    return [];
  }, [executionResult]);

  const filteredDiffs = useMemo(() => {
    if (!allDiffs || allDiffs.length === 0) return [];
    if (selectedClass === 'ALL') return allDiffs;
    return allDiffs.filter((d: any) => {
      const s = d.schema || d.schemaname || d.className;
      return s === selectedClass || (typeof s === 'string' && s.toLowerCase() === selectedClass.toLowerCase());
    });
  }, [allDiffs, selectedClass]);

  // 5. Total count
  const totalActualRecordsCount = useMemo(() => {
    const act = getRecordsForClass(executionResult?.actualOutput || executionResult?.output, 'ALL');
    return Array.isArray(act) ? act.length : 0;
  }, [executionResult]);

  // 6. Current raw and class records
  const currentClassActualRecords = useMemo(() => {
    return getRecordsForClass(executionResult?.actualOutput || executionResult?.output, selectedClass);
  }, [executionResult, selectedClass]);

  const currentClassExpectedRecords = useMemo(() => {
    return getRecordsForClass(executionResult?.expectedOutput || inputs?.expectedOutput, selectedClass);
  }, [executionResult, inputs, selectedClass]);

  const currentClassRecords = useMemo(() => {
    if (resultViewerTab === 'actual') return currentClassActualRecords;
    return currentClassExpectedRecords;
  }, [resultViewerTab, currentClassActualRecords, currentClassExpectedRecords]);

  // 7. Filtered records by search query
  const filteredRecords = useMemo(() => {
    if (!Array.isArray(currentClassRecords)) return [];
    if (!searchQuery.trim()) return currentClassRecords;
    const q = searchQuery.toLowerCase().trim();
    return currentClassRecords.filter((rec: any) => {
      if (typeof rec !== 'object' || rec === null) return String(rec).toLowerCase().includes(q);
      return Object.values(rec).some(v => String(v).toLowerCase().includes(q));
    });
  }, [currentClassRecords, searchQuery]);

  // 8. Pagination
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const paginatedRecords = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, page, pageSize]);

  // 9. Columns for table view
  const tableColumns = useMemo(() => {
    if (!Array.isArray(currentClassRecords) || currentClassRecords.length === 0) return [];
    const keys = new Set<string>();
    const priority = [
      'lineid', 'schemaname', 'recordtype', 'gstin', 'pan', 
      'documentnumber', 'amount', 'taxablevalue', 'itcamount', 
      'totaltax', 'financialyear', 'month'
    ];
    currentClassRecords.slice(0, 30).forEach((r: any) => {
      if (typeof r === 'object' && r !== null) {
        Object.keys(r).forEach(k => keys.add(k));
      }
    });
    const cols: string[] = [];
    priority.forEach(p => {
      if (keys.has(p)) {
        cols.push(p);
        keys.delete(p);
      }
    });
    keys.forEach(k => cols.push(k));
    return cols;
  }, [currentClassRecords]);

  const handleSelectClass = (clsName: string) => {
    setSelectedClass(clsName);
    setPage(1);
    viewerSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleCopyClassOutput = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(currentClassRecords, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch(e) {}
  };

  const handleDownloadClassOutput = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentClassRecords, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      const fileName = `${selectedClass === 'ALL' ? 'all_classes' : selectedClass.toLowerCase()}_${resultViewerTab}.json`;
      downloadAnchor.setAttribute("download", fileName);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (e) {
      console.error("Failed to download output JSON", e);
    }
  };

  if (!inputs && !hasExecuted) {
    return (
      <div className="flex flex-col min-h-full">
        <StageActionBar title="Final Output" description="Waiting for inputs..." />
        <div className="flex-1 p-12 text-center text-neutral-600 dark:text-neutral-400">
           <p className="text-xs">No inputs provided yet.</p>
           <button onClick={() => setStage('schema')} className="mt-4 px-4 py-2 bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 rounded-lg text-xs font-semibold">
             Return to Schema Studio
           </button>
        </div>
      </div>
    );
  }

  const dsMap = inputs?.eventJson?.SourceDataMap || {};
  let expectedSummary = "None";
  if (inputs?.expectedOutput) {
     if (Array.isArray(inputs.expectedOutput)) {
        expectedSummary = `${inputs.expectedOutput.length} Expected Records`;
     } else if (inputs.expectedOutput._type === 'file') {
        expectedSummary = `Attached File (${inputs.expectedOutput.name})`;
     } else {
        expectedSummary = "Custom JSON";
     }
  }

  return (
    <div className="flex flex-col min-h-full">
      <StageActionBar
        title="Final Output"
        description={workflow.runStatus === 'COMPLETED' ? "Evaluation successful. Run complete." : "Evaluation results based on your runtime data."}
        leftActions={
          <button
            onClick={() => setStage('schema')}
            className="p-1.5 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            title="Back to Schema Studio"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        }
        rightActions={
          <>
            <button
              onClick={() => {
                 if (workflow.runId) {
                    window.open(`${API_URL}/schema/${workflow.runId}/download`, '_blank');
                 }
              }}
              className="flex items-center space-x-1.5 px-4 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 font-semibold rounded-lg text-xs transition-all shadow-sm shrink-0"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download Schema</span>
            </button>
            <button
              onClick={() => {
                 if (workflow.runId) {
                    window.open(`${API_URL}/final-output/download?runId=${workflow.runId}`, '_blank');
                 }
              }}
              className="flex items-center space-x-1.5 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:hover:bg-neutral-100 dark:text-neutral-900 font-semibold rounded-lg text-xs transition-all shadow-sm shrink-0"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download results</span>
            </button>
          </>
        }
      />

      <div className="flex-1 p-5 lg:p-6 max-w-5xl w-full mx-auto space-y-4 pb-16">
        
        {/* Top Inputs Used Card */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-sm space-y-4">
           <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <div className="flex items-center space-x-2">
                 <Database className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                 <h3 className="text-xs font-bold text-neutral-900 dark:text-white">Inputs Used for Execution</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 rounded-md text-xs font-semibold transition-colors"
              >
                Change inputs
              </button>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                 <div className="text-[10px] font-bold text-neutral-500 uppercase">Event JSON</div>
                 <div className="flex items-center space-x-2 text-xs font-mono text-neutral-700 dark:text-neutral-300">
                    <FileJson className="h-4 w-4 text-blue-500" />
                    <span className="truncate">{inputs?.eventFileName || 'Pasted Event JSON'}</span>
                 </div>
                 {inputs?.eventJson?.TenantID && inputs?.eventJson?.Process && (
                    <div className="flex gap-2">
                       <span className="px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded text-[10px] font-semibold">Tenant: {inputs.eventJson.TenantID}</span>
                       <span className="px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded text-[10px] font-semibold">Process: {inputs.eventJson.Process}</span>
                    </div>
                 )}
                 <div className="flex flex-wrap gap-1.5 pt-1">
                    {Object.entries(dsMap).map(([k,v]: any) => (
                       <span key={k} className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50 rounded-md text-[10px] font-bold">
                         {k} {'\u00b7'} {v.length ? v.length : v}
                       </span>
                    ))}
                 </div>
              </div>

              <div className="space-y-4">
                 <div className="space-y-1.5">
                    <div className="text-[10px] font-bold text-neutral-500 uppercase">Schema Key</div>
                    <div className="flex items-center space-x-2 text-[11px] font-mono text-neutral-800 dark:text-neutral-200">
                       <span className="truncate">{inputs?.schemaKey || 'N/A'}</span>
                       {inputs?.uploadSchema && (
                          <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-800/50 rounded-md text-[9px] font-bold uppercase tracking-wider">
                             Uploaded
                          </span>
                       )}
                    </div>
                 </div>
                 <div className="space-y-1.5">
                    <div className="text-[10px] font-bold text-neutral-500 uppercase">Expected Output</div>
                    <div className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">
                       {inputs?.expectedFileName || expectedSummary}
                    </div>
                 </div>
              </div>
           </div>
        </div>

        {/* Execution Error (if any) */}
        {executionError && (
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-sm">
             <div className="p-4 bg-rose-50 border border-rose-200 dark:bg-rose-950/30 dark:border-rose-900/50 rounded-xl flex items-start space-x-3">
               <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
               <div className="space-y-1">
                 <h3 className="text-xs font-bold text-rose-800 dark:text-rose-300">Execution Failed</h3>
                 <p className="text-xs text-rose-700 dark:text-rose-400">{executionError}</p>
                 {executionResult?.missingDataSources && (
                    <ul className="list-disc list-inside text-[11px] text-rose-600 pt-1">
                      {executionResult.missingDataSources.map((d: string, i: number) => <li key={i}>{d} missing</li>)}
                    </ul>
                 )}
               </div>
             </div>
          </div>
        )}

        {/* Evaluation Result Area */}
        {executionResult && !executionError && (
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm overflow-hidden flex flex-col transition-colors">
            {/* Header / Banner */}
            <div className={`px-5 py-4 border-b ${
                 (executionResult.evaluationResult?.toUpperCase() === 'PASS' || executionResult.status?.toUpperCase() === 'PASS')
                   ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/50'
                   : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/50'
               } flex flex-col sm:flex-row sm:items-center justify-between gap-4`}
            >
              <div className="flex items-center space-x-3">
                 <h2 className={`text-sm font-bold ${
                   (executionResult.evaluationResult?.toUpperCase() === 'PASS' || executionResult.status?.toUpperCase() === 'PASS')
                     ? 'text-emerald-800 dark:text-emerald-400'
                     : 'text-rose-800 dark:text-rose-400'
                 }`}>
                   {executionResult.evaluationResult || executionResult.status || 'UNKNOWN'}
                 </h2>
                 {executionResult.duration && (
                    <span className="text-[10px] font-mono text-neutral-500 opacity-80">
                       Duration: {executionResult.duration}ms
                    </span>
                 )}
              </div>
              {executionResult.s3Uri && (
                 <div className="text-[10px] font-mono text-neutral-600 dark:text-neutral-400 max-w-xs truncate" title={executionResult.s3Uri}>
                    Target: {executionResult.s3Uri}
                 </div>
              )}
            </div>

            <div className="p-5 space-y-6">
              {/* 1. Class-Wise Output Evaluation Table */}
              {classComparisons.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Layers className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <h4 className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                        Class-Wise Output Evaluation
                      </h4>
                    </div>
                    <span className="text-[10px] text-neutral-500 font-medium">
                      {classComparisons.length} {classComparisons.length === 1 ? 'class' : 'classes'} evaluated
                    </span>
                  </div>

                  <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden text-[11px] shadow-sm">
                    <table className="w-full text-left">
                      <thead className="bg-neutral-50 dark:bg-neutral-800/80 text-neutral-600 dark:text-neutral-400 font-semibold uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="p-3 border-b border-neutral-200 dark:border-neutral-700/60">Class / Schema</th>
                          <th className="p-3 border-b border-neutral-200 dark:border-neutral-700/60 text-right">Expected</th>
                          <th className="p-3 border-b border-neutral-200 dark:border-neutral-700/60 text-right">Actual</th>
                          <th className="p-3 border-b border-neutral-200 dark:border-neutral-700/60 text-right">Matched</th>
                          <th className="p-3 border-b border-neutral-200 dark:border-neutral-700/60 text-center">Status</th>
                          <th className="p-3 border-b border-neutral-200 dark:border-neutral-700/60 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300">
                        {classComparisons.map((row: any, i: number) => {
                          const isPass = row.status === 'PASS';
                          const isFail = row.status === 'FAIL' || row.status === 'MISMATCH';
                          const isSelected = selectedClass === row.schema;
                          return (
                            <tr 
                              key={i} 
                              className={`transition-colors hover:bg-neutral-50/80 dark:hover:bg-neutral-800/50 ${isSelected ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''}`}
                            >
                              <td className="p-3">
                                <div className="flex items-center space-x-2">
                                  <span className="font-mono font-semibold text-neutral-900 dark:text-neutral-100">{row.schema}</span>
                                  {isSelected && (
                                    <span className="px-1.5 py-0.2 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 rounded text-[9px] font-bold">
                                      Active
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="p-3 text-right font-mono font-medium text-neutral-600 dark:text-neutral-400">
                                {Number(row.expected).toLocaleString()}
                              </td>
                              <td className="p-3 text-right font-mono font-semibold text-neutral-900 dark:text-neutral-100">
                                {Number(row.actual).toLocaleString()}
                              </td>
                              <td className="p-3 text-right font-mono font-medium text-neutral-600 dark:text-neutral-400">
                                {Number(row.matched).toLocaleString()}
                              </td>
                              <td className="p-3 text-center">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                  isPass 
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60'
                                    : isFail
                                    ? 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/60'
                                    : 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/60'
                                }`}>
                                  {row.status}
                                </span>
                              </td>
                              <td className="p-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleSelectClass(row.schema)}
                                  className="inline-flex items-center space-x-1 px-2.5 py-1 text-[10px] font-semibold text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800/60 rounded-md transition-colors cursor-pointer"
                                >
                                  <Eye className="h-3 w-3" />
                                  <span>Inspect</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 2. Differences Section */}
              {((executionResult.evaluationResult?.toUpperCase() === 'FAIL' || executionResult.status?.toUpperCase() === 'FAIL') && (filteredDiffs.length > 0 || executionResult.differences)) && (
                <div className="bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 rounded-xl p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                      <h4 className="text-xs font-bold text-rose-800 dark:text-rose-300 uppercase tracking-wider">
                        Differences {selectedClass !== 'ALL' ? `(${selectedClass})` : `(${filteredDiffs.length || 'Detected'})`}
                      </h4>
                    </div>
                    <div className="flex items-center space-x-3 text-[11px]">
                      {selectedClass !== 'ALL' && (
                        <button
                          type="button"
                          onClick={() => handleSelectClass('ALL')}
                          className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200 underline cursor-pointer"
                        >
                          View all class diffs
                        </button>
                      )}
                      {filteredDiffs.length > 25 && (
                        <button 
                          type="button"
                          onClick={() => setShowAllDiffs(!showAllDiffs)} 
                          className="text-blue-600 hover:underline cursor-pointer font-medium"
                        >
                          {showAllDiffs ? 'Show less' : `Show all (${filteredDiffs.length})`}
                        </button>
                      )}
                    </div>
                  </div>
                  <pre className="text-[11px] font-mono text-rose-800 dark:text-rose-300 bg-white/70 dark:bg-neutral-950/60 p-3.5 rounded-lg border border-rose-200/60 dark:border-rose-900/40 whitespace-pre-wrap leading-relaxed max-h-[300px] overflow-auto">
                    {filteredDiffs.length > 0
                      ? JSON.stringify(showAllDiffs ? filteredDiffs : filteredDiffs.slice(0, 25), null, 2)
                      : Array.isArray(executionResult.differences) 
                        ? JSON.stringify(showAllDiffs ? executionResult.differences : executionResult.differences.slice(0, 25), null, 2) 
                        : typeof executionResult.differences === 'object' ? JSON.stringify(executionResult.differences, null, 2) : executionResult.differences}
                  </pre>
                </div>
              )}

              {/* 3. Class Output Explorer */}
              <div ref={viewerSectionRef} className="space-y-3 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <Database className="h-4 w-4 text-neutral-700 dark:text-neutral-300" />
                    <div>
                      <h4 className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                        Class Output Explorer
                      </h4>
                      <p className="text-[10px] text-neutral-500">
                        Filter and inspect records per class in table or raw JSON format
                      </p>
                    </div>
                  </div>
                </div>

                {/* Class Selection Pills */}
                <div className="flex flex-wrap items-center gap-1.5 p-2 bg-neutral-100/70 dark:bg-neutral-800/50 rounded-xl border border-neutral-200/80 dark:border-neutral-700/60">
                  <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider pl-1 pr-2 flex items-center space-x-1">
                    <span>Classes:</span>
                  </span>

                  {/* ALL Classes Pill */}
                  <button
                    type="button"
                    onClick={() => handleSelectClass('ALL')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 cursor-pointer ${
                      selectedClass === 'ALL'
                        ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-500/20'
                        : 'bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700/80 border border-neutral-200 dark:border-neutral-700'
                    }`}
                  >
                    <span>All Classes</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      selectedClass === 'ALL'
                        ? 'bg-blue-700 text-white'
                        : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300'
                    }`}>
                      {totalActualRecordsCount}
                    </span>
                  </button>

                  {/* Individual Class Pills */}
                  {availableClasses.map((clsName) => {
                    const actRecs = getRecordsForClass(executionResult?.actualOutput || executionResult?.output, clsName);
                    const count = Array.isArray(actRecs) ? actRecs.length : 0;
                    const comp = classComparisons.find(c => c.schema.toLowerCase() === clsName.toLowerCase());
                    const isSelected = selectedClass === clsName;

                    return (
                      <button
                        key={clsName}
                        type="button"
                        onClick={() => handleSelectClass(clsName)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-500/20'
                            : 'bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700/80 border border-neutral-200 dark:border-neutral-700'
                        }`}
                      >
                        <span className="font-mono">{clsName}</span>
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                          isSelected
                            ? 'bg-blue-700 text-white'
                            : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300'
                        }`}>
                          {count}
                        </span>
                        {comp && comp.status !== 'PASS' && (
                          <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-amber-300' : 'bg-rose-500'}`} title={`Status: ${comp.status}`} />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Explorer Viewer Container */}
                <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-sm bg-white dark:bg-neutral-900">
                  {/* Toolbar Bar */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 bg-neutral-50 dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-800">
                    {/* View Tabs */}
                    <div className="flex items-center space-x-1">
                      <button
                        type="button"
                        onClick={() => { setResultViewerTab('actual'); setPage(1); }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1.5 cursor-pointer ${
                          resultViewerTab === 'actual'
                            ? 'bg-white dark:bg-neutral-900 text-blue-600 dark:text-blue-400 shadow-sm border border-neutral-200/80 dark:border-neutral-700'
                            : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200'
                        }`}
                      >
                        <span>Actual Output</span>
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200/60 dark:border-neutral-700/60">
                          {currentClassActualRecords.length}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => { setResultViewerTab('expected'); setPage(1); }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1.5 cursor-pointer ${
                          resultViewerTab === 'expected'
                            ? 'bg-white dark:bg-neutral-900 text-blue-600 dark:text-blue-400 shadow-sm border border-neutral-200/80 dark:border-neutral-700'
                            : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200'
                        }`}
                      >
                        <span>Expected Output</span>
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200/60 dark:border-neutral-700/60">
                          {currentClassExpectedRecords.length}
                        </span>
                      </button>

                      {filteredDiffs.length > 0 && (
                        <button
                          type="button"
                          onClick={() => { setResultViewerTab('diffs'); }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1.5 cursor-pointer ${
                            resultViewerTab === 'diffs'
                              ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 shadow-sm border border-rose-200 dark:border-rose-900/50'
                              : 'text-rose-600/80 hover:text-rose-700 dark:text-rose-400/80 dark:hover:text-rose-300'
                          }`}
                        >
                          <span>Differences</span>
                          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300">
                            {filteredDiffs.length}
                          </span>
                        </button>
                      )}
                    </div>

                    {/* Search and Display Mode Controls */}
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Search records */}
                      <div className="relative">
                        <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                          placeholder="Search records..."
                          className="pl-8 pr-7 py-1 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-blue-500 w-36 sm:w-48"
                        />
                        {searchQuery && (
                          <button
                            type="button"
                            onClick={() => { setSearchQuery(''); setPage(1); }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>

                      {/* View Mode Toggle */}
                      <div className="flex items-center bg-neutral-200/70 dark:bg-neutral-800 p-0.5 rounded-lg border border-neutral-300/60 dark:border-neutral-700">
                        <button
                          type="button"
                          onClick={() => setViewMode('table')}
                          title="Table View"
                          className={`p-1 sm:px-2 sm:py-1 rounded-md text-[11px] font-semibold flex items-center space-x-1 cursor-pointer transition-colors ${
                            viewMode === 'table'
                              ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
                          }`}
                        >
                          <TableIcon className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Table</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setViewMode('json')}
                          title="JSON View"
                          className={`p-1 sm:px-2 sm:py-1 rounded-md text-[11px] font-semibold flex items-center space-x-1 cursor-pointer transition-colors ${
                            viewMode === 'json'
                              ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
                          }`}
                        >
                          <CodeIcon className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">JSON</span>
                        </button>
                      </div>

                      {/* Copy and Download buttons */}
                      <button
                        type="button"
                        onClick={handleCopyClassOutput}
                        title="Copy records to clipboard"
                        className="flex items-center space-x-1 px-2.5 py-1 bg-white dark:bg-neutral-800 text-neutral-700 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white rounded-lg border border-neutral-200 dark:border-neutral-700 text-[11px] font-medium transition-colors cursor-pointer"
                      >
                        {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                        <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleDownloadClassOutput}
                        title="Download JSON file"
                        className="flex items-center space-x-1 px-2.5 py-1 bg-white dark:bg-neutral-800 text-neutral-700 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white rounded-lg border border-neutral-200 dark:border-neutral-700 text-[11px] font-medium transition-colors cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Export</span>
                      </button>
                    </div>
                  </div>

                  {/* Explorer Content */}
                  <div>
                    {resultViewerTab === 'diffs' ? (
                      <div className="p-4 bg-rose-50/30 dark:bg-neutral-950 max-h-[500px] overflow-auto">
                        <pre className="text-[11px] font-mono text-rose-700 dark:text-rose-400 whitespace-pre-wrap leading-relaxed">
                          {JSON.stringify(filteredDiffs, null, 2)}
                        </pre>
                      </div>
                    ) : viewMode === 'table' ? (
                      <div>
                        {filteredRecords.length === 0 ? (
                          <div className="p-10 text-center text-neutral-500 dark:text-neutral-400 space-y-2">
                            <FileText className="h-8 w-8 mx-auto text-neutral-400 dark:text-neutral-600 opacity-60" />
                            <p className="text-xs font-semibold">
                              No records found for class &quot;{selectedClass}&quot;
                              {searchQuery ? ` matching "${searchQuery}"` : ''}
                            </p>
                            <p className="text-[11px] text-neutral-400">
                              Try selecting another class or switching to JSON view
                            </p>
                          </div>
                        ) : (
                          <div>
                            <div className="overflow-x-auto max-h-[520px]">
                              <table className="w-full text-left border-collapse text-[11px]">
                                <thead className="bg-neutral-100 dark:bg-neutral-800/90 text-neutral-600 dark:text-neutral-400 font-semibold uppercase text-[10px] tracking-wider sticky top-0 z-10 shadow-xs">
                                  <tr>
                                    <th className="py-2.5 px-3 border-b border-neutral-200 dark:border-neutral-700 text-center w-12 bg-neutral-100 dark:bg-neutral-800">
                                      #
                                    </th>
                                    {tableColumns.map((col) => (
                                      <th
                                        key={col}
                                        className="py-2.5 px-3 border-b border-neutral-200 dark:border-neutral-700 whitespace-nowrap bg-neutral-100 dark:bg-neutral-800"
                                      >
                                        {col}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 font-mono">
                                  {paginatedRecords.map((row: any, idx: number) => {
                                    const rowIndex = (page - 1) * pageSize + idx + 1;
                                    return (
                                      <tr
                                        key={idx}
                                        className="hover:bg-blue-50/40 dark:hover:bg-neutral-800/60 transition-colors"
                                      >
                                        <td className="py-2 px-3 text-center text-[10px] text-neutral-400 font-sans border-r border-neutral-100 dark:border-neutral-800/60">
                                          {rowIndex}
                                        </td>
                                        {tableColumns.map((col) => {
                                          const val = row[col];
                                          let displayVal = '-';
                                          if (val !== undefined && val !== null) {
                                            displayVal = typeof val === 'object' ? JSON.stringify(val) : String(val);
                                          }

                                          const isKeyCol = col === 'schemaname' || col === 'schema' || col === 'className';
                                          const isIdCol = col === 'lineid' || col === 'documentnumber' || col === 'gstin';
                                          const isAmountCol = col.toLowerCase().includes('tax') || col.toLowerCase().includes('amount') || col.toLowerCase().includes('value');

                                          return (
                                            <td
                                              key={col}
                                              className="py-2 px-3 whitespace-nowrap max-w-xs truncate"
                                              title={displayVal}
                                            >
                                              {isKeyCol ? (
                                                <span className="px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded font-semibold text-[10px]">
                                                  {displayVal}
                                                </span>
                                              ) : isIdCol ? (
                                                <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                                                  {displayVal}
                                                </span>
                                              ) : isAmountCol && !isNaN(Number(displayVal)) ? (
                                                <span className="font-medium text-emerald-700 dark:text-emerald-400">
                                                  {Number(displayVal).toLocaleString()}
                                                </span>
                                              ) : (
                                                <span>{displayVal}</span>
                                              )}
                                            </td>
                                          );
                                        })}
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>

                            {/* Pagination Controls */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-neutral-50 dark:bg-neutral-800/50 border-t border-neutral-200 dark:border-neutral-800 text-xs text-neutral-600 dark:text-neutral-400 font-sans">
                              <div>
                                Showing <span className="font-semibold font-mono">{(page - 1) * pageSize + 1}</span> to{' '}
                                <span className="font-semibold font-mono">
                                  {Math.min(page * pageSize, filteredRecords.length)}
                                </span>{' '}
                                of <span className="font-semibold font-mono">{filteredRecords.length}</span> records
                                {filteredRecords.length !== currentClassRecords.length && (
                                  <span className="ml-1 text-[11px] text-neutral-400">
                                    (filtered from {currentClassRecords.length})
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center space-x-2">
                                <button
                                  type="button"
                                  disabled={page <= 1}
                                  onClick={() => setPage(p => Math.max(1, p - 1))}
                                  className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer text-xs"
                                >
                                  <ChevronLeft className="h-3.5 w-3.5" />
                                  <span>Prev</span>
                                </button>

                                <span className="text-xs font-mono font-medium px-2">
                                  Page {page} of {totalPages}
                                </span>

                                <button
                                  type="button"
                                  disabled={page >= totalPages}
                                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                  className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer text-xs"
                                >
                                  <span>Next</span>
                                  <ChevronRight className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* JSON View */
                      <div className="p-3 bg-neutral-950 max-h-[520px] overflow-auto">
                        <pre className="text-[11px] font-mono text-neutral-200 whitespace-pre-wrap leading-relaxed">
                          {inputs?.expectedOutput?._type === 'file' && resultViewerTab === 'expected' && selectedClass === 'ALL'
                            ? `[Attached Expected Output File: ${inputs.expectedOutput.name}]\nType: ${inputs.expectedOutput.type}\nSize: ${inputs.expectedOutput.size} bytes`
                            : JSON.stringify(filteredRecords, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <FinalOutputInputsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialInputs={inputs}
        onRun={(newInputs) => {
           autoTriggeredRef.current = true;
           updateWorkflowField('finalOutputInputs', newInputs);
           setIsModalOpen(false);
           executeSchema(newInputs);
        }}
      />
      <GenerationProcessingModal isOpen={isExecuting} operationLabel="Executing Schema..." />

      {/* Execution Error Popup Modal */}
      {showErrorPopup && executionError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl w-full max-w-md shadow-2xl p-5 flex flex-col space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-full bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Execution Failed</h3>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">Schema execution encountered an error</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowErrorPopup(false)}
                className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl text-xs text-rose-800 dark:text-rose-300 font-mono leading-relaxed max-h-48 overflow-y-auto">
              {executionError}
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => setShowErrorPopup(false)}
                className="px-4 py-2 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                Dismiss
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowErrorPopup(false);
                  setIsModalOpen(true);
                }}
                className="px-4 py-2 text-xs font-bold bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-900 rounded-lg transition-colors cursor-pointer"
              >
                Change Inputs
              </button>
              {inputs && (
                <button
                  type="button"
                  onClick={() => {
                    setShowErrorPopup(false);
                    executeSchema(inputs);
                  }}
                  className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors cursor-pointer"
                >
                  Retry
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
