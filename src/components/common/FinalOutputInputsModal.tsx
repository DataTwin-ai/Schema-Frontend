import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Upload, 
  FileJson, 
  AlertCircle, 
  CheckCircle2, 
  Database,
  ArrowRight
} from 'lucide-react';
import { useWorkflow } from '../../context/WorkflowContext';
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
  const { workflow } = useWorkflow();

  const [eventInputType, setEventInputType] = useState<'upload' | 'paste'>('upload');
  const [eventFile, setEventFile] = useState<File | null>(null);
  const [eventText, setEventText] = useState('');
  const [eventJsonContent, setEventJsonContent] = useState<any>(null);
  const [eventError, setEventError] = useState<string | null>(null);
  
  // Computed from event JSON
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [processId, setProcessId] = useState<string | null>(null);
  const [dataSources, setDataSources] = useState<Record<string, number>>({});
  const [coverage, setCoverage] = useState<{name: string, present: boolean}[]>([]);

  const [expectedInputType, setExpectedInputType] = useState<'upload' | 'paste'>('upload');
  const [expectedFile, setExpectedFile] = useState<File | null>(null);
  const [expectedText, setExpectedText] = useState('');
  const [expectedJsonContent, setExpectedJsonContent] = useState<any>(null);
  const [expectedError, setExpectedError] = useState<string | null>(null);

  const [schemaKey, setSchemaKey] = useState('');
  const [uploadSchema, setUploadSchema] = useState(true);
  
  const [keyCheckStatus, setKeyCheckStatus] = useState<'checking' | 'exists' | 'clear' | null>(null);
  const [keyExistsData, setKeyExistsData] = useState<{modified?: string, size?: string} | null>(null);
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);

  // Initialize from initialInputs if any
  useEffect(() => {
    if (isOpen) {
      if (initialInputs) {
         if (initialInputs.eventJson) {
            setEventJsonContent(initialInputs.eventJson);
            setEventText(JSON.stringify(initialInputs.eventJson, null, 2));
            setEventInputType(initialInputs.eventFileName ? 'upload' : 'paste');
            if (initialInputs.eventFileName) {
               setEventFile(new File([], initialInputs.eventFileName)); // Dummy file just for display
            }
         }
         if (initialInputs.expectedOutput) {
            setExpectedJsonContent(initialInputs.expectedOutput);
            setExpectedText(JSON.stringify(initialInputs.expectedOutput, null, 2));
            setExpectedInputType(initialInputs.expectedFileName ? 'upload' : 'paste');
            if (initialInputs.expectedFileName) {
               setExpectedFile(new File([], initialInputs.expectedFileName));
            }
         }
         if (initialInputs.schemaKey) {
            setSchemaKey(initialInputs.schemaKey);
         }
         if (initialInputs.uploadSchema !== undefined) {
            setUploadSchema(initialInputs.uploadSchema);
         }
      } else {
         // Reset state
         setEventInputType('upload'); setEventFile(null); setEventText(''); setEventJsonContent(null); setEventError(null);
         setTenantId(null); setProcessId(null); setDataSources({}); setCoverage([]);
         setExpectedInputType('upload'); setExpectedFile(null); setExpectedText(''); setExpectedJsonContent(null); setExpectedError(null);
         setSchemaKey(''); setUploadSchema(true); setKeyCheckStatus(null); setKeyExistsData(null); setConfirmOverwrite(false);
      }
    }
  }, [isOpen, initialInputs]);

  // Parse event JSON when text or file changes
  useEffect(() => {
    try {
      if (!eventJsonContent) {
        setTenantId(null);
        setProcessId(null);
        setDataSources({});
        setCoverage([]);
        return;
      }
      
      const tid = eventJsonContent.TenantID;
      const proc = eventJsonContent.Process;
      
      if (!tid) throw new Error("Missing TenantID in Event JSON");
      if (!proc) throw new Error("Missing Process in Event JSON");
      if (proc !== 'Compute_VR2' && proc !== 'Compute_IP') {
         throw new Error(`Invalid Process: ${proc}. Must be Compute_VR2 or Compute_IP`);
      }
      
      setTenantId(tid);
      setProcessId(proc);
      
      if (eventJsonContent.SchemaKey && !schemaKey && !initialInputs?.schemaKey) {
         setSchemaKey(eventJsonContent.SchemaKey);
      }

      const sdm = eventJsonContent.SourceDataMap || {};
      if (Object.keys(sdm).length === 0) {
         throw new Error("Missing SourceDataMap in Event JSON");
      }
      
      const dsCounts: Record<string, number> = {};
      for (const [k, v] of Object.entries(sdm)) {
        if (Array.isArray(v)) {
          dsCounts[k] = v.length;
        }
      }
      setDataSources(dsCounts);
      
      const schemaClasses = workflow.schema?.classes || [];
      const cov = schemaClasses.map((cls: any) => {
         let dsName = cls.DataSource || cls.className || 'Unknown';
         if (!cls.DataSource && cls.children) {
           const dsNode = cls.children.find((c:any) => c.title === 'DataSource');
           if (dsNode) dsName = dsNode.val;
         }
         const isPresent = Object.keys(dsCounts).includes(dsName);
         return { name: dsName, present: isPresent };
      });
      setCoverage(cov);
      setEventError(null);
    } catch(err: any) {
      setEventError(err.message || "Invalid Event JSON structure");
    }
  }, [eventJsonContent]);

  const handleEventTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setEventText(val);
    try {
      if (!val.trim()) {
         setEventJsonContent(null);
         setEventError(null);
         return;
      }
      const parsed = JSON.parse(val);
      setEventJsonContent(parsed);
      setEventError(null);
    } catch(err) {
      setEventJsonContent(null);
      setEventError("Invalid JSON");
    }
  };

  const handleExpectedTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setExpectedText(val);
    try {
      if (!val.trim()) {
         setExpectedJsonContent(null);
         setExpectedError(null);
         return;
      }
      const parsed = JSON.parse(val);
      setExpectedJsonContent(parsed);
      setExpectedError(null);
    } catch(err) {
      setExpectedJsonContent(null);
      setExpectedError("Invalid JSON");
    }
  };

  const handleEventFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        setEventJsonContent(json);
        setEventFile(file);
        setEventText(JSON.stringify(json, null, 2));
      } catch (err) {
        setEventError("Invalid JSON file format.");
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
    setExpectedFile(file);
    setExpectedError(null);
    
    // Check if it's a JSON file
    if (file.name.endsWith('.json')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const json = JSON.parse(event.target?.result as string);
          setExpectedJsonContent(json);
          setExpectedText(JSON.stringify(json, null, 2));
        } catch (err) {
          setExpectedError("Invalid JSON file format.");
          setExpectedJsonContent(null);
        }
      };
      reader.readAsText(file);
    } else {
      // For non-JSON files (Excel, PDF, etc), convert to base64 Data URL
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setExpectedJsonContent({
           _type: "file",
           name: file.name,
           type: file.type,
           size: file.size,
           dataUrl: dataUrl
        });
        setExpectedText(`[File: ${file.name}]`);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  // Check Schema Key existence on blur
  const checkSchemaKey = async () => {
    if (!schemaKey || !uploadSchema) {
       setKeyCheckStatus(null);
       return;
    }
    
    // validate key format (.json or s3://)
    if (!schemaKey.endsWith('.json') && !schemaKey.startsWith('s3://')) {
       setKeyCheckStatus(null);
       return;
    }
    
    setKeyCheckStatus('checking');
    try {
       const res = await fetch(`${API_URL}/s3/schema-key-check?key=${encodeURIComponent(schemaKey)}&tenantId=${tenantId || ''}`);
       if (res.ok) {
          const data = await res.json();
          if (data.exists) {
             setKeyCheckStatus('exists');
             setKeyExistsData({ modified: data.modified, size: data.size });
             setConfirmOverwrite(false); // reset
          } else {
             setKeyCheckStatus('clear');
          }
       } else {
          setKeyCheckStatus(null);
       }
    } catch(e) {
       setKeyCheckStatus(null);
    }
  };

  useEffect(() => {
     if (uploadSchema && schemaKey) {
        checkSchemaKey();
     } else {
        setKeyCheckStatus(null);
     }
  }, [uploadSchema]);

  if (!isOpen) return null;

  const hasCoverageError = coverage.some(c => !c.present);
  const isValidSchemaKey = schemaKey.endsWith('.json') || schemaKey.startsWith('s3://');
  
  const canRun = 
    eventJsonContent && 
    !eventError && 
    !hasCoverageError &&
    expectedJsonContent && 
    !expectedError &&
    schemaKey && 
    isValidSchemaKey &&
    (keyCheckStatus === 'exists' && uploadSchema ? confirmOverwrite : true);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl w-full max-w-2xl shadow-xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Database className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-neutral-900 dark:text-white">Final Output — Inputs</h2>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">Provide the execution context and event data to test the schema</p>
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

        {/* Scrollable Content */}
        <div className="p-5 space-y-6 overflow-y-auto">
          
          {/* 1. Event JSON */}
          <div className="space-y-3">
             <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200">1. Event JSON</label>
                <div className="flex bg-neutral-100 dark:bg-neutral-800 rounded p-0.5 text-[10px] font-semibold">
                   <button onClick={() => setEventInputType('upload')} className={`px-2 py-0.5 rounded ${eventInputType === 'upload' ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}>Upload</button>
                   <button onClick={() => setEventInputType('paste')} className={`px-2 py-0.5 rounded ${eventInputType === 'paste' ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}>Paste</button>
                </div>
             </div>

             {eventInputType === 'upload' ? (
                <div className="flex flex-col space-y-2">
                  <label className="cursor-pointer inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-950/50 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs font-semibold rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 transition-colors w-full">
                    <Upload className="h-3.5 w-3.5" />
                    <span>Upload Event JSON</span>
                    <input type="file" accept=".json" onChange={handleEventFileUpload} className="hidden" />
                  </label>
                  {eventFile && !eventError && (
                    <div className="flex items-center space-x-2 text-xs font-mono text-neutral-600 dark:text-neutral-300 bg-neutral-50 dark:bg-neutral-800 px-3 py-2 rounded-lg">
                      <FileJson className="h-4 w-4 text-blue-500" />
                      <span className="truncate">{eventFile.name}</span>
                    </div>
                  )}
                </div>
             ) : (
                <textarea
                   rows={4}
                   value={eventText}
                   onChange={handleEventTextChange}
                   placeholder="Paste your Event JSON here..."
                   className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-lg p-2.5 text-xs font-mono text-neutral-900 dark:text-neutral-200 placeholder-neutral-400 focus:outline-none focus:border-neutral-500 transition-colors"
                />
             )}

             {eventError && (
                <div className="text-[11px] text-rose-600 dark:text-rose-400 flex items-center space-x-1">
                   <AlertCircle className="h-3.5 w-3.5" />
                   <span>{eventError}</span>
                </div>
             )}

             {/* Event Context Feedback */}
             {eventJsonContent && !eventError && (
                <div className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg p-3 space-y-2">
                   <div className="flex flex-wrap items-center gap-3">
                      {tenantId && <div className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300"><span className="text-neutral-500">TenantID:</span> {tenantId}</div>}
                      {processId && <div className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300"><span className="text-neutral-500">Process:</span> {processId}</div>}
                   </div>
                   {Object.keys(dataSources).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1 border-t border-neutral-200 dark:border-neutral-800">
                         {Object.entries(dataSources).map(([k,v]) => (
                            <span key={k} className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50 rounded-md text-[10px] font-bold">
                              {k} · {v}
                            </span>
                         ))}
                      </div>
                   )}
                   {coverage.length > 0 && (
                      <div className="pt-2">
                         <div className="text-[10px] font-bold text-neutral-500 uppercase mb-1">Schema Coverage Check</div>
                         <div className="grid grid-cols-2 gap-1">
                            {coverage.map((c, i) => (
                               <div key={i} className="flex items-center space-x-1.5 text-[11px]">
                                  {c.present ? <CheckCircle2 className="h-3 w-3 text-emerald-500"/> : <X className="h-3 w-3 text-rose-500"/>}
                                  <span className={c.present ? 'text-neutral-700 dark:text-neutral-300' : 'text-rose-600 dark:text-rose-400 font-bold'}>{c.name}</span>
                               </div>
                            ))}
                         </div>
                      </div>
                   )}
                </div>
             )}
          </div>

          {/* 2. Expected Output */}
          <div className="space-y-3">
             <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200">2. Expected Output</label>
                <div className="flex bg-neutral-100 dark:bg-neutral-800 rounded p-0.5 text-[10px] font-semibold">
                   <button onClick={() => setExpectedInputType('upload')} className={`px-2 py-0.5 rounded ${expectedInputType === 'upload' ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}>Upload</button>
                   <button onClick={() => setExpectedInputType('paste')} className={`px-2 py-0.5 rounded ${expectedInputType === 'paste' ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}>Paste</button>
                </div>
             </div>

             {expectedInputType === 'upload' ? (
                <div className="flex flex-col space-y-2">
                  <label className="cursor-pointer inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-950/50 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs font-semibold rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 transition-colors w-full">
                    <Upload className="h-3.5 w-3.5" />
                    <span>Upload Expected Output</span>
                    <input type="file" onChange={handleExpectedFileUpload} className="hidden" />
                  </label>
                  {expectedFile && !expectedError && (
                    <div className="flex items-center justify-between bg-neutral-50 dark:bg-neutral-800 px-3 py-2 rounded-lg">
                       <div className="flex items-center space-x-2 text-xs font-mono text-neutral-600 dark:text-neutral-300">
                         <FileJson className="h-4 w-4 text-emerald-500" />
                         <span className="truncate">{expectedFile.name}</span>
                       </div>
                       {expectedJsonContent && Array.isArray(expectedJsonContent) && (
                          <span className="text-[10px] text-neutral-500">{expectedJsonContent.length} Expected Records</span>
                       )}
                       {expectedJsonContent?._type === 'file' && (
                          <span className="text-[10px] text-neutral-500">File attached</span>
                       )}
                    </div>
                  )}
                </div>
             ) : (
                <div className="relative">
                   <textarea
                      rows={3}
                      value={expectedText}
                      onChange={handleExpectedTextChange}
                      placeholder="Paste Expected JSON here..."
                      className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-lg p-2.5 text-xs font-mono text-neutral-900 dark:text-neutral-200 placeholder-neutral-400 focus:outline-none focus:border-neutral-500 transition-colors"
                   />
                   {expectedJsonContent && Array.isArray(expectedJsonContent) && (
                      <div className="absolute right-2 bottom-2 text-[10px] text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded">{expectedJsonContent.length} records</div>
                   )}
                   {expectedJsonContent?._type === 'file' && (
                      <div className="absolute right-2 bottom-2 text-[10px] text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded">File attached</div>
                   )}
                </div>
             )}

             {expectedError && (
                <div className="text-[11px] text-rose-600 dark:text-rose-400 flex items-center space-x-1">
                   <AlertCircle className="h-3.5 w-3.5" />
                   <span>{expectedError}</span>
                </div>
             )}
          </div>

          {/* 3. Schema Key */}
          <div className="space-y-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
             <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200">3. Schema Destination Key</label>
             <div className="relative">
                <input
                   type="text"
                   value={schemaKey}
                   onChange={(e) => setSchemaKey(e.target.value)}
                   onBlur={checkSchemaKey}
                   placeholder="e.g. Schema/budget.json or s3://dt-bucket/budget.json"
                   className={`w-full bg-neutral-50 dark:bg-neutral-950 border ${!isValidSchemaKey && schemaKey ? 'border-rose-300 focus:border-rose-500' : 'border-neutral-300 dark:border-neutral-700 focus:border-neutral-500'} rounded-lg px-3 py-2 text-xs font-mono text-neutral-900 dark:text-neutral-200 focus:outline-none transition-colors`}
                />
                {!isValidSchemaKey && schemaKey && (
                   <p className="text-[10px] text-rose-500 mt-1">Must end in .json or start with s3://</p>
                )}
             </div>

             {tenantId && (
                <div className="text-[10px] text-neutral-500 dark:text-neutral-400">
                   Target Bucket: <span className="font-mono text-neutral-700 dark:text-neutral-300">dt-{tenantId.toLowerCase()}-dev</span>
                </div>
             )}

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
                  eventJson: eventJsonContent,
                  expectedOutput: expectedJsonContent,
                  schemaKey,
                  uploadSchema,
                  eventFileName: eventFile?.name,
                  expectedFileName: expectedFile?.name,
                  confirmOverwrite: keyCheckStatus === 'exists' ? confirmOverwrite : false
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
