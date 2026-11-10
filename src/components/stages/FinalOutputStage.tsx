import React, { useState, useEffect, useMemo, useRef } from 'react';
import { API_URL } from '../../services/api/config';
import { useWorkflow } from '../../context/WorkflowContext';
import { pollOperation } from '../../services/api/pollOperation';
import { FinalOutputInputsModal } from '../common/FinalOutputInputsModal';
import { useStageData } from '../../hooks/useStageData';
import { 
  CheckCircle2, 
  Download, 
  Copy, 
  Check, 
  ArrowLeft, 
  FileJson,
  AlertCircle,
  Database,
  Play,
  X,
  Table as TableIcon,
  Code as CodeIcon,
  Search,
  Layers,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  FileSpreadsheet
} from 'lucide-react';
import { StageActionBar } from '../layout/StageActionBar';
import { SaveDraftButton } from '../common/SaveDraftButton';
import { GenerationProcessingModal } from '../layout/GenerationProcessingModal';
import { StaleStageBanner } from '../common/StaleStageBanner';

export const FinalOutputStage: React.FC = () => {
  const { 
    workflow, 
    setWorkflow,
    setStage, 
    setRunStatus, 
    setActiveOperation,
    updateWorkflowField,
    files,
    staleStages,
    clearStaleStage,
    stageStatus,
    refreshStageStatus,
    showToast
  } = useWorkflow();

  const { data: stageFinalOutput } = useStageData<any>('final_output');
  const { data: stageOutput } = useStageData<any>('output');
  
  const [copied, setCopied] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [missingRequiredList, setMissingRequiredList] = useState<string[]>([]);
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [resultViewerTab, setResultViewerTab] = useState<'actual' | 'expected' | 'diffs'>('actual');
  const [showAllDiffs, setShowAllDiffs] = useState(false);
  const [hasExecuted, setHasExecuted] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const executionLockRef = useRef<boolean>(false);
  const autoTriggeredRef = useRef<boolean>(false);
  const lastExecutedAutoRunRef = useRef<number | null>(null);

  // Date inputs
  const [forPrdFrom, setForPrdFrom] = useState<string>('2025-04-01');
  const [forPrdTo, setForPrdTo] = useState<string>('2026-03-31');

  // Case Folder input state
  // Dynamic inputs data from GET /api/runs/{runId}/final-output/inputs
  const [inputsData, setInputsData] = useState<any>(null);
  const [loadingInputs, setLoadingInputs] = useState<boolean>(false);

  // Table Explorer state: activeTableType ('output' | 'input')
  const [activeTableType, setActiveTableType] = useState<'output' | 'input'>('output');
  const [selectedInputSource, setSelectedInputSource] = useState<string>('');
  const [inputDataCache, setInputDataCache] = useState<Record<string, { columns: string[]; rows: any[]; totalRows: number }>>({});
  const [isLoadingInputData, setIsLoadingInputData] = useState<boolean>(false);

  const [caseDirInput, setCaseDirInput] = useState<string>(workflow.caseDir || '');

  // Keep local caseDir input in sync with workflow.caseDir
  useEffect(() => {
    if (workflow.caseDir) {
      setCaseDirInput(workflow.caseDir);
    }
  }, [workflow.caseDir]);

  // Sync caseDir from backend if not set or when runId changes
  useEffect(() => {
    if (!workflow.runId) return;
    let isMounted = true;
    fetch(`${API_URL}/runs/${workflow.runId}/manifest`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isMounted || !data) return;
        const beCaseDir = data.caseDir || data.case_dir;
        if (beCaseDir) {
          setCaseDirInput(beCaseDir);
          if (workflow.caseDir !== beCaseDir) {
            updateWorkflowField('caseDir', beCaseDir);
          }
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [workflow.runId, updateWorkflowField, workflow.caseDir]);

  const handleCaseDirChange = (val: string) => {
    setCaseDirInput(val);
    updateWorkflowField('caseDir', val);
  };


  const loadInputs = async () => {
    const rId = workflow.runId || 'default';
    try {
      setLoadingInputs(true);
      const res = await fetch(`${API_URL}/runs/${rId}/final-output/inputs`);
      if (res.ok) {
        const data = await res.json();
        setInputsData(data);
        if (data.forPrdFrom) setForPrdFrom(data.forPrdFrom);
        if (data.forPrdTo) setForPrdTo(data.forPrdTo);
        if (data.caseDir && !caseDirInput) setCaseDirInput(data.caseDir);
      }
    } catch (e) {
      console.warn('Failed to load final-output inputs:', e);
    } finally {
      setLoadingInputs(false);
    }
  };

  useEffect(() => {
    loadInputs();
  }, [workflow.runId]);

  const handleCaseDirBlur = async () => {
    if (!workflow.runId) return;
    try {
      await fetch(`${API_URL}/runs/${workflow.runId}/case-dir`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseDir: caseDirInput }),
      });
      loadInputs();
    } catch (e) {
      console.warn('Failed to update caseDir on backend:', e);
    }
  };

  // Class-wise viewer state
  const [selectedClass, setSelectedClass] = useState<string>('Export');
  const [classRowsCache, setClassRowsCache] = useState<Record<string, any[]>>({});
  const [viewMode, setViewMode] = useState<'table' | 'json'>('table');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const pageSize = 25;
  const viewerSectionRef = useRef<HTMLDivElement>(null);

  // History / hydration: opening a past run loads GET final-output through useStageData,
  // so the screen renders without running again.
  useEffect(() => {
    const historicalData = stageFinalOutput || stageOutput;
    if (historicalData && !executionResult) {
      setExecutionResult(historicalData);
      setHasExecuted(true);
    }
  }, [stageFinalOutput, stageOutput, executionResult]);

  // Initialize: load existing result from backend on mount/run change
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
              updateWorkflowField('outputs', { ...workflow.outputs, final_output: data });
              if (data.eventJson || data.inputs) {
                updateWorkflowField('finalOutputInputs', {
                  ...workflow.finalOutputInputs,
                  eventJson: data.eventJson || data.inputs?.eventJson || workflow.finalOutputInputs?.eventJson,
                  schemaKey: data.schemaKey || data.inputs?.schemaKey || workflow.finalOutputInputs?.schemaKey,
                  tenantId: data.tenantId || data.inputs?.tenantId || 'DM00005',
                  process: data.process || data.inputs?.process || 'Compute_VR2',
                  forPrdFrom: data.forPrdFrom || data.inputs?.forPrdFrom || '2025-04-01',
                  forPrdTo: data.forPrdTo || data.inputs?.forPrdTo || '2026-03-31',
                  eventFileName: data.inputs?.eventFile || 'Event.py'
                });
              }
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
    refreshStageStatus();
  }, [refreshStageStatus]);

  // Auto-run trigger when coming from Schema Studio
  useEffect(() => {
    const autoRunTime = workflow.finalOutputInputs?.autoRunTriggeredAt;
    if (autoRunTime && autoRunTime !== lastExecutedAutoRunRef.current) {
      lastExecutedAutoRunRef.current = autoRunTime;
      executeSchema(workflow.finalOutputInputs);
    }
  }, [workflow.finalOutputInputs?.autoRunTriggeredAt]);

  // Sync result from file store if result/final_output.json exists
  useEffect(() => {
    const file = files['result/final_output.json'];
    if (file && file.content) {
      try {
        const parsed = JSON.parse(file.content);
        setExecutionResult(parsed);
        setHasExecuted(true);
      } catch (e) {}
    }
  }, [files]);

  const executeSchema = async (customInputs?: any) => {
    if (executionLockRef.current) {
      console.warn("Execution already in progress, skipping duplicate call.");
      return;
    }
    executionLockRef.current = true;
    autoTriggeredRef.current = true;

    setHasExecuted(true);
    setExecutionError(null);
    setMissingRequiredList([]);
    setShowErrorPopup(false);
    setExecutionResult(null);
    setIsExecuting(true);
    
    try {
      const activeInputs = customInputs || workflow.finalOutputInputs;
      const payload: Record<string, any> = {
        runId: workflow.runId,
        forPrdFrom: forPrdFrom || "2025-04-01",
        forPrdTo: forPrdTo || "2026-03-31",
      };
      if (activeInputs?.eventJson) payload.eventJson = activeInputs.eventJson;
      if (activeInputs?.expectedOutput) payload.expectedOutput = activeInputs.expectedOutput;
      if (activeInputs?.schemaKey) payload.schemaKey = activeInputs.schemaKey;
      if (activeInputs?.uploadSchema !== undefined) payload.uploadSchema = activeInputs.uploadSchema;
      if (activeInputs?.confirmOverwrite !== undefined) payload.confirmOverwrite = activeInputs.confirmOverwrite;
      if (caseDirInput || workflow.caseDir) payload.caseDir = caseDirInput || workflow.caseDir;

      const response = await fetch(`${API_URL}/execute-schema`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const err: any = new Error(errData.detail || errData.error || errData.message || `Server returned ${response.status}`);
        err.stage = errData.stage;
        err.missing = errData.missing || errData.missingDataSources;
        err.required = errData.required || errData.requiredDataSources;
        throw err;
      }

      const opData = await response.json();
      let finalStatusData: any = null;

      if (opData.operationId) {
        setActiveOperation({
          operationId: opData.operationId,
          type: 'execute-schema',
          status: 'RUNNING',
          message: 'Executing Schema'
        });

        finalStatusData = await pollOperation(
          opData.operationId,
          (step) => {},
          (statusUpdate) => {
            setActiveOperation((prev: any) => ({
              ...prev,
              ...statusUpdate,
              operationId: statusUpdate.operationId || opData.operationId
            }));
          }
        );
      } else {
        finalStatusData = opData;
      }

      // Check if operation failed with stage InputCheck
      if (finalStatusData?.status === 'FAILED' && (finalStatusData.stage === 'InputCheck' || finalStatusData.result?.stage === 'InputCheck')) {
        const err: any = new Error(finalStatusData.error || finalStatusData.message || 'InputCheck failed');
        err.stage = 'InputCheck';
        err.missing = finalStatusData.missing || finalStatusData.missingDataSources || finalStatusData.result?.missing || finalStatusData.result?.missingDataSources;
        err.required = finalStatusData.required || finalStatusData.requiredDataSources || finalStatusData.result?.required || finalStatusData.result?.requiredDataSources;
        throw err;
      }

      // Load GET /api/runs/{runId}/final-output on COMPLETED
      let outputData: any = null;
      if (workflow.runId) {
        try {
          const foRes = await fetch(`${API_URL}/runs/${workflow.runId}/final-output`);
          if (foRes.ok) {
            outputData = await foRes.json();
          }
        } catch (e) {
          console.warn('Failed to load final-output from server:', e);
        }
      }

      if (!outputData && finalStatusData) {
        outputData = finalStatusData.result || finalStatusData;
      }

      if (outputData && !outputData.error) {
        setExecutionResult(outputData);
        updateWorkflowField('outputs', { ...workflow.outputs, final_output: outputData });
        if (outputData.eventJson || outputData.inputs) {
          updateWorkflowField('finalOutputInputs', {
            ...workflow.finalOutputInputs,
            eventJson: outputData.eventJson || outputData.inputs?.eventJson || workflow.finalOutputInputs?.eventJson,
            schemaKey: outputData.schemaKey || outputData.inputs?.schemaKey || workflow.finalOutputInputs?.schemaKey,
            tenantId: outputData.tenantId || outputData.inputs?.tenantId || 'DM00005',
            process: outputData.process || outputData.inputs?.process || 'Compute_VR2',
            forPrdFrom: outputData.forPrdFrom || outputData.inputs?.forPrdFrom || '2025-04-01',
            forPrdTo: outputData.forPrdTo || outputData.inputs?.forPrdTo || '2026-03-31',
            eventFileName: outputData.inputs?.eventFile || 'Event.py'
          });
        }

        const rawReport = outputData.runReport || outputData.run_report || outputData.report || [];
        setSelectedClass('Export');

        // Warning toast if any class failed
        const failedCount = Array.isArray(rawReport)
          ? rawReport.filter((r: any) => {
              const s = (r.status || '').toUpperCase();
              return s === 'FAILED' || s === 'FAIL';
            }).length
          : 0;

        if (failedCount > 0) {
          showToast(`${failedCount} classes failed - see run report`, 'info');
        } else {
          showToast('Schema execution completed successfully', 'success');
        }

        setRunStatus('COMPLETED');
        setWorkflow(prev => ({
          ...prev,
          runStatus: 'COMPLETED',
          generationStatus: 'completed'
        }));
        loadInputs();
      }

    } catch (err: any) {
      console.error("Execution failed:", err);
      setIsExecuting(false);
      setActiveOperation(null);
      setExecutionResult(null); // Do not show any results on error

      const isInputCheck =
        err.stage === 'InputCheck' ||
        err.statusData?.stage === 'InputCheck' ||
        (err.message && (err.message.includes('InputCheck') || err.message.toLowerCase().includes('source data missing')));

      if (isInputCheck) {
        // FAILED with stage "InputCheck": show error panel with "Source data missing for: <names>" and required list
        const missingRaw = err.missing || err.statusData?.missing || err.statusData?.missingDataSources;
        const missingNames = Array.isArray(missingRaw)
          ? missingRaw.join(', ')
          : (typeof missingRaw === 'string' ? missingRaw : 'Active_FS');
        
        let msg = `Source data missing for: ${missingNames}`;
        if (err.message && err.message.startsWith('Source data missing for:')) {
          msg = err.message;
        }
        setExecutionError(msg);

        const requiredRaw = err.required || err.statusData?.required || err.statusData?.requiredDataSources;
        const reqList = Array.isArray(requiredRaw) && requiredRaw.length > 0
          ? requiredRaw
          : (Array.isArray(missingRaw) ? missingRaw : [missingNames]);
        setMissingRequiredList(reqList);
        setRunStatus('FAILED');
      } else if (err.name === 'StoppedError' || (err.message && err.message.toLowerCase().includes('stopped'))) {
        setExecutionError("Execution stopped by user.");
        showToast("Execution stopped", 'info');
      } else {
        const msg = err.message || "Failed to execute schema against the provided Event JSON.";
        setExecutionError(msg);
        setShowErrorPopup(true);
        setRunStatus('FAILED');
      }
    } finally {
      setIsExecuting(false);
      setActiveOperation(null);
      executionLockRef.current = false;
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

  // 1. Run Report extraction: columns Class, Status, Rows, Notes / Error
  const runReport = useMemo(() => {
    if (!executionResult) return [];

    const rawList =
      executionResult.runReport ||
      executionResult.run_report ||
      executionResult.actualOutput?._RunReport ||
      executionResult.output?._RunReport ||
      executionResult.report ||
      executionResult.classes ||
      executionResult.schemaComparisons ||
      [];

    if (Array.isArray(rawList) && rawList.length > 0) {
      return rawList.map((item: any) => {
        const className =
          item.SchemaName ||
          item.schemaName ||
          item.className ||
          item.class ||
          item.class_name ||
          item.schema ||
          item.schema_name ||
          item.name ||
          'Unknown';
        
        const rows = item.Rows ?? item.rows ?? item.rowCount ?? item.row_count ?? item.actualCount ?? item.actual ?? item.count ?? 0;
        let status = (item.Status || item.status || '').toUpperCase();
        if (!status) {
          status = rows > 0 ? 'OK' : 'EMPTY';
        }
        if (status === 'PASS' || status === 'MATCH') status = 'OK';
        if (status === 'FAIL') status = 'FAILED';

        const notes = item.Notes || item.notes || item.Error || item.error || item.notes_error || item.notesError || item.message || '';
        const dataSource = item.DataSource || item.dataSource || item.datasource || '';
        return { className, schemaName: className, status, rows, notes, dataSource };
      });
    }

    // Fallback directly from actualOutput keys
    const actualObj = executionResult.actualOutput || executionResult.output;
    if (actualObj && typeof actualObj === 'object') {
      const entries = Object.entries(actualObj).filter(([k]) => !k.startsWith('_'));
      if (entries.length > 0) {
        return entries.map(([name, val]: [string, any]) => {
          const rows = Array.isArray(val) ? val.length : 0;
          return {
            className: name,
            schemaName: name,
            status: rows > 0 ? 'OK' : 'EMPTY',
            rows,
            notes: '',
            dataSource: ''
          };
        });
      }
    }

    if (executionResult.comparison?.schemas) {
      return Object.entries(executionResult.comparison.schemas).map(([name, data]: [string, any]) => {
        const rows = data.actualCount ?? data.actual ?? 0;
        let status = 'OK';
        if (data.status === 'FAIL' || data.status === 'MISMATCH') status = 'FAILED';
        else if (rows === 0) status = 'EMPTY';
        return {
          className: name,
          schemaName: name,
          status,
          rows,
          notes: data.status || '',
          dataSource: ''
        };
      });
    }

    return [];
  }, [executionResult]);

  // 2. Export Rows extraction
  const exportRows = useMemo(() => {
    if (!executionResult) return [];
    const rows =
      executionResult.exportRows ||
      executionResult.export_rows ||
      executionResult.export ||
      executionResult.output ||
      executionResult.actualOutput ||
      [];
    return Array.isArray(rows) ? rows : [];
  }, [executionResult]);

  // 3. Available Classes list
  const availableClasses = useMemo(() => {
    const classSet = new Set<string>();
    runReport.forEach(r => {
      if (r.className) classSet.add(r.className);
    });
    if (Array.isArray(workflow?.classes)) {
      workflow.classes.forEach((c: any) => {
        if (c.className) classSet.add(c.className);
      });
    }
    return Array.from(classSet);
  }, [runReport, workflow?.classes]);

  // 4. Helper to get records for a given class
  const getRecordsForClass = (data: any, clsName: string): any[] => {
    if (!data) return [];

    if (typeof data === 'object' && !Array.isArray(data) && data._type !== 'file') {
      if (clsName === 'ALL' || clsName === 'Export') {
        const all: any[] = [];
        Object.entries(data).forEach(([key, val]) => {
          if (key === '_RunReport') return;
          if (Array.isArray(val)) {
            val.forEach(item => {
              if (typeof item === 'object' && item !== null && !item.schemaname && !item.schema && !item.className) {
                all.push({ ...item, _class: key });
              } else {
                all.push(item);
              }
            });
          }
        });
        return all;
      }
      if (Array.isArray(data[clsName])) return data[clsName];
      const matchKey = Object.keys(data).find(k => k.toLowerCase() === clsName.toLowerCase());
      if (matchKey && Array.isArray(data[matchKey])) return data[matchKey];
      return [];
    }

    if (Array.isArray(data)) {
      if (clsName === 'ALL' || clsName === 'Export') return data;
      return data.filter((r: any) => {
        if (!r || typeof r !== 'object') return false;
        const primary = r.schemaname || r.schema || r.className || r.class || r._class;
        if (primary) {
          return primary === clsName || (typeof primary === 'string' && primary.toLowerCase() === clsName.toLowerCase());
        }
        const secondary = r.recordtype || r.type;
        if (secondary) {
          return secondary === clsName || (typeof secondary === 'string' && secondary.toLowerCase() === clsName.toLowerCase());
        }
        return false;
      });
    }

    return [];
  };

  // Handler to select and load an input table from SchemaControlledDataProcess/input
  const handleSelectInputSource = async (sourceName: string) => {
    setActiveTableType('input');
    setSelectedInputSource(sourceName);
    setPage(1);

    if (inputDataCache[sourceName]) {
      viewerSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    try {
      setIsLoadingInputData(true);
      const res = await fetch(`${API_URL}/runs/${workflow.runId || 'default'}/final-output/input-data/${encodeURIComponent(sourceName)}`);
      if (res.ok) {
        const data = await res.json();
        setInputDataCache(prev => ({
          ...prev,
          [sourceName]: {
            columns: data.columns || [],
            rows: data.rows || [],
            totalRows: data.totalRows || (data.rows ? data.rows.length : 0),
          }
        }));
      } else {
        showToast(`Could not load input data for ${sourceName}`, 'error');
      }
    } catch (e) {
      console.warn(`Failed to fetch input data for ${sourceName}:`, e);
    } finally {
      setIsLoadingInputData(false);
      viewerSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

    // 5. Select a class: loads GET /api/runs/{runId}/final-output/class/{schemaName}
  const handleSelectClass = async (clsName: string) => {
    setActiveTableType('output');
    setSelectedClass(clsName);
    setPage(1);

    if (clsName === 'Export' || clsName === 'ALL') {
      viewerSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    if (classRowsCache[clsName]) {
      viewerSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    if (workflow.runId) {
      try {
        const res = await fetch(`${API_URL}/runs/${workflow.runId}/final-output/class/${encodeURIComponent(clsName)}`);
        if (res.ok) {
          const data = await res.json();
          const rows = Array.isArray(data) ? data : (data.rows || data.exportRows || data.data || []);
          setClassRowsCache(prev => ({ ...prev, [clsName]: rows }));
        }
      } catch (e) {
        console.warn(`Failed to fetch class ${clsName}:`, e);
      }
    }
    viewerSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 6. Current records to display in the main output table
  const currentClassActualRecords = useMemo(() => {
    if (selectedClass === 'Export' || selectedClass === 'ALL') {
      return exportRows;
    }
    if (classRowsCache[selectedClass]) {
      return classRowsCache[selectedClass];
    }
    return getRecordsForClass(executionResult?.actualOutput || executionResult?.output, selectedClass);
  }, [selectedClass, exportRows, classRowsCache, executionResult]);

  const currentClassExpectedRecords = useMemo(() => {
    return getRecordsForClass(executionResult?.expectedOutput || inputs?.expectedOutput, selectedClass);
  }, [executionResult, inputs, selectedClass]);

  const currentClassRecords = useMemo(() => {
    if (resultViewerTab === 'actual') return currentClassActualRecords;
    return currentClassExpectedRecords;
  }, [resultViewerTab, currentClassActualRecords, currentClassExpectedRecords]);

  // Unified active records (switching between output class records and input table records)
  const activeRecords = useMemo(() => {
    if (activeTableType === 'input') {
      return inputDataCache[selectedInputSource]?.rows || [];
    }
    return currentClassRecords;
  }, [activeTableType, selectedInputSource, inputDataCache, currentClassRecords]);

  // Differences
  const allDiffs = useMemo(() => {
    if (Array.isArray(executionResult?.comparison?.diffs)) return executionResult.comparison.diffs;
    if (Array.isArray(executionResult?.differences)) return executionResult.differences;
    if (Array.isArray(executionResult?.diffs)) return executionResult.diffs;
    return [];
  }, [executionResult]);

  const filteredDiffs = useMemo(() => {
    if (!allDiffs || allDiffs.length === 0) return [];
    if (selectedClass === 'ALL' || selectedClass === 'Export') return allDiffs;
    return allDiffs.filter((d: any) => {
      const s = d.schema || d.schemaname || d.className;
      return s === selectedClass || (typeof s === 'string' && s.toLowerCase() === selectedClass.toLowerCase());
    });
  }, [allDiffs, selectedClass]);

  // Filtered records by search query
  const filteredRecords = useMemo(() => {
    if (!Array.isArray(activeRecords)) return [];
    if (!searchQuery.trim()) return activeRecords;
    const q = searchQuery.toLowerCase().trim();
    return activeRecords.filter((rec: any) => {
      if (typeof rec !== 'object' || rec === null) return String(rec).toLowerCase().includes(q);
      return Object.values(rec).some(v => String(v).toLowerCase().includes(q));
    });
  }, [activeRecords, searchQuery]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const paginatedRecords = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, page, pageSize]);

  // Columns for table view
  const tableColumns = useMemo(() => {
    if (activeTableType === 'input') {
      if (inputDataCache[selectedInputSource]?.columns?.length) {
        return inputDataCache[selectedInputSource].columns;
      }
      const recs = inputDataCache[selectedInputSource]?.rows || [];
      if (recs.length > 0 && typeof recs[0] === 'object') {
        return Object.keys(recs[0]);
      }
      return [];
    }
    if (!Array.isArray(currentClassRecords) || currentClassRecords.length === 0) return [];
    const keys = new Set<string>();
    const priority = [
      'lineid', 'schemaname', 'recordtype', 'gstin', 'pan', 
      'documentnumber', 'amount', 'taxablevalue', 'itcamount', 
      'totaltax', 'financialyear', 'month'
    ];
    currentClassRecords.slice(0, 30).forEach((r: any) => {
      if (typeof r === 'object' && r !== null) {
        Object.keys(r).forEach(k => keys.add(k));
      }
    });
    const cols: string[] = [];
    priority.forEach(p => {
      if (keys.has(p)) {
        cols.push(p);
        keys.delete(p);
      }
    });
    keys.forEach(k => cols.push(k));
    return cols;
  }, [activeTableType, selectedInputSource, inputDataCache, currentClassRecords]);

  const handleCopyClassOutput = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(activeRecords, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch(e) {}
  };

  const handleDownloadClassOutput = () => {
    if (activeTableType === 'input') {
      window.open(`${API_URL}/runs/${workflow.runId || 'default'}/final-output/input-data/${encodeURIComponent(selectedInputSource)}/csv`, '_blank');
      return;
    }
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentClassRecords, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      const fileName = `${selectedClass === 'ALL' ? 'all_classes' : selectedClass.toLowerCase()}_${resultViewerTab}.json`;
      downloadAnchor.setAttribute("download", fileName);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (e) {
      console.error("Failed to download output JSON", e);
    }
  };

  const isOutputReady = stageStatus?.output?.ready ?? !!(workflow.schema || workflow.runId);
  const missingInputs = !isOutputReady ? 'Generated schema' : '';

  const inputFilesList = useMemo(() => {
    if (inputsData?.inputFiles && inputsData.inputFiles.length > 0) {
      return inputsData.inputFiles;
    }
    if (inputs?.inputFiles && inputs.inputFiles.length > 0) {
      return inputs.inputFiles;
    }
    return [];
  }, [inputsData?.inputFiles, inputs?.inputFiles]);

  const activeSources: Array<{ name: string; rows: number }> = useMemo(() => {
    if (inputs?.eventJson?.SourceDataMap) {
      const sdm = inputs.eventJson.SourceDataMap;
      const list = Object.entries(sdm)
        .filter(([k]) => k !== '#consolidate#' && !k.startsWith('__'))
        .map(([k, v]: any) => ({
          name: k,
          rows: Array.isArray(v) ? v.length : typeof v === 'number' ? v : 0,
        }));
      if (list.length > 0) return list;
    }
    if (inputsData?.sources && inputsData.sources.length > 0) {
      return inputsData.sources;
    }
    if (inputs?.sources && inputs.sources.length > 0) {
      return inputs.sources;
    }
    return [];
  }, [inputs?.eventJson?.SourceDataMap, inputsData?.sources, inputs?.sources]);
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

  if (!inputs && !hasExecuted && !executionResult) {
    return (
      <div className="flex flex-col min-h-full">
        <StageActionBar
          title="Final Output"
          description="Waiting for inputs..."
          leftActions={
            <button
              onClick={() => setStage('schema')}
              className="p-1.5 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white rounded-md transition-colors cursor-pointer"
              title="Back to Schema Studio"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          }
          rightActions={
            <button
              type="button"
              onClick={() => executeSchema()}
              disabled={!isOutputReady || isExecuting}
              className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-lg text-xs transition-all shadow-sm shrink-0 cursor-pointer"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>Run</span>
            </button>
          }
        />
        <div className="flex-1 p-12 text-center text-neutral-600 dark:text-neutral-400">
           <p className="text-xs">No execution inputs configured yet.</p>
           {!isOutputReady && (
             <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
               Missing inputs: {missingInputs}. Please complete Schema Studio first.
             </p>
           )}
           <div className="flex items-center justify-center space-x-3 mt-4">
             <button
               onClick={() => setStage('schema')}
               className="px-4 py-2 border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-lg text-xs font-semibold cursor-pointer"
             >
               Go to Schema Studio
             </button>
             <button
               type="button"
               onClick={() => executeSchema()}
               disabled={!isOutputReady || isExecuting}
               className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-xs font-semibold cursor-pointer shadow-sm flex items-center space-x-1.5"
             >
               <Play className="h-3.5 w-3.5 fill-current" />
               <span>Run</span>
             </button>
             <button
               onClick={() => setIsModalOpen(true)}
               disabled={!isOutputReady}
               title={!isOutputReady ? `Disabled: Missing ${missingInputs}` : 'Configure Execution Inputs'}
               className="px-4 py-2 bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-xs font-semibold cursor-pointer"
             >
               Configure Execution Inputs
             </button>
           </div>
        </div>
        <FinalOutputInputsModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          initialInputs={workflow.finalOutputInputs}
          onRun={(newInputs) => {
            updateWorkflowField('finalOutputInputs', newInputs);
            setIsModalOpen(false);
            executeSchema(newInputs);
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full">
      <StageActionBar
        title="Final Output"
        description={workflow.runStatus === 'COMPLETED' ? "Evaluation successful. Run complete." : "Evaluation results based on your runtime data."}
        leftActions={
          <button
            onClick={() => setStage('schema')}
            className="p-1.5 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            title="Back to Schema Studio"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        }
        rightActions={
          <>
            <button
              type="button"
              onClick={() => executeSchema()}
              disabled={isExecuting}
              className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-lg text-xs transition-all shadow-sm shrink-0 cursor-pointer"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>Run</span>
            </button>
            <button
              onClick={() => {
                 if (workflow.runId) {
                    window.open(`${API_URL}/schema/${workflow.runId}/download`, '_blank');
                 }
              }}
              className="flex items-center space-x-1.5 px-4 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 font-semibold rounded-lg text-xs transition-all shadow-sm shrink-0 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download Schema</span>
            </button>
            <button
              onClick={() => {
                 if (workflow.runId) {
                    window.open(`${API_URL}/runs/${workflow.runId}/final-output/download`, '_blank');
                 }
              }}
              className="flex items-center space-x-1.5 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:hover:bg-neutral-100 dark:text-neutral-900 font-semibold rounded-lg text-xs transition-all shadow-sm shrink-0 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download results</span>
            </button>
          </>
        }
      />

      <div className="flex-1 p-5 lg:p-6 max-w-5xl w-full mx-auto space-y-4 pb-16">
        {(staleStages.output || staleStages.final_output) && (
          <StaleStageBanner
            stageName="Final Output"
            reason={staleStages.output || staleStages.final_output}
            onRegenerate={async () => {
              if (workflow.finalOutputInputs) {
                await executeSchema(workflow.finalOutputInputs);
              } else {
                setIsModalOpen(true);
              }
              clearStaleStage('output');
              clearStaleStage('final_output');
            }}
          />
        )}
        
        {/* Top Inputs Used Card */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-sm space-y-4">
           <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <div className="flex items-center space-x-2">
                 <Database className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                 <h3 className="text-xs font-bold text-neutral-900 dark:text-white">Inputs Used for Execution</h3>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => executeSchema()}
                  disabled={isExecuting}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-md text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Play className="h-3 w-3 fill-current" />
                  <span>Run</span>
                </button>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 rounded-md text-xs font-semibold transition-colors cursor-pointer"
                >
                  Change inputs
                </button>
              </div>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                 <div>
                   <div className="text-[10px] font-bold text-neutral-500 uppercase">Event JSON</div>
                   <div className="flex items-center space-x-2 text-xs font-mono text-neutral-700 dark:text-neutral-300 pt-0.5">
                      <FileJson className="h-4 w-4 text-blue-500 shrink-0" />
                      <span className="truncate">{inputs?.eventFileName || inputsData?.eventFile || 'event_input.json'}</span>
                   </div>
                 </div>
                 {(inputs?.eventJson?.TenantID || inputsData?.tenantId) && (
                    <div className="flex gap-2">
                       <span className="px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded text-[10px] font-semibold">
                         Tenant: {inputs?.eventJson?.TenantID || inputsData?.tenantId}
                       </span>
                       <span className="px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded text-[10px] font-semibold">
                         Process: {inputs?.eventJson?.Process || inputsData?.process}
                       </span>
                    </div>
                 )}
                 {activeSources.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                       {activeSources.map((s: any) => (
                          <span key={s.name} className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50 rounded-md text-[10px] font-bold">
                            {s.name} - {s.rows}
                          </span>
                       ))}
                    </div>
                 )}

                 {/* Generated Input Files from SchemaControlledDataProcess/input */}
                 {inputFilesList.length > 0 && (
                    <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 space-y-1.5">
                       <div className="flex items-center justify-between">
                          <div className="text-[10px] font-bold text-neutral-500 uppercase flex items-center space-x-1">
                             <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                             <span>Generated Inputs (SchemaControlledDataProcess/input)</span>
                          </div>
                          <span className="text-[9px] font-mono text-neutral-400">
                             {inputFilesList.length} {inputFilesList.length === 1 ? 'file' : 'files'}
                          </span>
                       </div>
                       <div className="space-y-1">
                          {inputFilesList.map((file: any) => (
                             <div
                                key={file.name}
                                className="flex items-center justify-between p-2 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/70 dark:border-neutral-700/60 text-xs"
                             >
                                <div className="flex items-center space-x-2 truncate">
                                   <span className="font-mono font-medium text-neutral-800 dark:text-neutral-200 truncate">
                                      {file.name}
                                   </span>
                                   <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 rounded text-[9px] font-semibold">
                                      {file.rows} rows
                                   </span>
                                   {file.size && (
                                      <span className="text-[10px] font-mono text-neutral-400">
                                         {file.size}
                                      </span>
                                   )}
                                </div>
                                <div className="flex items-center space-x-1 shrink-0">
                                   <button
                                      type="button"
                                      onClick={() => handleSelectInputSource(file.source || file.name)}
                                      className="inline-flex items-center space-x-1 px-2 py-1 text-[10px] font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 rounded border border-blue-200 dark:border-blue-800/60 transition-colors cursor-pointer"
                                   >
                                      <Eye className="h-3 w-3" />
                                      <span>Inspect</span>
                                   </button>
                                   <a
                                      href={`${API_URL}/runs/${workflow.runId || 'default'}/final-output/input-data/${encodeURIComponent(file.source || file.name)}/csv`}
                                      download
                                      className="inline-flex items-center p-1 text-[10px] text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
                                      title="Download input CSV"
                                   >
                                      <Download className="h-3 w-3" />
                                   </a>
                                </div>
                             </div>
                          ))}
                       </div>
                    </div>
                 )}
              </div>

              <div className="space-y-4">
                 <div className="space-y-1.5">
                    <div className="text-[10px] font-bold text-neutral-500 uppercase">Period (forPrdFrom — forPrdTo)</div>
                    <div className="flex items-center space-x-2 text-xs">
                       <input
                         type="date"
                         value={forPrdFrom}
                         onChange={(e) => setForPrdFrom(e.target.value)}
                         className="px-2 py-1 text-xs rounded border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200"
                       />
                       <span className="text-neutral-400">to</span>
                       <input
                         type="date"
                         value={forPrdTo}
                         onChange={(e) => setForPrdTo(e.target.value)}
                         className="px-2 py-1 text-xs rounded border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200"
                       />
                    </div>
                 </div>
                 <div className="space-y-1.5">
                    <div className="text-[10px] font-bold text-neutral-500 uppercase">Case Folder</div>
                    <div className="flex items-center space-x-2">
                       <input
                         type="text"
                         value={caseDirInput}
                         onChange={(e) => handleCaseDirChange(e.target.value)}
                         onBlur={handleCaseDirBlur}
                         placeholder="e.g. One-liner to BO/cases/..."
                         className="w-full px-2.5 py-1 text-xs font-mono rounded border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-500 transition-colors"
                       />
                    </div>
                 </div>
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
                 <p className="text-xs text-rose-700 dark:text-rose-400 font-semibold">{executionError}</p>
                 {missingRequiredList && missingRequiredList.length > 0 && (
                    <div className="pt-1.5">
                      <p className="text-[11px] font-bold text-rose-800 dark:text-rose-300">Required data sources:</p>
                      <ul className="list-disc list-inside text-[11px] text-rose-600 dark:text-rose-400 pt-0.5 space-y-0.5 font-mono">
                        {missingRequiredList.map((d: string, i: number) => (
                          <li key={i}>{d}</li>
                        ))}
                      </ul>
                    </div>
                 )}
               </div>
             </div>
          </div>
        )}

        {/* Evaluation Result Area / Input Table Explorer */}
        {(executionResult || (activeTableType === 'input' && selectedInputSource)) && !executionError && (
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm overflow-hidden flex flex-col transition-colors">
            {/* Header / Banner (Only when executionResult exists) */}
            {executionResult && (
            <div className={`px-5 py-4 border-b ${
                 (executionResult.evaluationResult?.toUpperCase() === 'PASS' || executionResult.status?.toUpperCase() === 'PASS' || executionResult.runStatus?.toUpperCase() === 'COMPLETED')
                   ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/50'
                   : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/50'
               } flex flex-col sm:flex-row sm:items-center justify-between gap-4`}
            >
              <div className="flex items-center space-x-3">
                 <h2 className={`text-sm font-bold ${
                   (executionResult.evaluationResult?.toUpperCase() === 'PASS' || executionResult.status?.toUpperCase() === 'PASS' || executionResult.runStatus?.toUpperCase() === 'COMPLETED')
                     ? 'text-emerald-800 dark:text-emerald-400'
                     : 'text-rose-800 dark:text-rose-400'
                 }`}>
                   {executionResult.evaluationResult || executionResult.status || executionResult.runStatus || 'COMPLETED'}
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
            )}

            <div className="p-5 space-y-6">
              {/* 1. Run Report Table: columns Class, Status, Rows, Notes / Error */}
              {runReport.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Layers className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <h4 className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                        Run Report
                      </h4>
                    </div>
                    <span className="text-[10px] text-neutral-500 font-medium">
                      {runReport.length} {runReport.length === 1 ? 'class' : 'classes'} evaluated
                    </span>
                  </div>

                  <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden text-[11px] shadow-sm">
                    <table className="w-full text-left">
                      <thead className="bg-neutral-50 dark:bg-neutral-800/80 text-neutral-600 dark:text-neutral-400 font-semibold uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="p-3 border-b border-neutral-200 dark:border-neutral-700/60">Class</th>
                          <th className="p-3 border-b border-neutral-200 dark:border-neutral-700/60 text-center">Status</th>
                          <th className="p-3 border-b border-neutral-200 dark:border-neutral-700/60 text-right">Rows</th>
                          <th className="p-3 border-b border-neutral-200 dark:border-neutral-700/60">Notes / Error</th>
                          <th className="p-3 border-b border-neutral-200 dark:border-neutral-700/60 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300">
                        {runReport.map((row: any, i: number) => {
                          const isOk = row.status === 'OK';
                          const isEmpty = row.status === 'EMPTY';
                          const isFailed = row.status === 'FAILED';
                          const isSelected = selectedClass === row.className;
                          return (
                            <tr 
                              key={i} 
                              onClick={() => handleSelectClass(row.className)}
                              className={`transition-colors hover:bg-neutral-50/80 dark:hover:bg-neutral-800/50 cursor-pointer ${isSelected ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''}`}
                            >
                              <td className="p-3">
                                <div className="flex items-center space-x-2">
                                  <span className="font-mono font-semibold text-neutral-900 dark:text-neutral-100">{row.className}</span>
                          {row.dataSource && (
                            <span className="text-[10px] text-neutral-400 font-normal">({row.dataSource})</span>
                          )}
                                  {isSelected && (
                                    <span className="px-1.5 py-0.2 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 rounded text-[9px] font-bold">
                                      Active
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="p-3 text-center">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                  isOk 
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60'
                                    : isEmpty
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/60'
                                    : 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/60'
                                }`}>
                                  {row.status}
                                </span>
                              </td>
                              <td className="p-3 text-right font-mono font-semibold text-neutral-900 dark:text-neutral-100">
                                {Number(row.rows).toLocaleString()}
                              </td>
                              <td className="p-3 text-xs text-neutral-600 dark:text-neutral-400 truncate max-w-xs font-mono" title={row.notes}>
                        <div className="max-w-md truncate">
                          {row.notes || (isOk ? (row.dataSource ? `Generated from ${row.dataSource}` : 'Execution passed') : '-')}
                        </div>
                              </td>
                              <td className="p-3 text-center">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelectClass(row.className);
                                  }}
                                  className="inline-flex items-center space-x-1 px-2.5 py-1 text-[10px] font-semibold text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800/60 rounded-md transition-colors cursor-pointer"
                                >
                                  <Eye className="h-3 w-3" />
                                  <span>Inspect</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Differences Section */}
              {((executionResult.evaluationResult?.toUpperCase() === 'FAIL' || executionResult.status?.toUpperCase() === 'FAIL') && (filteredDiffs.length > 0 || executionResult.differences)) && (
                <div className="bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 rounded-xl p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                      <h4 className="text-xs font-bold text-rose-800 dark:text-rose-300 uppercase tracking-wider">
                        Differences {selectedClass !== 'ALL' && selectedClass !== 'Export' ? `(${selectedClass})` : `(${filteredDiffs.length || 'Detected'})`}
                      </h4>
                    </div>
                    <div className="flex items-center space-x-3 text-[11px]">
                      {selectedClass !== 'ALL' && selectedClass !== 'Export' && (
                        <button
                          type="button"
                          onClick={() => handleSelectClass('Export')}
                          className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200 underline cursor-pointer"
                        >
                          View export diffs
                        </button>
                      )}
                      {filteredDiffs.length > 25 && (
                        <button 
                          type="button"
                          onClick={() => setShowAllDiffs(!showAllDiffs)} 
                          className="text-blue-600 hover:underline cursor-pointer font-medium"
                        >
                          {showAllDiffs ? 'Show less' : `Show all (${filteredDiffs.length})`}
                        </button>
                      )}
                    </div>
                  </div>
                  <pre className="text-[11px] font-mono text-rose-800 dark:text-rose-300 bg-white/70 dark:bg-neutral-950/60 p-3.5 rounded-lg border border-rose-200/60 dark:border-rose-900/40 whitespace-pre-wrap leading-relaxed max-h-[300px] overflow-auto">
                    {filteredDiffs.length > 0
                      ? JSON.stringify(showAllDiffs ? filteredDiffs : filteredDiffs.slice(0, 25), null, 2)
                      : Array.isArray(executionResult.differences) 
                        ? JSON.stringify(showAllDiffs ? executionResult.differences : executionResult.differences.slice(0, 25), null, 2) 
                        : typeof executionResult.differences === 'object' ? JSON.stringify(executionResult.differences, null, 2) : executionResult.differences}
                  </pre>
                </div>
              )}

              {/* 2. Output Table Explorer (shows exportRows by default, or selected class rows) */}
              <div ref={viewerSectionRef} className="space-y-3 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <Database className="h-4 w-4 text-neutral-700 dark:text-neutral-300" />
                    <div>
                      <h4 className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                        {activeTableType === 'input'
                          ? `Input Table (${selectedInputSource})`
                          : `Output Table ${selectedClass ? `(${selectedClass})` : ''}`}
                      </h4>
                      <p className="text-[10px] text-neutral-500">
                        {activeTableType === 'input'
                          ? `Records fetched from SchemaControlledDataProcess/input for ${selectedInputSource}`
                          : 'Filter and inspect records in table or raw JSON format'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Class Selection Pills */}
                <div className="flex flex-wrap items-center gap-1.5 p-2 bg-neutral-100/70 dark:bg-neutral-800/50 rounded-xl border border-neutral-200/80 dark:border-neutral-700/60">
                  <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider pl-1 pr-2 flex items-center space-x-1">
                    <span>View:</span>
                  </span>

                  {/* Export Class Pill */}
                  <button
                    type="button"
                    onClick={() => handleSelectClass('Export')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 cursor-pointer ${
                      activeTableType === 'output' && selectedClass === 'Export'
                        ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-500/20'
                        : 'bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700/80 border border-neutral-200 dark:border-neutral-700'
                    }`}
                  >
                    <span>Export Rows</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      selectedClass === 'Export'
                        ? 'bg-blue-700 text-white'
                        : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300'
                    }`}>
                      {exportRows.length}
                    </span>
                  </button>

                  {/* Individual Class Pills from Run Report */}
                  {availableClasses.map((clsName) => {
                    const repItem = runReport.find(r => r.className.toLowerCase() === clsName.toLowerCase());
                    const count = repItem?.rows ?? 0;
                    const isSelected = activeTableType === 'output' && selectedClass === clsName;

                    return (
                      <button
                        key={clsName}
                        type="button"
                        onClick={() => handleSelectClass(clsName)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-500/20'
                            : 'bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700/80 border border-neutral-200 dark:border-neutral-700'
                        }`}
                      >
                        <span className="font-mono">{clsName}</span>
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                          isSelected
                            ? 'bg-blue-700 text-white'
                            : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300'
                        }`}>
                          {count}
                        </span>
                        {repItem && repItem.status === 'FAILED' && (
                          <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-amber-300' : 'bg-rose-500'}`} title="Status: FAILED" />
                        )}
                      </button>
                    );
                  })}

                  {/* Generated Input Pills */}
                  {inputFilesList.map((file: any) => {
                    const sName = file.source || file.name;
                    const isSelected = activeTableType === 'input' && selectedInputSource === sName;
                    return (
                      <button
                        key={file.name}
                        type="button"
                        onClick={() => handleSelectInputSource(sName)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-500/20'
                            : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800/60'
                        }`}
                      >
                        <span className="font-mono">Input: {sName}</span>
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                          isSelected
                            ? 'bg-emerald-700 text-white'
                            : 'bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200'
                        }`}>
                          {file.rows}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Explorer Viewer Container */}
                <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-sm bg-white dark:bg-neutral-900">
                  {/* Toolbar Bar */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 bg-neutral-50 dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-800">
                    {/* View Tabs */}
                    <div className="flex items-center space-x-1">
                      <button
                        type="button"
                        onClick={() => { setResultViewerTab('actual'); setPage(1); }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1.5 cursor-pointer ${
                          resultViewerTab === 'actual'
                            ? 'bg-white dark:bg-neutral-900 text-blue-600 dark:text-blue-400 shadow-sm border border-neutral-200/80 dark:border-neutral-700'
                            : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200'
                        }`}
                      >
                        <span>
                          {activeTableType === 'input'
                            ? `Input: ${selectedInputSource}`
                            : selectedClass === 'Export'
                            ? 'Export Rows'
                            : `${selectedClass} Output`}
                        </span>
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200/60 dark:border-neutral-700/60">
                          {activeRecords.length}
                        </span>
                      </button>

                      {currentClassExpectedRecords.length > 0 && (
                        <button
                          type="button"
                          onClick={() => { setResultViewerTab('expected'); setPage(1); }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1.5 cursor-pointer ${
                            resultViewerTab === 'expected'
                              ? 'bg-white dark:bg-neutral-900 text-blue-600 dark:text-blue-400 shadow-sm border border-neutral-200/80 dark:border-neutral-700'
                              : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200'
                          }`}
                        >
                          <span>Expected Output</span>
                          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200/60 dark:border-neutral-700/60">
                            {currentClassExpectedRecords.length}
                          </span>
                        </button>
                      )}

                      {filteredDiffs.length > 0 && (
                        <button
                          type="button"
                          onClick={() => { setResultViewerTab('diffs'); }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1.5 cursor-pointer ${
                            resultViewerTab === 'diffs'
                              ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 shadow-sm border border-rose-200 dark:border-rose-900/50'
                              : 'text-rose-600/80 hover:text-rose-700 dark:text-rose-400/80 dark:hover:text-rose-300'
                          }`}
                        >
                          <span>Differences</span>
                          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300">
                            {filteredDiffs.length}
                          </span>
                        </button>
                      )}
                    </div>

                    {/* Search and Display Mode Controls */}
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Search records */}
                      <div className="relative">
                        <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                          placeholder="Search records..."
                          className="pl-8 pr-7 py-1 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-blue-500 w-36 sm:w-48"
                        />
                        {searchQuery && (
                          <button
                            type="button"
                            onClick={() => { setSearchQuery(''); setPage(1); }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>

                      {/* View Mode Toggle */}
                      <div className="flex items-center bg-neutral-200/70 dark:bg-neutral-800 p-0.5 rounded-lg border border-neutral-300/60 dark:border-neutral-700">
                        <button
                          type="button"
                          onClick={() => setViewMode('table')}
                          title="Table View"
                          className={`p-1 sm:px-2 sm:py-1 rounded-md text-[11px] font-semibold flex items-center space-x-1 cursor-pointer transition-colors ${
                            viewMode === 'table'
                              ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
                          }`}
                        >
                          <TableIcon className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Table</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setViewMode('json')}
                          title="JSON View"
                          className={`p-1 sm:px-2 sm:py-1 rounded-md text-[11px] font-semibold flex items-center space-x-1 cursor-pointer transition-colors ${
                            viewMode === 'json'
                              ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
                          }`}
                        >
                          <CodeIcon className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">JSON</span>
                        </button>
                      </div>

                      {/* Copy and Download buttons */}
                      <button
                        type="button"
                        onClick={handleCopyClassOutput}
                        title="Copy records to clipboard"
                        className="flex items-center space-x-1 px-2.5 py-1 bg-white dark:bg-neutral-800 text-neutral-700 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white rounded-lg border border-neutral-200 dark:border-neutral-700 text-[11px] font-medium transition-colors cursor-pointer"
                      >
                        {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                        <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleDownloadClassOutput}
                        title="Download JSON file"
                        className="flex items-center space-x-1 px-2.5 py-1 bg-white dark:bg-neutral-800 text-neutral-700 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white rounded-lg border border-neutral-200 dark:border-neutral-700 text-[11px] font-medium transition-colors cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Export</span>
                      </button>
                    </div>
                  </div>

                  {/* Explorer Content */}
                  <div>
                    {resultViewerTab === 'diffs' ? (
                      <div className="p-4 bg-rose-50/30 dark:bg-neutral-950 max-h-[500px] overflow-auto">
                        <pre className="text-[11px] font-mono text-rose-700 dark:text-rose-400 whitespace-pre-wrap leading-relaxed">
                          {JSON.stringify(filteredDiffs, null, 2)}
                        </pre>
                      </div>
                    ) : viewMode === 'table' ? (
                      <div>
                        {filteredRecords.length === 0 ? (
                          <div className="p-10 text-center text-neutral-500 dark:text-neutral-400 space-y-2">
                            <FileText className="h-8 w-8 mx-auto text-neutral-400 dark:text-neutral-600 opacity-60" />
                            <p className="text-xs font-semibold">
                              No records found for &quot;{selectedClass}&quot;
                              {searchQuery ? ` matching "${searchQuery}"` : ''}
                            </p>
                            <p className="text-[11px] text-neutral-400">
                              Try selecting another class or switching to JSON view
                            </p>
                          </div>
                        ) : (
                          <div>
                            <div className="overflow-x-auto max-h-[520px]">
                              <table className="w-full text-left border-collapse text-[11px]">
                                <thead className="bg-neutral-100 dark:bg-neutral-800/90 text-neutral-600 dark:text-neutral-400 font-semibold uppercase text-[10px] tracking-wider sticky top-0 z-10 shadow-xs">
                                  <tr>
                                    <th className="py-2.5 px-3 border-b border-neutral-200 dark:border-neutral-700 text-center w-12 bg-neutral-100 dark:bg-neutral-800">
                                      #
                                    </th>
                                    {tableColumns.map((col) => (
                                      <th
                                        key={col}
                                        className="py-2.5 px-3 border-b border-neutral-200 dark:border-neutral-700 whitespace-nowrap bg-neutral-100 dark:bg-neutral-800"
                                      >
                                        {col}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 font-mono">
                                  {paginatedRecords.map((row: any, idx: number) => {
                                    const rowIndex = (page - 1) * pageSize + idx + 1;
                                    return (
                                      <tr
                                        key={idx}
                                        className="hover:bg-blue-50/40 dark:hover:bg-neutral-800/60 transition-colors"
                                      >
                                        <td className="py-2 px-3 text-center text-[10px] text-neutral-400 font-sans border-r border-neutral-100 dark:border-neutral-800/60">
                                          {rowIndex}
                                        </td>
                                        {tableColumns.map((col) => {
                                          const val = row[col];
                                          let displayVal = '-';
                                          if (val !== undefined && val !== null) {
                                            displayVal = typeof val === 'object' ? JSON.stringify(val) : String(val);
                                          }

                                          const isKeyCol = col === 'schemaname' || col === 'schema' || col === 'className';
                                          const isIdCol = col === 'lineid' || col === 'documentnumber' || col === 'gstin';
                                          const isAmountCol = col.toLowerCase().includes('tax') || col.toLowerCase().includes('amount') || col.toLowerCase().includes('value');

                                          return (
                                            <td
                                              key={col}
                                              className="py-2 px-3 whitespace-nowrap max-w-xs truncate"
                                              title={displayVal}
                                            >
                                              {isKeyCol ? (
                                                <span className="px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded font-semibold text-[10px]">
                                                  {displayVal}
                                                </span>
                                              ) : isIdCol ? (
                                                <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                                                  {displayVal}
                                                </span>
                                              ) : isAmountCol && !isNaN(Number(displayVal)) ? (
                                                <span className="font-medium text-emerald-700 dark:text-emerald-400">
                                                  {Number(displayVal).toLocaleString()}
                                                </span>
                                              ) : (
                                                <span>{displayVal}</span>
                                              )}
                                            </td>
                                          );
                                        })}
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>

                            {/* Pagination Controls */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-neutral-50 dark:bg-neutral-800/50 border-t border-neutral-200 dark:border-neutral-800 text-xs text-neutral-600 dark:text-neutral-400 font-sans">
                              <div>
                                Showing <span className="font-semibold font-mono">{(page - 1) * pageSize + 1}</span> to{' '}
                                <span className="font-semibold font-mono">
                                  {Math.min(page * pageSize, filteredRecords.length)}
                                </span>{' '}
                                of <span className="font-semibold font-mono">{filteredRecords.length}</span> records
                                {filteredRecords.length !== currentClassRecords.length && (
                                  <span className="ml-1 text-[11px] text-neutral-400">
                                    (filtered from {currentClassRecords.length})
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center space-x-2">
                                <button
                                  type="button"
                                  disabled={page <= 1}
                                  onClick={() => setPage(p => Math.max(1, p - 1))}
                                  className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer text-xs"
                                >
                                  <ChevronLeft className="h-3.5 w-3.5" />
                                  <span>Prev</span>
                                </button>

                                <span className="text-xs font-mono font-medium px-2">
                                  Page {page} of {totalPages}
                                </span>

                                <button
                                  type="button"
                                  disabled={page >= totalPages}
                                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                  className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer text-xs"
                                >
                                  <span>Next</span>
                                  <ChevronRight className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* JSON View */
                      <div className="p-3 bg-neutral-950 max-h-[520px] overflow-auto">
                        <pre className="text-[11px] font-mono text-neutral-200 whitespace-pre-wrap leading-relaxed">
                          {inputs?.expectedOutput?._type === 'file' && resultViewerTab === 'expected' && selectedClass === 'ALL'
                            ? `[Attached Expected Output File: ${inputs.expectedOutput.name}]\nType: ${inputs.expectedOutput.type}\nSize: ${inputs.expectedOutput.size} bytes`
                            : JSON.stringify(filteredRecords, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
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
           autoTriggeredRef.current = true;
           updateWorkflowField('finalOutputInputs', newInputs);
           setIsModalOpen(false);
           executeSchema(newInputs);
        }}
      />
      <GenerationProcessingModal isOpen={isExecuting} operationLabel="Executing Schema..." />

      {/* Execution Error Popup Modal */}
      {showErrorPopup && executionError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl w-full max-w-md shadow-2xl p-5 flex flex-col space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-full bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Execution Failed</h3>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">Schema execution encountered an error</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowErrorPopup(false)}
                className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl text-xs text-rose-800 dark:text-rose-300 font-mono leading-relaxed max-h-48 overflow-y-auto">
              {executionError}
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => setShowErrorPopup(false)}
                className="px-4 py-2 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                Dismiss
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowErrorPopup(false);
                  setIsModalOpen(true);
                }}
                className="px-4 py-2 text-xs font-bold bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-900 rounded-lg transition-colors cursor-pointer"
              >
                Change Inputs
              </button>
              {inputs && (
                <button
                  type="button"
                  onClick={() => {
                    setShowErrorPopup(false);
                    executeSchema(inputs);
                  }}
                  className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors cursor-pointer"
                >
                  Retry
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
