'use client';

import React, { useState } from 'react';
import { API_URL } from '../../services/api/config';
import { useWorkflow } from '../../context/WorkflowContext';
import { 
  CheckCircle2, 
  Download, 
  Copy, 
  Check, 
  ArrowLeft, 
  Boxes, 
  Calculator, 
  ShieldCheck, 
  Upload,
  Play,
  FileJson,
  AlertCircle
} from 'lucide-react';
import { StageActionBar } from '../layout/StageActionBar';

export const FinalOutputStage: React.FC = () => {
  const { workflow, setStage, downloadSchemaJson, copySchemaJson, editedSchemaJson, setRunStatus } = useWorkflow();
  const [copied, setCopied] = useState(false);
  const [outputView, setOutputView] = useState<'schema' | 'execution'>('schema');
  
  // Event JSON
  const [eventFile, setEventFile] = useState<File | null>(null);
  const [eventJsonContent, setEventJsonContent] = useState<any>(null);
  const [eventFileError, setEventFileError] = useState<string | null>(null);
  
  // Expected Output JSON
  const [expectedFile, setExpectedFile] = useState<File | null>(null);
  const [expectedJsonContent, setExpectedJsonContent] = useState<any>(null);
  const [expectedFileError, setExpectedFileError] = useState<string | null>(null);
  
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [executionError, setExecutionError] = useState<string | null>(null);

  if (!workflow.schema || !workflow.requirements) {
    return (
      <div className="flex flex-col min-h-full">
        <StageActionBar
          title="Final Output"
          description="Schema not yet generated."
          leftActions={
            <button
              onClick={() => setStage('schema')}
              className="p-1.5 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white rounded-md transition-colors"
              title="Back to Schema Studio"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          }
        />
        <div className="flex-1 p-12 text-center text-neutral-600 dark:text-neutral-400">
          <p className="text-xs">No final schema generated yet. Please return to Schema Studio.</p>
          <button
            onClick={() => setStage('schema')}
            className="mt-4 px-4 py-2 bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 rounded-lg text-xs font-semibold"
          >
            Go to Schema Studio
          </button>
        </div>
      </div>
    );
  }

  const handleCopy = async () => {
    const ok = await copySchemaJson();
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleEventFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setEventFileError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        setEventJsonContent(json);
        setEventFile(file);
      } catch (err) {
        setEventFileError("Invalid JSON file format.");
        setEventFile(null);
        setEventJsonContent(null);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExpectedFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setExpectedFileError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        setExpectedJsonContent(json);
        setExpectedFile(file);
      } catch (err) {
        setExpectedFileError("Invalid JSON file format.");
        setExpectedFile(null);
        setExpectedJsonContent(null);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const executeSchema = async () => {
    if (!eventJsonContent || !expectedJsonContent) return;
    
    setIsExecuting(true);
    setExecutionError(null);
    setExecutionResult(null);


    
    // The current schema source of truth is either the edited one or the original generated one.
    let currentSchema = {};
    try {
      currentSchema = JSON.parse(editedSchemaJson || workflow.schema!.rawJson);
    } catch (e) {
      setExecutionError("Invalid Schema JSON. Please return to Schema Studio to fix the schema formatting.");
      setIsExecuting(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/execute-schema`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          runId: workflow.id,
          schemaJson: currentSchema,
          eventJson: eventJsonContent,
          expectedOutput: expectedJsonContent
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `Server returned ${response.status}`);
      }

      const result = await response.json();
      setExecutionResult(result);
      
      // Determine pass/fail based on result fields
      const resultStatus = result.evaluationResult || result.status || 'UNKNOWN';
      if (resultStatus.toUpperCase() === 'PASS') {
        setRunStatus('COMPLETED');
      } else {
        setRunStatus('FAILED');
      }
    } catch (err: any) {
      console.error("Execution failed:", err);
      setExecutionError(err.message || "Failed to execute schema against the provided Event JSON.");
      setRunStatus('FAILED');
    } finally {
      setIsExecuting(false);
    }
  };

  const canExecute = eventJsonContent && expectedJsonContent && !isExecuting;

  return (
    <div className="flex flex-col min-h-full">
      {/* 1. Sticky Workspace Top Action Bar */}
      <StageActionBar
        title="Execute Generated Schema"
        description={workflow.runStatus === 'COMPLETED' ? "Evaluation successful. Run complete." : "Test and evaluate your schema with runtime data."}
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
              onClick={handleCopy}
              className="flex items-center space-x-1 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs font-semibold transition-all shadow-xs cursor-pointer"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-neutral-800 dark:text-neutral-200" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? 'Copied' : 'Copy JSON'}</span>
            </button>

            <button
              onClick={downloadSchemaJson}
              className="flex items-center space-x-1.5 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:hover:bg-neutral-100 dark:text-neutral-900 font-semibold rounded-lg text-xs transition-all shadow-sm shrink-0 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download Schema</span>
            </button>
          </>
        }
      />

      {/* 2. Main Workspace Content */}
      <div className="flex-1 p-5 lg:p-6 max-w-5xl w-full mx-auto space-y-4 pb-16">
        {/* View Switch */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-lg border border-neutral-200 dark:border-neutral-700 text-xs select-none">
            <button
              type="button"
              onClick={() => setOutputView('schema')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                outputView === 'schema'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              Schema Output
            </button>
            <button
              type="button"
              onClick={() => setOutputView('execution')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                outputView === 'execution'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              Execute Schema
            </button>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-xs text-neutral-500">Run Status:</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
              workflow.runStatus === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50' :
              workflow.runStatus === 'FAILED' ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/50' :
              'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50'
            }`}>
              {workflow.runStatus}
            </span>
          </div>
        </div>

        {/* 2A. Schema Output View */}
        {outputView === 'schema' && (
          <>
            {/* Verification Overview Card */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 lg:p-5 shadow-sm space-y-3 transition-colors">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-neutral-800">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 px-2.5 py-0.5 rounded-md border border-neutral-200 dark:border-neutral-700 flex items-center space-x-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-neutral-700 dark:text-neutral-300" />
                    <span>Production Schema Verified</span>
                  </span>
                </div>
                <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">{workflow.domain}</span>
              </div>

              <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
                The business requirement for <span className="font-semibold text-neutral-900 dark:text-white">{workflow.domain}</span> has been compiled into a validated SCDP schema with {workflow.classes?.length || 7} domain classes, math transformations, and variance reconciliation gating.
              </p>

              {/* Scorecard Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
                <div className="bg-neutral-50 dark:bg-neutral-950 p-3 rounded-lg border border-neutral-200 dark:border-neutral-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-semibold uppercase">Classes</span>
                    <Boxes className="h-3.5 w-3.5 text-neutral-500" />
                  </div>
                  <p className="text-lg font-bold text-neutral-900 dark:text-white mt-0.5">{workflow.classes?.length || 0}</p>
                  <p className="text-[10px] text-neutral-400 truncate mt-0.5">SCDP Core Classes</p>
                </div>

                <div className="bg-neutral-50 dark:bg-neutral-950 p-3 rounded-lg border border-neutral-200 dark:border-neutral-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-semibold uppercase">Components</span>
                    <Calculator className="h-3.5 w-3.5 text-neutral-500" />
                  </div>
                  <p className="text-lg font-bold text-neutral-900 dark:text-white mt-0.5">{workflow.schema.stats.componentCount || 0}</p>
                  <p className="text-[10px] text-neutral-400 truncate mt-0.5">Math & Logics</p>
                </div>

                <div className="bg-neutral-50 dark:bg-neutral-950 p-3 rounded-lg border border-neutral-200 dark:border-neutral-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-semibold uppercase">Traceable Rules</span>
                    <ShieldCheck className="h-3.5 w-3.5 text-neutral-500" />
                  </div>
                  <p className="text-lg font-bold text-neutral-900 dark:text-white mt-0.5">{
                    (workflow.requirements.problemStatements.length + 
                    workflow.requirements.businessObjectives.length + 
                    workflow.requirements.businessRequirements.length + 
                    workflow.requirements.financeRequirements.length + 
                    workflow.requirements.technicalRequirements.length)
                  } Specs</p>
                  <p className="text-[10px] text-neutral-400 truncate mt-0.5">PS, BO, BR, FR, TR</p>
                </div>

                <div className="bg-neutral-50 dark:bg-neutral-950 p-3 rounded-lg border border-neutral-200 dark:border-neutral-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-semibold uppercase">Gating</span>
                    <CheckCircle2 className="h-3.5 w-3.5 text-neutral-500" />
                  </div>
                  <p className="text-lg font-bold text-neutral-900 dark:text-white mt-0.5">Active</p>
                  <p className="text-[10px] text-neutral-400 truncate mt-0.5">Hard-gated execution</p>
                </div>
              </div>
            </div>

            {/* Compiled Production Schema JSON View */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 lg:p-5 shadow-sm space-y-3 transition-colors">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-neutral-800">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-neutral-900 dark:text-white">
                    Compiled Production Schema JSON
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700">
                    {(((editedSchemaJson || workflow.schema.rawJson)?.length || 0) / 1024).toFixed(1)} KB
                  </span>
                </div>
              </div>

              <div className="max-h-[380px] overflow-auto rounded-lg bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 p-3 font-mono text-xs text-neutral-800 dark:text-neutral-200 leading-relaxed">
                <pre className="whitespace-pre">{editedSchemaJson || workflow.schema.rawJson}</pre>
              </div>
            </div>
          </>
        )}

        {/* 2B. Execution Panel View */}
        {outputView === 'execution' && (
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm overflow-hidden flex flex-col transition-colors">
            {/* Header */}
            <div className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-bold text-neutral-900 dark:text-white">Execution & Evaluation</h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Execute the current schema against runtime Event JSON and compare with Expected Output.</p>
              </div>
              
              <button
                onClick={executeSchema}
                disabled={!canExecute}
                className={`flex items-center space-x-2 px-6 py-2.5 rounded-lg text-xs font-bold transition-all shadow-sm ${
                  !canExecute
                    ? 'bg-neutral-200 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20 hover:shadow-blue-500/40 cursor-pointer'
                }`}
              >
                {isExecuting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Evaluating schema...</span>
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5" />
                    <span>Execute Schema →</span>
                  </>
                )}
              </button>
            </div>

            <div className="p-5 space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Event JSON Upload */}
                <div className="space-y-2">
                  <label className="flex justify-between text-xs font-bold text-neutral-800 dark:text-neutral-200">
                    <span>1. Event JSON *</span>
                    {eventFile && <span className="text-emerald-600 dark:text-emerald-400 flex items-center space-x-1"><CheckCircle2 className="h-3 w-3"/><span>Ready</span></span>}
                  </label>
                  
                  <div className="flex flex-col space-y-2">
                    <label className="cursor-pointer inline-flex items-center justify-center space-x-2 px-4 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-semibold rounded-lg border border-neutral-200 dark:border-neutral-700 transition-colors w-full">
                      <Upload className="h-3.5 w-3.5" />
                      <span>Upload Event JSON</span>
                      <input 
                        type="file" 
                        accept=".json" 
                        onChange={handleEventFileUpload} 
                        className="hidden" 
                      />
                    </label>
                    {eventFile && (
                      <div className="flex items-center space-x-2 text-xs font-mono text-neutral-600 dark:text-neutral-300">
                        <FileJson className="h-4 w-4 text-blue-500" />
                        <span className="truncate">{eventFile.name}</span>
                      </div>
                    )}
                    {eventFileError && (
                      <p className="text-[11px] text-rose-600 dark:text-rose-400 flex items-center space-x-1">
                        <AlertCircle className="h-3.5 w-3.5" />
                        <span>{eventFileError}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Expected Output Upload */}
                <div className="space-y-2">
                  <label className="flex justify-between text-xs font-bold text-neutral-800 dark:text-neutral-200">
                    <span>2. Expected Output JSON *</span>
                    {expectedFile && <span className="text-emerald-600 dark:text-emerald-400 flex items-center space-x-1"><CheckCircle2 className="h-3 w-3"/><span>Ready</span></span>}
                  </label>
                  
                  <div className="flex flex-col space-y-2">
                    <label className="cursor-pointer inline-flex items-center justify-center space-x-2 px-4 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-semibold rounded-lg border border-neutral-200 dark:border-neutral-700 transition-colors w-full">
                      <Upload className="h-3.5 w-3.5" />
                      <span>Upload Expected Output</span>
                      <input 
                        type="file" 
                        accept=".json" 
                        onChange={handleExpectedFileUpload} 
                        className="hidden" 
                      />
                    </label>
                    {expectedFile && (
                      <div className="flex items-center space-x-2 text-xs font-mono text-neutral-600 dark:text-neutral-300">
                        <FileJson className="h-4 w-4 text-blue-500" />
                        <span className="truncate">{expectedFile.name}</span>
                      </div>
                    )}
                    {expectedFileError && (
                      <p className="text-[11px] text-rose-600 dark:text-rose-400 flex items-center space-x-1">
                        <AlertCircle className="h-3.5 w-3.5" />
                        <span>{expectedFileError}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Execution Error */}
              {executionError && (
                <div className="p-4 bg-rose-50 border border-rose-200 dark:bg-rose-950/30 dark:border-rose-900/50 rounded-xl flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h3 className="text-xs font-bold text-rose-800 dark:text-rose-300">Execution Failed</h3>
                    <p className="text-xs text-rose-700 dark:text-rose-400">{executionError}</p>
                  </div>
                </div>
              )}

              {/* Evaluation Result */}
              {executionResult && (
                <div className="space-y-4 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200">Evaluation Result</label>
                    <span className={`text-[11px] font-bold px-3 py-1 rounded-md uppercase border ${
                      (executionResult.evaluationResult?.toUpperCase() === 'PASS' || executionResult.status?.toUpperCase() === 'PASS')
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/50'
                        : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/50'
                    }`}>
                      {executionResult.evaluationResult || executionResult.status || 'UNKNOWN'}
                    </span>
                  </div>
                  
                  {/* Differences */}
                  {((executionResult.evaluationResult?.toUpperCase() === 'FAIL' || executionResult.status?.toUpperCase() === 'FAIL') && executionResult.differences) && (
                    <div className="bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/50 rounded-lg p-3">
                      <h4 className="text-[11px] font-bold text-rose-800 dark:text-rose-300 mb-1.5 uppercase tracking-wider">Differences</h4>
                      <pre className="text-[11px] font-mono text-rose-700 dark:text-rose-400 whitespace-pre-wrap leading-relaxed">
                        {typeof executionResult.differences === 'object' 
                          ? JSON.stringify(executionResult.differences, null, 2) 
                          : executionResult.differences}
                      </pre>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Actual Output */}
                    <div className="space-y-2">
                      <div className="text-[10px] font-bold uppercase text-neutral-500 dark:text-neutral-400">Actual Output</div>
                      <div className="relative rounded-lg bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 overflow-hidden">
                        <div className="p-3 max-h-[300px] overflow-auto">
                          <pre className="text-[11px] font-mono text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap leading-relaxed">
                            {JSON.stringify(executionResult.actualOutput || executionResult.output || executionResult, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </div>

                    {/* Expected Output */}
                    <div className="space-y-2">
                      <div className="text-[10px] font-bold uppercase text-neutral-500 dark:text-neutral-400">Expected Output</div>
                      <div className="relative rounded-lg bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 overflow-hidden">
                        <div className="p-3 max-h-[300px] overflow-auto">
                          <pre className="text-[11px] font-mono text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap leading-relaxed">
                            {JSON.stringify(executionResult.expectedOutput || expectedJsonContent, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
