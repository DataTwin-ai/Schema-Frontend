'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  X, 
  Upload, 
  Paperclip, 
  FileSpreadsheet, 
  FileCode, 
  FileText, 
  AlertCircle,
  Plus,
  ArrowRight,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { AttachedInfoFile } from '../../types';

interface GenerateWithInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (additionalInfo?: {
    category: 'business' | 'finance' | 'technical' | 'rule' | 'constraint' | 'note';
    content: string;
    files?: AttachedInfoFile[];
    author?: string;
  }) => void;
  title?: string;
  generationLabel?: string;
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
};

const getFileIcon = (fileName: string) => {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.csv') || lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
    return <FileSpreadsheet className="h-3.5 w-3.5 text-neutral-600 dark:text-neutral-400 shrink-0" />;
  }
  if (lower.endsWith('.json') || lower.endsWith('.xml') || lower.endsWith('.ts') || lower.endsWith('.js')) {
    return <FileCode className="h-3.5 w-3.5 text-neutral-600 dark:text-neutral-400 shrink-0" />;
  }
  return <FileText className="h-3.5 w-3.5 text-neutral-600 dark:text-neutral-400 shrink-0" />;
};

export const GenerateWithInfoModal: React.FC<GenerateWithInfoModalProps> = ({
  isOpen,
  onClose,
  onGenerate,
  title = 'Do you want to add any additional information?',
  generationLabel = 'Generate'
}) => {
  const [isInfoExpanded, setIsInfoExpanded] = useState(false);
  const [category, setCategory] = useState<'business' | 'finance' | 'technical' | 'rule' | 'constraint' | 'note'>('rule');
  const [content, setContent] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<AttachedInfoFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setIsInfoExpanded(false);
      setContent('');
      setCategory('rule');
      setUploadedFiles([]);
      setValidationError(null);
      setDragActive(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (validationError) {
      const timer = setTimeout(() => setValidationError(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [validationError]);

  if (!isOpen) return null;

  const handleFiles = (files: FileList | File[]) => {
    setValidationError(null);
    const filesArray = Array.from(files);
    if (filesArray.length === 0) return;

    const newFiles: AttachedInfoFile[] = [];

    for (const file of filesArray) {
      const isDuplicate = uploadedFiles.some(
        (existing) => existing.name.toLowerCase() === file.name.toLowerCase()
      );

      if (isDuplicate) {
        setValidationError(`"${file.name}" is already selected.`);
        continue;
      }

      newFiles.push({
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
      });
    }

    if (newFiles.length > 0) {
      setUploadedFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleRemoveFile = (indexToRemove: number) => {
    setUploadedFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleProceed = () => {
    const hasContent = content.trim().length > 0;
    const hasFiles = uploadedFiles.length > 0;

    if (isInfoExpanded && (hasContent || hasFiles)) {
      onGenerate({
        category,
        content: content.trim(),
        files: uploadedFiles.length > 0 ? uploadedFiles : undefined,
        author: 'Logaprasanth (User)',
      });
    } else {
      onGenerate();
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/60 backdrop-blur-sm p-4">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".csv,.xlsx,.xls,.json,.pdf,.txt,.docx,.doc,.md,text/*,application/json,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
        onChange={handleFileInputChange}
        className="hidden"
        aria-label="Upload files for additional information"
      />

      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl w-full max-w-lg p-5 shadow-2xl text-neutral-900 dark:text-neutral-100 space-y-4 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-neutral-800">
          <h3 className="text-xs font-bold flex items-center space-x-2 text-neutral-900 dark:text-white">
            <Sparkles className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
            <span>{title}</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer p-1 rounded-md transition-colors"
            title="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Informative Subtext */}
        <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
          You can provide optional specifications, business rules, or supporting files to guide generation, or proceed directly.
        </p>

        {/* Collapsible / Expandable Additional Info Section */}
        {!isInfoExpanded ? (
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setIsInfoExpanded(true)}
              className="w-full p-3.5 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-500 bg-neutral-50/50 hover:bg-neutral-50 dark:bg-neutral-950/40 dark:hover:bg-neutral-950 text-left flex items-center justify-between group transition-all cursor-pointer"
            >
              <div className="flex items-center space-x-2.5">
                <div className="p-1.5 rounded-lg bg-neutral-200/70 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 group-hover:bg-neutral-300 dark:group-hover:bg-neutral-700 transition-colors">
                  <Plus className="h-3.5 w-3.5" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-neutral-900 dark:text-white block">
                    Add Additional Info
                  </span>
                  <span className="text-[11px] text-neutral-500 dark:text-neutral-400 block mt-0.5">
                    Enter custom constraints, rules, or attach reference files
                  </span>
                </div>
              </div>
              <ChevronDown className="h-4 w-4 text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-200 transition-colors shrink-0" />
            </button>
          </div>
        ) : (
          <div className="space-y-3.5 pt-1 border-t border-neutral-100 dark:border-neutral-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                Additional Information
              </span>
              <button
                type="button"
                onClick={() => {
                  setContent('');
                  setUploadedFiles([]);
                  setIsInfoExpanded(false);
                }}
                className="text-[11px] text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-white cursor-pointer"
              >
                Hide / Clear
              </button>
            </div>

            {/* Category */}
            <div>
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e: any) => setCategory(e.target.value)}
                className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-xs text-neutral-800 dark:text-neutral-200 focus:outline-none focus:border-neutral-500 transition-colors"
              >
                <option value="rule">Business Rule</option>
                <option value="constraint">SCDP Constraint</option>
                <option value="business">Business Clarification</option>
                <option value="finance">Finance Rule</option>
                <option value="technical">Technical Architecture</option>
                <option value="note">General Note</option>
              </select>
            </div>

            {/* Content Textarea */}
            <div>
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                Content / Specification
              </label>
              <textarea
                rows={3}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="E.g. Cost allocation percentages must strictly sum to 100% per costallocationmethod..."
                className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-lg p-2.5 text-xs text-neutral-900 dark:text-neutral-200 placeholder-neutral-400 focus:outline-none focus:border-neutral-500 transition-colors"
              />
            </div>

            {/* File Upload Area */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center space-x-1.5">
                  <Paperclip className="h-3.5 w-3.5 text-neutral-500 dark:text-neutral-400" />
                  <span>Supporting Attachments</span>
                </label>
                {uploadedFiles.length > 0 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center space-x-1 text-[11px] font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Add more</span>
                  </button>
                )}
              </div>

              {/* Validation Notice */}
              {validationError && (
                <div className="flex items-center space-x-1.5 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-md px-2.5 py-1.5 animate-in fade-in duration-150">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{validationError}</span>
                </div>
              )}

              {/* Drop Target */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`border border-dashed rounded-lg p-3 text-center cursor-pointer transition-all ${
                  dragActive
                    ? 'border-neutral-600 bg-neutral-100/90 dark:bg-neutral-800/90'
                    : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600 bg-neutral-50/40 dark:bg-neutral-950/30'
                }`}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
              >
                <div className="flex items-center justify-center space-x-2 text-xs text-neutral-700 dark:text-neutral-300 font-medium">
                  <Upload className="h-3.5 w-3.5 text-neutral-500 dark:text-neutral-400" />
                  <span>Upload or drop files</span>
                </div>
                <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-0.5">
                  CSV \u00B7 XLSX \u00B7 JSON \u00B7 PDF \u00B7 TXT \u00B7 DOCX
                </p>
              </div>

              {/* Uploaded File Chips */}
              {uploadedFiles.length > 0 && (
                <div className="space-y-1.5 max-h-32 overflow-y-auto pr-0.5 pt-1">
                  {uploadedFiles.map((file, idx) => (
                    <div
                      key={`${file.name}-${idx}`}
                      className="flex items-center justify-between p-2 rounded-lg bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-800 dark:text-neutral-200"
                    >
                      <div className="flex items-center space-x-2 min-w-0 pr-2">
                        {getFileIcon(file.name)}
                        <span className="font-mono truncate text-[11px]" title={file.name}>
                          {file.name}
                        </span>
                        {file.size !== undefined && (
                          <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-mono shrink-0">
                            ({formatFileSize(file.size)})
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(idx)}
                        className="text-neutral-400 hover:text-rose-500 dark:hover:text-rose-400 p-0.5 rounded cursor-pointer transition-colors shrink-0"
                        title={`Remove ${file.name}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal Footer Actions */}
        <div className="flex justify-end items-center space-x-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white cursor-pointer transition-colors"
          >
            Cancel
          </button>
          
          <button
            type="button"
            onClick={handleProceed}
            className="flex items-center space-x-1.5 px-4 py-1.5 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900 font-bold rounded-lg text-xs cursor-pointer transition-all shadow-xs"
          >
            <span>{generationLabel}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
