'use client';

import React, { useRef, useState } from 'react';
import { useWorkflow } from '../../context/WorkflowContext';
import { Paperclip, Upload, X, FileText, CheckCircle2, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

interface AdditionalRequirementUploadProps {
  sourceScreen: string; // e.g. 'business-input' | 'requirements' | 'classes' | 'schema' | 'output'
  className?: string;
  buttonVariant?: 'default' | 'compact' | 'outline';
}

export const AdditionalRequirementUpload: React.FC<AdditionalRequirementUploadProps> = ({
  sourceScreen,
  className = '',
  buttonVariant = 'default',
}) => {
  const { additionalRequirements, addAdditionalRequirement, removeAdditionalRequirement } = useWorkflow();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const reqCount = additionalRequirements.length;

  const handleFileClick = () => {
    setErrorMsg(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (e.g. 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('File size exceeds 5MB limit.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content !== undefined) {
        addAdditionalRequirement({
          fileName: file.name,
          content: content,
          sourceScreen,
        });
        setIsOpen(true);
      }
    };
    reader.onerror = () => {
      setErrorMsg('Failed to read file contents.');
    };
    reader.readAsText(file);
  };

  return (
    <div className={`relative inline-block ${className}`}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept=".txt,.md,.json,.csv,.yaml,.yml,.doc,.docx"
      />

      <div className="flex items-center space-x-1.5">
        <button
          type="button"
          onClick={handleFileClick}
          className={`flex items-center space-x-1.5 text-xs font-medium transition-all rounded-md px-2.5 py-1.5 ${
            reqCount > 0
              ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/60'
              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-700'
          }`}
          title="Upload an optional additional requirement file for later generation"
        >
          <Paperclip className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          <span>+ Additional Requirement</span>
          {reqCount > 0 && (
            <span className="ml-1 px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-amber-500 text-white">
              {reqCount}
            </span>
          )}
        </button>

        {reqCount > 0 && (
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="p-1.5 text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            title="View uploaded additional requirements"
          >
            {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>

      {errorMsg && (
        <div className="absolute right-0 mt-1 z-30 text-[11px] text-red-600 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded px-2 py-1 shadow-sm">
          {errorMsg}
        </div>
      )}

      {/* Popover showing uploaded additional requirements */}
      {isOpen && reqCount > 0 && (
        <div className="absolute right-0 mt-1.5 z-30 w-72 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-lg p-3 text-xs">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-100 dark:border-neutral-800">
            <span className="font-semibold text-neutral-900 dark:text-white flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-amber-500" />
              Additional Requirements ({reqCount})
            </span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {additionalRequirements.map((req) => (
              <div
                key={req.id}
                className="flex items-start justify-between p-2 rounded bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-700/50 group"
              >
                <div className="min-w-0 pr-2">
                  <div className="font-medium text-neutral-800 dark:text-neutral-200 truncate" title={req.fileName}>
                    {req.fileName}
                  </div>
                  <div className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5 flex items-center gap-1">
                    <span className="px-1.5 py-0.2 rounded bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-mono">
                      {req.sourceScreen}
                    </span>
                    <span>• {req.content.length} chars</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeAdditionalRequirement(req.id)}
                  className="text-neutral-400 hover:text-red-500 dark:hover:text-red-400 p-0.5 transition-colors"
                  title="Remove file"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          <div className="mt-2.5 pt-2 border-t border-neutral-100 dark:border-neutral-800 text-[10px] text-neutral-500 dark:text-neutral-400 italic">
            Preserved across workflow screens. Optional for backend generation.
          </div>
        </div>
      )}
    </div>
  );
};
