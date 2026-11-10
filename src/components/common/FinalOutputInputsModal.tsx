import React, { useState, useEffect } from 'react';
import { 
  X, 
  AlertCircle, 
  Database,
  ArrowRight
} from 'lucide-react';
import { API_URL } from '../../services/api/config';

interface FinalOutputInputsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRun: (inputs: any) => void;
  initialInputs?: any;
}

export const FinalOutputInputsModal: React.FC<FinalOutputInputsModalProps> = ({
  isOpen,
  onClose,
  onRun,
  initialInputs
}) => {
  const [schemaKey, setSchemaKey] = useState('');
  const [uploadSchema, setUploadSchema] = useState(true);
  
  const [keyCheckStatus, setKeyCheckStatus] = useState<'checking' | 'exists' | 'clear' | null>(null);
  const [keyExistsData, setKeyExistsData] = useState<{modified?: string, size?: string} | null>(null);
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);

  // Initialize from initialInputs if any
  useEffect(() => {
    if (isOpen) {
      if (initialInputs?.schemaKey) {
        setSchemaKey(initialInputs.schemaKey);
      } else {
        setSchemaKey('');
      }
      if (initialInputs?.uploadSchema !== undefined) {
        setUploadSchema(initialInputs.uploadSchema);
      } else {
        setUploadSchema(true);
      }
      setKeyCheckStatus(null);
      setKeyExistsData(null);
      setConfirmOverwrite(false);
    }
  }, [isOpen, initialInputs]);

  // Check Schema Key existence on blur
  const checkSchemaKey = async () => {
    const trimmed = schemaKey.trim();
    if (!trimmed || !uploadSchema) {
      setKeyCheckStatus(null);
      return;
    }
    
    // validate key format (.json or s3://)
    if (!trimmed.endsWith('.json') && !trimmed.startsWith('s3://')) {
      setKeyCheckStatus(null);
      return;
    }
    
    setKeyCheckStatus('checking');
    try {
      const res = await fetch(`${API_URL}/s3/schema-key-check?key=${encodeURIComponent(trimmed)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.exists) {
          setKeyCheckStatus('exists');
          setKeyExistsData({ modified: data.modified, size: data.size });
          setConfirmOverwrite(false);
        } else {
          setKeyCheckStatus('clear');
        }
      } else {
        setKeyCheckStatus(null);
      }
    } catch (e) {
      setKeyCheckStatus(null);
    }
  };

  useEffect(() => {
    if (uploadSchema && schemaKey.trim()) {
      checkSchemaKey();
    } else {
      setKeyCheckStatus(null);
    }
  }, [uploadSchema]);

  if (!isOpen) return null;

  const trimmedKey = schemaKey.trim();
  const isValidSchemaKey = trimmedKey.endsWith('.json') || trimmedKey.startsWith('s3://');
  
  const canRun = 
    trimmedKey.length > 0 && 
    isValidSchemaKey &&
    (keyCheckStatus === 'exists' && uploadSchema ? confirmOverwrite : true);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl w-full max-w-xl shadow-xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Database className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-neutral-900 dark:text-white">Final Output — Inputs</h2>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">Provide the S3 schema destination key to test the schema</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-300 rounded-full transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5 overflow-y-auto">
          <div className="space-y-3">
            <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
              Schema Destination Key
            </label>
            <div className="relative">
              <input
                type="text"
                value={schemaKey}
                onChange={(e) => setSchemaKey(e.target.value)}
                onBlur={checkSchemaKey}
                placeholder="e.g. Schema/budget.json or s3://dt-bucket/budget.json"
                className={`w-full bg-neutral-50 dark:bg-neutral-950 border ${!isValidSchemaKey && trimmedKey ? 'border-rose-300 focus:border-rose-500' : 'border-neutral-300 dark:border-neutral-700 focus:border-neutral-500'} rounded-lg px-3 py-2 text-xs font-mono text-neutral-900 dark:text-neutral-200 focus:outline-none transition-colors`}
              />
              {!isValidSchemaKey && trimmedKey && (
                <p className="text-[10px] text-rose-500 mt-1">Must end in .json or start with s3://</p>
              )}
            </div>

            <div className="flex items-start space-x-2 pt-1">
              <input
                type="checkbox"
                id="uploadSchema"
                checked={uploadSchema}
                onChange={(e) => setUploadSchema(e.target.checked)}
                className="mt-0.5 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="uploadSchema" className="text-xs text-neutral-700 dark:text-neutral-300 cursor-pointer select-none">
                Upload the Schema Studio schema to this key before execution
              </label>
            </div>

            {keyCheckStatus === 'exists' && uploadSchema && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-lg p-3 space-y-2 mt-2">
                <div className="flex items-start space-x-2 text-[11px] text-amber-800 dark:text-amber-300">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">A schema already exists at this key.</p>
                    <p className="opacity-90">
                      It will be overwritten. A backup of the previous version will be kept.
                      {keyExistsData?.modified && ` (Last modified: ${keyExistsData.modified})`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 pl-6">
                  <input
                    type="checkbox"
                    id="confirmOverwrite"
                    checked={confirmOverwrite}
                    onChange={(e) => setConfirmOverwrite(e.target.checked)}
                    className="rounded border-amber-400 text-amber-600 focus:ring-amber-500 bg-amber-50"
                  />
                  <label htmlFor="confirmOverwrite" className="text-[11px] font-bold text-amber-900 dark:text-amber-400 cursor-pointer select-none">
                    I understand, overwrite it
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end items-center space-x-2 p-4 border-t border-neutral-100 dark:border-neutral-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white cursor-pointer transition-colors"
          >
            Cancel
          </button>
          
          <button
            type="button"
            disabled={!canRun}
            onClick={() => {
              onRun({
                schemaKey: trimmedKey,
                uploadSchema,
                confirmOverwrite: keyCheckStatus === 'exists' ? confirmOverwrite : false,
                ...(initialInputs?.eventJson ? { eventJson: initialInputs.eventJson } : {}),
                ...(initialInputs?.expectedOutput ? { expectedOutput: initialInputs.expectedOutput } : {})
              });
            }}
            className={`flex items-center space-x-1.5 px-6 py-2 rounded-lg text-xs font-bold transition-all shadow-sm ${
              canRun 
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20 hover:shadow-blue-500/40 cursor-pointer'
                : 'bg-neutral-200 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500 cursor-not-allowed'
            }`}
          >
            <span>Run Final Output</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
