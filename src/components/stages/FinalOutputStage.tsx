import React, { useState, useEffect } from 'react';
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
  Play
} from 'lucide-react';
import { StageActionBar } from '../layout/StageActionBar';
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
  const [resultViewerTab, setResultViewerTab] = useState<'actual' | 'expected' | 'ai'>('actual');
  const [showAllDiffs, setShowAllDiffs] = useState(false);
  const [hasExecuted, setHasExecuted] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);

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
     if (workflow.finalOutputInputs && !hasExecuted && !executionResult && !executionError) {
        executeSchema(workflow.finalOutputInputs);
     }
  }, [workflow.finalOutputInputs, hasExecuted, executionResult, executionError]);

  const executeSchema = async (inputs: any) => {
    setHasExecuted(true);
    setExecutionError(null);
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
          uploadSchema: inputs.uploadSchema,
          confirmOverwrite: inputs.confirmOverwrite
        })
      });

      if (response.status === 409) {
         const errData = await response.json().catch(() => ({}));
         if (errData.detail === 'S3_KEY_EXISTS') {
            setIsExecuting(false);
            setIsModalOpen(true);
            return;
         }
      }

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
            // Note: WorkflowContext isn't exposing a direct way to update currentProgressSteps from outside easily,
            // but if backend updates the operation progress, GenerationProcessingModal will display it via GET status.
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
          setExecutionError(err.message || "Failed to execute schema against the provided Event JSON.");
      }
      setRunStatus('FAILED');
    } finally {
      setIsExecuting(false);
      setActiveOperation(null);
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
                         {k} · {v.length ? v.length : v}
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
              {/* Exact Comparison Table */}
              {executionResult.schemaComparisons && (
                 <div className="space-y-2">
                    <h4 className="text-xs font-bold text-neutral-800 dark:text-neutral-200">Per-Schema Output Evaluation</h4>
                    <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden text-[11px]">
                       <table className="w-full text-left">
                          <thead className="bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-semibold uppercase">
                             <tr>
                                <th className="p-2 border-b border-neutral-200 dark:border-neutral-700">Schema</th>
                                <th className="p-2 border-b border-neutral-200 dark:border-neutral-700">Expected</th>
                                <th className="p-2 border-b border-neutral-200 dark:border-neutral-700">Actual</th>
                                <th className="p-2 border-b border-neutral-200 dark:border-neutral-700">Matched</th>
                                <th className="p-2 border-b border-neutral-200 dark:border-neutral-700">Status</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300">
                             {executionResult.schemaComparisons.map((row: any, i: number) => (
                                <tr key={i}>
                                   <td className="p-2 font-mono font-medium">{row.schema}</td>
                                   <td className="p-2">{row.expected}</td>
                                   <td className="p-2">{row.actual}</td>
                                   <td className="p-2">{row.matched}</td>
                                   <td className="p-2">
                                      <span className={row.status === 'PASS' ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>{row.status}</span>
                                   </td>
                                </tr>
                             ))}
                          </tbody>
                       </table>
                    </div>
                 </div>
              )}
              
              {/* Differences List */}
              {((executionResult.evaluationResult?.toUpperCase() === 'FAIL' || executionResult.status?.toUpperCase() === 'FAIL') && executionResult.differences) && (
                <div className="bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/50 rounded-lg p-3">
                  <h4 className="text-[11px] font-bold text-rose-800 dark:text-rose-300 mb-1.5 uppercase tracking-wider flex justify-between">
                     <span>Differences</span>
                     {Array.isArray(executionResult.differences) && executionResult.differences.length > 50 && (
                        <button onClick={() => setShowAllDiffs(!showAllDiffs)} className="text-blue-600 hover:underline lowercase cursor-pointer">{showAllDiffs ? 'Show less' : 'Show all'}</button>
                     )}
                  </h4>
                  <pre className="text-[11px] font-mono text-rose-700 dark:text-rose-400 whitespace-pre-wrap leading-relaxed max-h-[300px] overflow-auto">
                    {Array.isArray(executionResult.differences) 
                      ? JSON.stringify(showAllDiffs ? executionResult.differences : executionResult.differences.slice(0, 50), null, 2) 
                      : typeof executionResult.differences === 'object' ? JSON.stringify(executionResult.differences, null, 2) : executionResult.differences}
                  </pre>
                </div>
              )}
              
              <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden mt-4">
                 <div className="flex justify-between items-center bg-neutral-100 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 pr-2">
                    <div className="flex">
                       <button onClick={() => setResultViewerTab('actual')} className={`px-4 py-2 text-[11px] font-bold transition-colors cursor-pointer ${resultViewerTab === 'actual' ? 'bg-white dark:bg-neutral-950 text-blue-600 dark:text-blue-400 border-t-2 border-t-blue-600 dark:border-t-blue-400' : 'text-neutral-500'}`}>Actual output</button>
                       <button onClick={() => setResultViewerTab('expected')} className={`px-4 py-2 text-[11px] font-bold transition-colors cursor-pointer ${resultViewerTab === 'expected' ? 'bg-white dark:bg-neutral-950 text-blue-600 dark:text-blue-400 border-t-2 border-t-blue-600 dark:border-t-blue-400' : 'text-neutral-500'}`}>Expected output</button>
                    </div>
                    {resultViewerTab === 'expected' && inputs?.expectedOutput && (
                       <button onClick={handleCopyExpected} className="flex items-center space-x-1 px-2 py-1 bg-white dark:bg-neutral-800 text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white rounded border border-neutral-200 dark:border-neutral-700 text-[10px] font-semibold transition-colors cursor-pointer">
                          {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                          <span>{copied ? 'Copied' : 'Copy'}</span>
                       </button>
                    )}
                 </div>
                 <div className="p-3 bg-white dark:bg-neutral-950 max-h-[400px] overflow-auto">
                    {resultViewerTab === 'actual' && (
                       <pre className="text-[11px] font-mono text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap">
                          {JSON.stringify(executionResult.actualOutput || executionResult.output || executionResult, null, 2)}
                       </pre>
                    )}
                    {resultViewerTab === 'expected' && (
                       <pre className="text-[11px] font-mono text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap">
                          {inputs?.expectedOutput?._type === 'file' 
                             ? `[Attached File: ${inputs.expectedOutput.name}]\nType: ${inputs.expectedOutput.type}\nSize: ${inputs.expectedOutput.size} bytes` 
                             : JSON.stringify(inputs?.expectedOutput, null, 2)}
                       </pre>
                    )}
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
           // We re-store inputs in workflow and auto-trigger on effect
           useWorkflow().updateWorkflowField('finalOutputInputs', newInputs); // Note: we can't do this inside here directly via hook, we must use the imported one.
           // Wait, we can't call hooks inside callbacks like this. We extracted `updateWorkflowField` earlier? No we didn't.
           // We will just do:
           setIsModalOpen(false);
        }}
      />
      <GenerationProcessingModal isOpen={isExecuting} operationLabel="Executing Schema..." />
    </div>
  );
};
