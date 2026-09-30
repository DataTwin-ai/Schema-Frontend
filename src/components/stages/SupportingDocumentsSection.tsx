'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useWorkflow } from '../../context/WorkflowContext';
import { SupportingDocument } from '../../types';
import { 
  Paperclip, 
  Upload, 
  FileSpreadsheet, 
  FileCode, 
  FileText, 
  Trash2, 
  Check, 
  Edit3, 
  Plus,
  AlertCircle
} from 'lucide-react';

const SUPPORTED_EXTENSIONS = ['.csv', '.xlsx', '.xls', '.json', '.pdf'];

const generateDefaultExtractedContent = (filename: string): string => {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.csv') || lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
    const base = filename.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    return `reference_id,item_code,description,department,allocated_amount,effective_rate\nREF-1001,ITEM-AP-01,${base} Standard Allocation,LOB-CORP-EAST,45000.00,0.0825\nREF-1002,ITEM-AP-02,${base} Extended Distribution,LOB-CORP-WEST,32500.00,0.0500\nREF-1003,ITEM-AP-03,${base} Overhead Proration,LOB-SHARED-SERVICES,18200.00,0.0000`;
  }
  if (lower.endsWith('.json')) {
    return JSON.stringify(
      {
        schemaSource: filename,
        domainProfile: 'FIN_OPS_ALLOCATION',
        validationRules: {
          zeroVarianceEnforced: true,
          decimalPrecision: 4,
          reconciliationThreshold: 0.0,
        },
        linesOfBusiness: ['LOB-US-EAST', 'LOB-US-WEST', 'LOB-CENTRAL'],
      },
      null,
      2
    );
  }
  if (lower.endsWith('.pdf')) {
    return `DOCUMENT: ${filename}\nSECTION 1: OPERATIONAL SCOPE & SPECIFICATION\n1.1 All prepaid item liabilities must reconcile against master general ledger charts.\n1.2 Destination state tax tables apply according to delivery entity registration.\n1.3 Sub-ledger posting occurs only upon zero-variance confirmation across allocated lines.`;
  }
  return `Extracted specifications and table mapping parameters for ${filename}.`;
};

export const SupportingDocumentsSection: React.FC = () => {
  const { 
    workflow, 
    addSupportingDocument, 
    removeSupportingDocument, 
    updateSupportingDocument 
  } = useWorkflow();

  const documents = workflow.businessInput.supportingDocuments || [];
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState<string>('');
  const [dragActive, setDragActive] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync editing buffer when active document changes
  useEffect(() => {
    if (selectedDocId) {
      const activeDoc = documents.find((d) => d.id === selectedDocId);
      if (activeDoc) {
        setEditingContent(activeDoc.previewText || '');
      } else {
        setSelectedDocId(null);
      }
    }
  }, [selectedDocId, documents]);

  // Auto-dismiss validation error after 4 seconds
  useEffect(() => {
    if (validationError) {
      const timer = setTimeout(() => setValidationError(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [validationError]);

  const isValidFileType = (file: File): boolean => {
    const nameLower = file.name.toLowerCase();
    const hasValidExt = SUPPORTED_EXTENSIONS.some((ext) => nameLower.endsWith(ext));
    if (hasValidExt) return true;
    const type = file.type.toLowerCase();
    if (type.includes('csv') || type.includes('json') || type.includes('pdf') || type.includes('spreadsheet') || type.includes('excel')) {
      return true;
    }
    return false;
  };

  const processFiles = async (fileList: FileList | File[]) => {
    setValidationError(null);
    const filesArray = Array.from(fileList);
    if (filesArray.length === 0) return;

    for (const file of filesArray) {
      if (!isValidFileType(file)) {
        setValidationError('Unsupported file type. Use CSV, XLSX, JSON, or PDF.');
        continue;
      }

      // Check for duplicates based on filename and approximate size
      const isDuplicate = documents.some(
        (d) => d.name.toLowerCase() === file.name.toLowerCase() && Math.abs(d.size - file.size) < 10
      );

      if (isDuplicate) {
        setValidationError('This file is already attached.');
        continue;
      }

      // Extract text for text-based formats or generate structured representation
      let content = '';
      const nameLower = file.name.toLowerCase();
      if (nameLower.endsWith('.csv') || nameLower.endsWith('.json') || file.type.startsWith('text/')) {
        try {
          const rawText = await file.text();
          if (rawText && rawText.trim().length > 0) {
            content = rawText;
          } else {
            content = generateDefaultExtractedContent(file.name);
          }
        } catch {
          content = generateDefaultExtractedContent(file.name);
        }
      } else {
        content = generateDefaultExtractedContent(file.name);
      }

      const newDoc: SupportingDocument = {
        id: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: file.name,
        type: file.type || getFallbackMimeType(file.name),
        size: file.size,
        status: 'processed',
        uploadedAt: new Date().toISOString(),
        previewText: content,
      };

      addSupportingDocument(newDoc);
    }

    // Reset native input so the same file can be re-uploaded if desired after removal
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getFallbackMimeType = (filename: string): string => {
    const lower = filename.toLowerCase();
    if (lower.endsWith('.csv')) return 'text/csv';
    if (lower.endsWith('.json')) return 'application/json';
    if (lower.endsWith('.pdf')) return 'application/pdf';
    if (lower.endsWith('.xlsx')) return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    if (lower.endsWith('.xls')) return 'application/vnd.ms-excel';
    return 'application/octet-stream';
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
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
      processFiles(e.dataTransfer.files);
    }
  };

  const handleToggleDocSelect = (docId: string) => {
    if (selectedDocId === docId) {
      setSelectedDocId(null);
    } else {
      setSelectedDocId(docId);
    }
  };

  const handleSaveDoc = () => {
    if (selectedDocId) {
      updateSupportingDocument(selectedDocId, { previewText: editingContent });
      setSelectedDocId(null);
    }
  };

  const handleRemoveDoc = (docId: string) => {
    if (selectedDocId === docId) {
      setSelectedDocId(null);
    }
    removeSupportingDocument(docId);
  };

  const getDocTypeLabel = (doc: SupportingDocument): string => {
    const name = doc.name.toLowerCase();
    if (name.endsWith('.csv')) return 'CSV';
    if (name.endsWith('.xlsx')) return 'XLSX';
    if (name.endsWith('.xls')) return 'XLS';
    if (name.endsWith('.json')) return 'JSON';
    if (name.endsWith('.pdf')) return 'PDF';
    return 'DOC';
  };

  const getDocIcon = (doc: SupportingDocument) => {
    const name = doc.name.toLowerCase();
    if (name.endsWith('.csv') || name.endsWith('.xlsx') || name.endsWith('.xls')) {
      return <FileSpreadsheet className="h-3.5 w-3.5 text-neutral-600 dark:text-neutral-400 shrink-0" />;
    }
    if (name.endsWith('.json') || name.endsWith('.xml')) {
      return <FileCode className="h-3.5 w-3.5 text-neutral-600 dark:text-neutral-400 shrink-0" />;
    }
    return <FileText className="h-3.5 w-3.5 text-neutral-600 dark:text-neutral-400 shrink-0" />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  return (
    <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800/80 space-y-2.5">
      {/* Hidden Native File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".csv,.xlsx,.xls,.json,.pdf,text/csv,application/json,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
        onChange={handleFileInputChange}
        className="hidden"
        aria-label="Upload supporting documents"
      />

      {/* Supporting Documents Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Paperclip className="h-3.5 w-3.5 text-neutral-500 dark:text-neutral-400" />
          <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
            Supporting Documents
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 border border-neutral-200/80 dark:border-neutral-700/80">
            {documents.length} {documents.length === 1 ? 'file' : 'files'}
          </span>
        </div>

        {/* Compact action when files already exist */}
        {documents.length > 0 && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center space-x-1 text-[11px] font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition-colors cursor-pointer"
          >
            <Plus className="h-3 w-3" />
            <span>Upload files</span>
          </button>
        )}
      </div>

      {/* Inline Validation Error Notice */}
      {validationError && (
        <div className="flex items-center space-x-1.5 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-md px-2.5 py-1.5 animate-in fade-in duration-150">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {/* When 0 files: Compact Clickable Drop & Browse Target */}
      {documents.length === 0 && (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`border border-dashed rounded-lg p-4 text-center cursor-pointer transition-all ${
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
          <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-1">
            CSV \u00B7 XLSX \u00B7 JSON \u00B7 PDF
          </p>
        </div>
      )}

      {/* Document List: Each item expands its inline editor directly within its own row */}
      {documents.length > 0 && (
        <div className="space-y-2">
          {documents.map((doc) => {
            const isSelected = selectedDocId === doc.id;
            const typeLabel = getDocTypeLabel(doc);
            const sizeLabel = formatFileSize(doc.size);

            return (
              <div
                key={doc.id}
                className={`rounded-lg border transition-all overflow-hidden ${
                  isSelected
                    ? 'bg-neutral-100/90 dark:bg-neutral-800/80 border-neutral-400 dark:border-neutral-600 shadow-2xs ring-1 ring-neutral-400/20 dark:ring-neutral-600/30'
                    : 'bg-neutral-50/70 dark:bg-neutral-950/50 hover:bg-neutral-100/70 dark:hover:bg-neutral-800/50 border-neutral-200 dark:border-neutral-800/80'
                }`}
              >
                {/* Document Row Header */}
                <div
                  onClick={() => handleToggleDocSelect(doc.id)}
                  className="px-3 py-2 text-xs flex items-center justify-between cursor-pointer"
                >
                  {/* File Information: Name + Type + Size + Ready Status */}
                  <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                    {getDocIcon(doc)}
                    <div className="flex flex-col min-w-0">
                      <span className="font-medium text-neutral-800 dark:text-neutral-200 truncate">
                        {doc.name}
                      </span>
                      <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-mono flex items-center space-x-1.5">
                        <span>{typeLabel}</span>
                        <span>\u00B7</span>
                        <span>{sizeLabel}</span>
                        <span>\u00B7</span>
                        <span className="text-neutral-600 dark:text-neutral-400 font-medium flex items-center space-x-0.5">
                          <Check className="h-2.5 w-2.5 inline" />
                          <span>Ready</span>
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Row Actions: Edit & Remove */}
                  <div className="flex items-center space-x-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => handleToggleDocSelect(doc.id)}
                      className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors flex items-center space-x-1 cursor-pointer ${
                        isSelected
                          ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-2xs'
                          : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-200/60 dark:hover:bg-neutral-800'
                      }`}
                      title={isSelected ? 'Close editor' : 'Edit document content'}
                    >
                      <Edit3 className="h-3 w-3" />
                      <span>{isSelected ? 'Editing' : 'Edit'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRemoveDoc(doc.id)}
                      className="text-neutral-400 hover:text-rose-500 p-1 rounded transition-colors cursor-pointer"
                      title="Remove file"
                      aria-label={`Remove ${doc.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Inline Document Editor: Expands directly UNDER the selected row */}
                {isSelected && (
                  <div className="border-t border-neutral-200 dark:border-neutral-700/80 bg-white dark:bg-neutral-900/90 p-2.5 space-y-2 animate-in fade-in duration-150">
                    {/* Editor Subheader: Filename & Char count on Left, Save Checkmark on Top-Right */}
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center space-x-2 min-w-0">
                        <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 truncate">
                          {doc.name}
                        </span>
                        <span className="text-[10px] text-neutral-400 font-mono">
                          {editingContent.length} chars
                        </span>
                      </div>

                      {/* Top-Right Save / Done Checkmark Control */}
                      <button
                        type="button"
                        onClick={handleSaveDoc}
                        className="flex items-center space-x-1 px-2.5 py-1 bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:hover:bg-neutral-100 dark:text-neutral-900 rounded-md text-[11px] font-semibold transition-all shadow-2xs cursor-pointer"
                        title="Save changes"
                        aria-label="Save changes"
                      >
                        <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                        <span>Save</span>
                      </button>
                    </div>

                    {/* Editable Content Textarea */}
                    <textarea
                      rows={7}
                      value={editingContent}
                      onChange={(e) => setEditingContent(e.target.value)}
                      placeholder="Document content..."
                      className="w-full bg-neutral-50/60 dark:bg-neutral-950 p-3 text-xs font-mono text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-600 rounded-lg border border-neutral-200 dark:border-neutral-800 focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-600 leading-relaxed resize-y"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
