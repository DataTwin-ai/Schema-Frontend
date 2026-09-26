'use client';

import React, { useState, useEffect } from 'react';
import { useWorkflow } from '../../context/WorkflowContext';
import { API_URL } from '../../services/api/config';
import { StageActionBar } from '../layout/StageActionBar';
import { Layers, FileCode, CheckCircle2, AlertCircle, ArrowRight, Save, Play } from 'lucide-react';
import { SchemaClass } from '../../types';

export const SchemaStudioStage: React.FC = () => {
  const { workflow, setStage, editedSchemaJson, setEditedSchemaJson, saveSchemaChanges } = useWorkflow();

  const [generatedFiles, setGeneratedFiles] = useState<any[]>([]);
  const [selectedFileContent, setSelectedFileContent] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (workflow.runId) {
      setIsLoadingFiles(true);
      fetch(`${API_URL}/runs/${workflow.runId}/scdp-output`)
        .then(res => res.ok ? res.json() : { files: [] })
        .then(data => setGeneratedFiles(data.files || []))
        .catch(err => console.error("Failed to fetch SCDP output files", err))
        .finally(() => setIsLoadingFiles(false));
    }
  }, [workflow.runId]);

  useEffect(() => {
    if (!editedSchemaJson && workflow.schema) {
      setEditedSchemaJson(workflow.schema.rawJson);
    }
  }, [workflow.schema, editedSchemaJson, setEditedSchemaJson]);

  const handleFileClick = async (fileName: string) => {
    setSelectedFileName(fileName);
    setSelectedFileContent('Loading...');
    try {
      const res = await fetch(`${API_URL}/runs/${workflow.runId}/case-files/${fileName}`);
      if (!res.ok) throw new Error('Failed to load file');
      const text = await res.text();
      setSelectedFileContent(text);
    } catch (err: any) {
      setSelectedFileContent(err.message);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // First save locally to workflow model (this also validates JSON format)
      const result = saveSchemaChanges();
      if (!result.success) {
        throw new Error(result.error || 'Syntax error in JSON');
      }

      // Then save to backend using PUT /runs/{runId}/schema
      const parsedJson = JSON.parse(editedSchemaJson);
      const res = await fetch(`${API_URL}/runs/${workflow.runId}/schema`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsedJson)
      });
      if (!res.ok) throw new Error('Failed to save schema to server');

      setSaveStatus({ type: 'success', message: 'Schema changes saved successfully!' });
      setTimeout(() => setSaveStatus({ type: null, message: '' }), 3000);
      return true;
    } catch (err: any) {
      setSaveStatus({ type: 'error', message: err.message });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleProceedToFinal = async () => {
    if (editedSchemaJson !== workflow.schema?.rawJson) {
      const saved = await handleSave();
      if (!saved) return;
    }
    setStage('output');
  };

  const groupedFiles = generatedFiles.reduce((acc, file) => {
    const type = file.type || (file.name ? (file.name.endsWith('.json') ? 'JSON' : 'Text') : 'Other');
    if (!acc[type]) acc[type] = [];
    acc[type].push(file);
    return acc;
  }, {} as Record<string, any[]>);

  const classes = workflow.classes || [];

  return (
    <div className="flex flex-col min-h-full bg-white dark:bg-neutral-900">
      <StageActionBar
        title="Schema Output"
        description="Review generated SCDP output files, classes, and edit the final Schema JSON."
        rightActions={
          <button
            onClick={handleProceedToFinal}
            className="flex items-center space-x-1.5 px-4 py-1.5 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900 rounded-lg text-xs font-bold transition-colors"
          >
            <span>Proceed to Final Output</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        }
      />

      <div className="flex-1 p-6 space-y-8 overflow-y-auto">
        {/* Generated Files Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Generated Output Files</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="col-span-1 border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden bg-neutral-50 dark:bg-neutral-950">
              {isLoadingFiles ? (
                <div className="p-4 text-xs text-neutral-500">Loading files...</div>
              ) : Object.keys(groupedFiles).length === 0 ? (
                <div className="p-4 text-xs text-neutral-500">No generated files found.</div>
              ) : (
                <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
                  {Object.entries(groupedFiles).map(([type, files]) => (
                    <div key={type}>
                      <div className="px-3 py-2 bg-neutral-100 dark:bg-neutral-900 text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                        {type}
                      </div>
                      <ul className="divide-y divide-neutral-100 dark:divide-neutral-800/50">
                        {files.map((f, i) => (
                          <li
                            key={i}
                            onClick={() => handleFileClick(f.name || f)}
                            className={`px-3 py-2 text-xs cursor-pointer hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50 transition-colors flex items-center space-x-2 ${selectedFileName === (f.name || f) ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-neutral-700 dark:text-neutral-300'}`}
                          >
                            <FileCode className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{f.name || f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="col-span-2 border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden flex flex-col h-[400px]">
              <div className="px-4 py-2 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 flex justify-between items-center">
                <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 truncate">
                  {selectedFileName || 'Select a file to view'}
                </span>
              </div>
              <div className="flex-1 p-4 bg-white dark:bg-neutral-900 overflow-y-auto">
                {selectedFileContent ? (
                  <pre className="text-[10px] font-mono text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap">
                    {selectedFileContent}
                  </pre>
                ) : (
                  <div className="flex h-full items-center justify-center text-neutral-400 text-xs">
                    File viewer
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Classes Section */}
        {classes.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Domain Classes</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {classes.map((cls) => (
                <div key={cls.id} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-sm">
                  <div className="px-5 py-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center space-x-2">
                          <Layers className="h-4 w-4 text-neutral-400" />
                          <span>Class #{cls.classNumber} · {cls.className}</span>
                        </h4>
                        <p className="text-xs text-neutral-500 mt-1">{cls.purpose}</p>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="block font-semibold text-neutral-700 dark:text-neutral-300">Datasource</span>
                        <span className="text-neutral-600 dark:text-neutral-400">{cls.datasource}</span>
                      </div>
                      <div>
                        <span className="block font-semibold text-neutral-700 dark:text-neutral-300">Grain</span>
                        <span className="text-neutral-600 dark:text-neutral-400">{cls.grain}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* JSON Editor Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Live Schema JSON</h3>
            <div className="flex items-center space-x-2">
              {saveStatus.message && (
                <div className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                  saveStatus.type === 'success' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'
                }`}>
                  {saveStatus.type === 'success' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                  <span>{saveStatus.message}</span>
                </div>
              )}
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
              >
                <Save className="h-3.5 w-3.5" />
                <span>{isSaving ? 'Saving...' : 'Save Schema'}</span>
              </button>
            </div>
          </div>
          
          <div className="h-[600px] border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden bg-neutral-900 text-neutral-100 flex flex-col shadow-inner">
            <div className="bg-neutral-950 px-4 py-2 border-b border-neutral-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileCode className="h-4 w-4 text-blue-400" />
                <span className="text-xs font-mono font-medium text-neutral-300">schema.json</span>
              </div>
            </div>
            <textarea
              value={editedSchemaJson}
              onChange={(e) => setEditedSchemaJson(e.target.value)}
              className="flex-1 w-full p-4 bg-transparent text-[13px] font-mono leading-relaxed resize-none focus:outline-none"
              spellCheck="false"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
