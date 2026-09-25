
'use client';

import React, { useEffect, useState } from 'react';
import { FileText, Loader2, AlertCircle, X } from 'lucide-react';
import { API_URL } from '../../services/api/config';

interface InputFile {
  name: string;
  content: string;
}

interface SCDPInputsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SCDPInputsModal: React.FC<SCDPInputsModalProps> = ({ isOpen, onClose }) => {
  const [files, setFiles] = useState<InputFile[]>([]);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchInputs = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_URL}/simulation/simulation-inputs`);
        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.statusText}`);
        }
        const data = await response.json();
        
        let parsedFiles: InputFile[] = [];
        
        if (Array.isArray(data)) {
          parsedFiles = data.map((item: any) => ({
            name: item.name || item.filename || 'Unknown File',
            content: item.content || item.text || ''
          }));
        } else if (data && typeof data === 'object') {
          if (data.files && Array.isArray(data.files)) {
            parsedFiles = data.files.map((item: any) => ({
              name: item.name || item.filename || 'Unknown File',
              content: item.content || item.text || ''
            }));
          } else {
            parsedFiles = Object.entries(data).map(([key, value]) => ({
              name: key,
              content: typeof value === 'string' ? value : JSON.stringify(value, null, 2)
            }));
          }
        }

        if (isMounted) {
          setFiles(parsedFiles);
          if (parsedFiles.length > 0) {
            const defaultFile = parsedFiles.find((f) => f.name === '00_Current_Requirements.txt') || parsedFiles[0];
            setSelectedFileName(defaultFile.name);
          }
          setIsLoading(false);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Failed to load SCDP input files.');
          setIsLoading(false);
        }
      }
    };

    if (files.length === 0) {
      fetchInputs();
    } else {
      setIsLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [isOpen, files.length]);

  if (!isOpen) return null;

  const selectedFile = files.find((f) => f.name === selectedFileName);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 sm:p-6 lg:p-8">
      <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-800 w-full max-w-6xl h-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in duration-200 zoom-in-95">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/50 shrink-0">
          <div>
            <h3 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100 flex items-center space-x-2">
              <FileText className="h-4 w-4 text-neutral-500" />
              <span>SCDP Input Files</span>
            </h3>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
              Read-only view of files supplied to the SCDP generator backend
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden bg-neutral-100 dark:bg-neutral-950">
          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-neutral-500">
              <Loader2 className="h-6 w-6 animate-spin mb-3" />
              <p className="text-xs font-medium">Loading SCDP input files...</p>
            </div>
          ) : error ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-rose-500">
              <AlertCircle className="h-8 w-8 mb-3 opacity-80" />
              <h3 className="text-sm font-semibold mb-1">Error Loading Files</h3>
              <p className="text-xs opacity-80 max-w-sm">{error}</p>
            </div>
          ) : files.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-neutral-500 text-xs">
              No input files found from the backend.
            </div>
          ) : (
            <div className="flex-1 flex w-full h-full">
              {/* Sidebar: File List */}
              <div className="w-[280px] bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 flex flex-col shrink-0">
                <div className="px-4 py-3 border-b border-neutral-100 dark:border-neutral-800">
                  <h4 className="text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                    Files ({files.length})
                  </h4>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {files.map((file) => (
                    <button
                      key={file.name}
                      onClick={() => setSelectedFileName(file.name)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-mono transition-colors flex items-center justify-between group ${
                        selectedFileName === file.name
                          ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white font-semibold'
                          : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 hover:text-neutral-900 dark:hover:text-neutral-200'
                      }`}
                    >
                      <span className="truncate mr-2">{file.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Main Area: File Content */}
              <div className="flex-1 flex flex-col bg-white dark:bg-[#0e0e0e] overflow-hidden">
                {selectedFile ? (
                  <>
                    <div className="px-5 py-3 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between shrink-0 bg-white dark:bg-neutral-900">
                      <span className="text-xs font-bold text-neutral-900 dark:text-white font-mono flex items-center space-x-2">
                        <FileText className="h-3.5 w-3.5 text-neutral-400" />
                        <span>{selectedFile.name}</span>
                      </span>
                      <div className="flex items-center space-x-3 text-[10px] font-mono text-neutral-500 dark:text-neutral-400">
                        <span>{selectedFile.content.split('\n').length.toLocaleString()} lines</span>
                        <span>{selectedFile.content.length.toLocaleString()} chars</span>
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-5 text-neutral-800 dark:text-neutral-300 font-mono text-xs leading-relaxed">
                      <pre className="whitespace-pre-wrap break-words">{selectedFile.content}</pre>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-neutral-400 text-xs">
                    Select a file to view its content
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
