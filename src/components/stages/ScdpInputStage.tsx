'use client';

import React, { useEffect, useState } from 'react';
import { useWorkflow } from '../../context/WorkflowContext';
import { API_URL } from '../../services/api/config';
import { AdditionalRequirementUpload } from '../common/AdditionalRequirementUpload';
import { FileText, Play } from 'lucide-react';
import { schemaService } from '../../services';

export const ScdpInputStage: React.FC = () => {
  const { workflow, setStage, updateWorkflowField } = useWorkflow();
  
  const [requirementsContent, setRequirementsContent] = useState<string>('');
  const [inputFiles, setInputFiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchScdpInput = async () => {
    if (!workflow.runId) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/runs/${workflow.runId}/scdp-input`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          additionalRequirements: workflow.additionalRequirements || []
        })
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch SCDP input: ${response.statusText}`);
      }
      const data = await response.json();
      setRequirementsContent(data.requirementsContent || '');
      setInputFiles(data.inputFiles || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchScdpInput();
  }, [workflow.runId]); // Re-fetch if runId changes

  const handleGenerateSchema = async () => {
    if (!workflow.runId) return;
    try {
      await schemaService.generateSchema(
        workflow.runId,
        (progress) => {}, // progress handled by global modal if needed
        (operationId) => {
          updateWorkflowField('generationStatus', 'generating');
        }
      );
      // Wait for completion handled by global polling or similar, but since generateSchema returns a promise
      // we can wait for it.
      const result = await schemaService.generateSchema(workflow.runId);
      // Actually schemaService.generateSchema returns the SchemaModel
      updateWorkflowField('schema', result);
      // Also might need to update classes if they are in the result
      setStage('schema');
      updateWorkflowField('generationStatus', 'completed');
    } catch (err: any) {
      if (err.name === 'StoppedError') {
        updateWorkflowField('generationStatus', 'idle');
        // Stay on this screen
      } else {
        updateWorkflowField('generationStatus', 'error');
        updateWorkflowField('lastError', err.message);
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-neutral-900 border-x border-neutral-200 dark:border-neutral-800">
      <div className="flex-none px-6 py-5 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 flex justify-between items-start">
        <div>
          <h2 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center space-x-2">
            <FileText className="h-4 w-4 text-neutral-400" />
            <span>SCDP Input</span>
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-xl">
            Review the generated requirements and input files before generating the schema.
          </p>
        </div>
        <button
          onClick={handleGenerateSchema}
          className="flex items-center space-x-1.5 px-4 py-1.5 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900 rounded-lg text-xs font-bold transition-colors shadow-sm"
        >
          <Play className="h-3.5 w-3.5" />
          <span>Generate Schema</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {error && (
          <div className="p-3 bg-red-50 text-red-600 rounded text-xs">{error}</div>
        )}
        
        {/* Viewer for 00_Current_Requirements.txt */}
        <div className="bg-neutral-50 dark:bg-neutral-950 rounded border border-neutral-200 dark:border-neutral-800 flex flex-col h-64">
          <div className="px-3 py-2 border-b border-neutral-200 dark:border-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
            SCDP input — HLR + BR + FR (replaced for this case)
          </div>
          <div className="flex-1 p-3 overflow-y-auto">
            {isLoading ? (
              <span className="text-neutral-400 text-xs">Loading...</span>
            ) : (
              <pre className="text-[10px] font-mono text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap">
                {requirementsContent || 'No content available'}
              </pre>
            )}
          </div>
        </div>

        {/* List of other input files */}
        <div>
          <h3 className="text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-2">Other Input Files</h3>
          {isLoading ? (
            <span className="text-neutral-400 text-xs">Loading...</span>
          ) : inputFiles.length > 0 ? (
            <ul className="space-y-1">
              {inputFiles.map((file, idx) => (
                <li key={idx} className="text-xs text-neutral-600 dark:text-neutral-400 flex items-center space-x-2">
                  <FileText className="h-3 w-3" />
                  <span>{file.name || file}</span>
                </li>
              ))}
            </ul>
          ) : (
            <span className="text-neutral-400 text-xs">No additional files found</span>
          )}
        </div>

        {/* Additional Requirement Upload */}
        <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800">
          <AdditionalRequirementUpload
            requirements={workflow.additionalRequirements || []}
            onChange={(reqs) => {
              updateWorkflowField('additionalRequirements', reqs);
              // We could re-fetch SCDP input here if backend expects it
            }}
            sourceScreen="scdp-input"
          />
        </div>
      </div>
    </div>
  );
};
