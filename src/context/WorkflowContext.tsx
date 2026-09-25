'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  WorkflowStage,
  GenerationStatus,
  GenerationProgressStep,
  SupportingDocument,
  AdditionalInformation,
  BusinessInput,
  RequirementsModel,
  SchemaClass,
  SchemaModel,
  SchemaGenerationWorkflow,
  AssistantMessage,
  AssistantSuggestedAction,
  ProblemStatement,
  BusinessObjective,
  BusinessRequirement,
  FinanceRequirement,
  TechnicalRequirement,
  GenerationCost,
  HistoryRecord,
  RequirementVersion,
  ClassVersion,
  SchemaVersion,
  AdditionalRequirement,
  RunStatus,
} from '../types';
import { sampleBusinessInput } from '../fixtures/sampleInput.fixture';
import { 
  requirementsService, 
  classService, 
  schemaService, 
  assistantService, 
  pricingService, 
  historyService,
  requirementHistoryService,
  classHistoryService,
  schemaHistoryService,
} from '../services';
import { formatClassSpecification } from '../utils/classUtils';

interface WorkflowContextValue {
  workflow: SchemaGenerationWorkflow;
  setWorkflow: React.Dispatch<React.SetStateAction<SchemaGenerationWorkflow>>;
  setStage: (stage: WorkflowStage) => void;
  updateBusinessInput: (updates: Partial<BusinessInput>) => void;
  loadSampleInput: () => void;
  addSupportingDocument: (doc: SupportingDocument) => void;
  removeSupportingDocument: (id: string) => void;
  updateSupportingDocument: (id: string, updates: Partial<SupportingDocument>) => void;
  
  // App View Navigation
  activeView: 'generator' | 'history';
  setActiveView: (view: 'generator' | 'history') => void;

  // History & Edit Mode
  currentHistoryRecord: HistoryRecord | null;
  isEditMode: boolean;
  loadHistorySchema: (record: HistoryRecord) => void;
  startNewSchema: () => void;
  saveToHistory: () => Promise<HistoryRecord>;

  // Requirement-Level Version Comparison & History
  requirementVersions: Record<string, RequirementVersion[]>;
  getRequirementVersions: (reqIdOrCode: string) => RequirementVersion[];
  recordRequirementVersion: (version: Omit<RequirementVersion, 'id' | 'versionNumber'>) => Promise<RequirementVersion>;

  // Class-Level Version Comparison & History
  classVersions: Record<string, ClassVersion[]>;
  getClassVersions: (classIdOrNumber: string) => ClassVersion[];
  recordClassVersion: (version: Omit<ClassVersion, 'id' | 'versionNumber'>) => Promise<ClassVersion>;

  // Schema-Level Version Comparison & History
  schemaVersions: SchemaVersion[];
  getSchemaVersions: () => SchemaVersion[];
  recordSchemaVersion: (version: Omit<SchemaVersion, 'id' | 'versionNumber'>) => Promise<SchemaVersion>;

  // Theme
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;


  // Generation cost
  generationCost: GenerationCost;

  // Generation methods
  generateBusinessRequirement: () => Promise<void>;
  generateRequirements: () => Promise<void>;
  generateClasses: () => Promise<void>;
  generateSchema: () => Promise<void>;
  isGeneratingModalOpen: boolean;
  closeGeneratingModal: () => void;
  generationOperationLabel: string;
  setGenerationOperationLabel: (label: string) => void;
  
  activeOperation: {
    operationId: string;
    type: string;
    status: 'RUNNING' | 'PAUSE_REQUESTED' | 'PAUSED' | 'RESUME_REQUESTED' | 'STOP_REQUESTED' | 'STOPPED' | 'COMPLETED' | 'FAILED';
    message?: string;
    progress?: number;
    error?: string;
  } | null;
  setActiveOperation: (op: any) => void;

  // Requirements updates
  updateProblemStatement: (id: string, updated: Partial<ProblemStatement>) => void;
  updateBusinessObjective: (id: string, updated: Partial<BusinessObjective>) => void;
  updateBusinessRequirement: (id: string, updated: Partial<BusinessRequirement>) => void;
  addBusinessRequirement: (req: { title: string; category?: string; description: string; code?: string; derivedFromBoCode?: string }) => void;
  updateFinanceRequirement: (id: string, updated: Partial<FinanceRequirement>) => void;
  updateTechnicalRequirement: (id: string, updated: Partial<TechnicalRequirement>) => void;
  addAdditionalInformation: (info: Omit<AdditionalInformation, 'id' | 'createdAt'>) => void;
  removeAdditionalInformation: (id: string) => void;
  // Additional Requirements
  additionalRequirements: AdditionalRequirement[];
  addAdditionalRequirement: (req: Omit<AdditionalRequirement, 'id' | 'uploadedAt'>) => void;
  removeAdditionalRequirement: (id: string) => void;
  clearAdditionalRequirements: () => void;

  // Classes updates
  updateClass: (id: string, updated: Partial<SchemaClass>) => void;
  addClass: (newClass: SchemaClass) => void;
  removeClass: (id: string) => void;

  // Schema updates
  editedSchemaJson: string;
  setEditedSchemaJson: (json: string) => void;
  saveSchemaChanges: () => { success: boolean; error?: string };
  downloadSchemaJson: () => void;
  copySchemaJson: () => Promise<boolean>;

  // Assistant Chat (User-Initiated Only)
  assistantMessages: AssistantMessage[];
  isAssistantThinking: boolean;
  sendAssistantMessage: (text: string) => Promise<void>;
  handleAssistantAction: (action: AssistantSuggestedAction) => void;
  clearAssistantChat: () => void;

  // Global reset
  resetWorkflow: () => void;

  // History Load
  loadHistoricalSchemaForEdit: (historyDetail: any) => void;

  setRunStatus: (status: RunStatus) => void;
}

const initialWorkflow: SchemaGenerationWorkflow = {
  id: 'wf-current',
  title: 'Accounts Payable & Prepaid Expense Allocation',
  domain: 'Accounts Payable and Expense Allocation',
  stage: 'business-input',
  runStatus: 'DRAFT',
  businessInput: {
    highLevelRequirement: '',
    generatedBusinessRequirement: '',
    isBusinessRequirementGenerated: false,
    supportingDocuments: [],
    additionalInstructions: '',
  },
  additionalInformation: [],
  additionalRequirements: [],
  generationStatus: 'idle',
  currentProgressSteps: [],
  updatedAt: new Date().toISOString(),
};

const initialGenerationCost: GenerationCost = {
  amount: 0,
  currency: 'INR',
  currencySymbol: '₹',
  formattedAmount: '—',
  isEstimate: true,
  source: 'DataTwin Standard Tier SCDP Pricing',
};

const WorkflowContext = createContext<WorkflowContextValue | undefined>(undefined);

export const WorkflowProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [workflow, setWorkflow] = useState<SchemaGenerationWorkflow>(initialWorkflow);
  const [editedSchemaJson, setEditedSchemaJson] = useState<string>('');
  const [isGeneratingModalOpen, setIsGeneratingModalOpen] = useState<boolean>(false);
  const [generationOperationLabel, setGenerationOperationLabel] = useState<string>('Generating…');
  const [theme, setThemeState] = useState<'light' | 'dark'>('light');
  const [generationCost, setGenerationCost] = useState<GenerationCost>(initialGenerationCost);

  // App Navigation & History Edit State
  const [activeView, setActiveView] = useState<'generator' | 'history'>('generator');
  const [currentHistoryRecord, setCurrentHistoryRecord] = useState<HistoryRecord | null>(null);
  
  const [activeOperation, setActiveOperation] = useState<any>(null);

  // Requirement-Level Version History State
  const [requirementVersions, setRequirementVersions] = useState<Record<string, RequirementVersion[]>>({});

  useEffect(() => {
    requirementHistoryService.getAllVersions().then((versions) => {
      setRequirementVersions(versions);
    });
  }, []);

  const getRequirementVersions = useCallback(
    (reqIdOrCode: string): RequirementVersion[] => {
      if (!reqIdOrCode) return [];
      const key = reqIdOrCode.toLowerCase();
      if (requirementVersions[reqIdOrCode]) return requirementVersions[reqIdOrCode];
      if (requirementVersions[key]) return requirementVersions[key];
      for (const [k, v] of Object.entries(requirementVersions)) {
        if (k.toLowerCase() === key) return v;
        if (
          v.length > 0 &&
          (v[0].requirementId.toLowerCase() === key || v[0].requirementCode.toLowerCase() === key)
        ) {
          return v;
        }
      }
      return [];
    },
    [requirementVersions]
  );

  const recordRequirementVersion = useCallback(
    async (version: Omit<RequirementVersion, 'id' | 'versionNumber'>): Promise<RequirementVersion> => {
      const newV = await requirementHistoryService.recordVersion(version);
      setRequirementVersions((prev) => ({
        ...prev,
        [version.requirementId]: [...(prev[version.requirementId] || []), newV],
        [version.requirementCode]: [...(prev[version.requirementCode] || []), newV],
      }));
      return newV;
    },
    []
  );

  // Class-Level Version History State
  const [classVersions, setClassVersions] = useState<Record<string, ClassVersion[]>>({});

  useEffect(() => {
    classHistoryService.getAllVersions().then((versions) => {
      setClassVersions(versions);
    });
  }, []);

  const getClassVersions = useCallback(
    (classIdOrNumber: string): ClassVersion[] => {
      if (!classIdOrNumber) return [];
      const key = classIdOrNumber.toLowerCase();
      if (classVersions[classIdOrNumber]) return classVersions[classIdOrNumber];
      if (classVersions[key]) return classVersions[key];
      for (const [k, v] of Object.entries(classVersions)) {
        if (k.toLowerCase() === key) return v;
        if (
          v.length > 0 &&
          (v[0].classId.toLowerCase() === key ||
            `class-${v[0].classNumber}`.toLowerCase() === key ||
            v[0].className.toLowerCase() === key)
        ) {
          return v;
        }
      }
      return [];
    },
    [classVersions]
  );

  const recordClassVersion = useCallback(
    async (version: Omit<ClassVersion, 'id' | 'versionNumber'>): Promise<ClassVersion> => {
      const newV = await classHistoryService.recordVersion(version);
      setClassVersions((prev) => ({
        ...prev,
        [version.classId]: [...(prev[version.classId] || []), newV],
        [`class-${version.classNumber}`]: [...(prev[`class-${version.classNumber}`] || []), newV],
      }));
      return newV;
    },
    []
  );

  // Schema-Level Version History State
  const [schemaVersions, setSchemaVersions] = useState<SchemaVersion[]>([]);

  useEffect(() => {
    schemaHistoryService.getVersions().then((versions) => {
      setSchemaVersions(versions);
    });
  }, []);

  const getSchemaVersions = useCallback((): SchemaVersion[] => {
    return schemaVersions;
  }, [schemaVersions]);

  const recordSchemaVersion = useCallback(
    async (version: Omit<SchemaVersion, 'id' | 'versionNumber'>): Promise<SchemaVersion> => {
      const newV = await schemaHistoryService.recordVersion(version);
      setSchemaVersions((prev) => [...prev, newV]);
      return newV;
    },
    []
  );

  // Assistant Messages — Starts empty, responded ONLY upon explicit user interaction
  const [assistantMessages, setAssistantMessages] = useState<AssistantMessage[]>([]);
  const [isAssistantThinking, setIsAssistantThinking] = useState<boolean>(false);


  // Initialize theme from localStorage, default to 'light'
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('datatwin_theme') as 'light' | 'dark' | null;
      if (savedTheme === 'dark' || savedTheme === 'light') {
        setThemeState(savedTheme);
        if (savedTheme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      } else {
        setThemeState('light');
        document.documentElement.classList.remove('dark');
      }
    } catch {
      setThemeState('light');
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const setTheme = useCallback((newTheme: 'light' | 'dark') => {
    setThemeState(newTheme);
    try {
      localStorage.setItem('datatwin_theme', newTheme);
    } catch {}
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prevTheme) => {
      const nextTheme = prevTheme === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem('datatwin_theme', nextTheme);
      } catch {}
      if (nextTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return nextTheme;
    });
  }, []);

  // Update generation cost dynamically from pricingService
  useEffect(() => {
    pricingService
      .getEstimatedCost({
        businessInput: workflow.businessInput,
        requirements: workflow.requirements,
        classes: workflow.classes,
        schema: workflow.schema,
      })
      .then((cost) => setGenerationCost(cost))
      .catch(() => {});
  }, [
    workflow.businessInput.isBusinessRequirementGenerated,
    workflow.businessInput.generatedBusinessRequirement,
    workflow.requirements,
    workflow.classes,
    workflow.schema,
  ]);

  const setStage = useCallback((stage: WorkflowStage) => {
    setWorkflow((prev) => ({ ...prev, stage, updatedAt: new Date().toISOString() }));
  }, []);

  const setRunStatus = useCallback((status: RunStatus) => {
    setWorkflow((prev) => ({ ...prev, runStatus: status, updatedAt: new Date().toISOString() }));
  }, []);

  const updateBusinessInput = useCallback((updates: Partial<BusinessInput>) => {
    setWorkflow((prev) => ({
      ...prev,
      businessInput: { ...prev.businessInput, ...updates },
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const loadSampleInput = useCallback(() => {
    setWorkflow((prev) => ({
      ...prev,
      businessInput: JSON.parse(JSON.stringify(sampleBusinessInput)),
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const addSupportingDocument = useCallback((doc: SupportingDocument) => {
    setWorkflow((prev) => ({
      ...prev,
      businessInput: {
        ...prev.businessInput,
        supportingDocuments: [...prev.businessInput.supportingDocuments, doc],
      },
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const removeSupportingDocument = useCallback((id: string) => {
    setWorkflow((prev) => ({
      ...prev,
      businessInput: {
        ...prev.businessInput,
        supportingDocuments: prev.businessInput.supportingDocuments.filter((d) => d.id !== id),
      },
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const updateSupportingDocument = useCallback((id: string, updates: Partial<SupportingDocument>) => {
    setWorkflow((prev) => ({
      ...prev,
      businessInput: {
        ...prev.businessInput,
        supportingDocuments: prev.businessInput.supportingDocuments.map((d) =>
          d.id === id ? { ...d, ...updates } : d
        ),
      },
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  // History & Edit Mode Handlers
  const loadHistorySchema = useCallback((record: HistoryRecord) => {
    const loadedState = JSON.parse(JSON.stringify(record.workflowState)) as SchemaGenerationWorkflow;
    setWorkflow(loadedState);
    if (loadedState.schema) {
      setEditedSchemaJson(loadedState.schema.rawJson);
    } else {
      setEditedSchemaJson('');
    }
    setCurrentHistoryRecord(record);
    setActiveView('generator');
  }, []);

  const startNewSchema = useCallback(() => {
    setWorkflow(initialWorkflow);
    setEditedSchemaJson('');
    setCurrentHistoryRecord(null);
    setGenerationCost(initialGenerationCost);
    setActiveView('generator');
  }, []);

  const loadHistoricalSchemaForEdit = useCallback((historyDetail: any) => {
    console.log('[HISTORY FE] Restoring schema:', !!historyDetail.schema);
    
    // Parse the schema
    let parsedSchema = historyDetail.schema;
    if (parsedSchema && parsedSchema.root) {
      console.log('[HISTORY FE] Restored root count:', parsedSchema.root.length);
    }
    
    // Load workflowState if available, otherwise just use basic data
    const ws = historyDetail.workflowState || {};
    
    setWorkflow((prev) => ({
      ...prev,
      id: historyDetail.runId || prev.id,
      runStatus: historyDetail.status || prev.runStatus,
      title: historyDetail.schemaGroupName || prev.title,
      domain: historyDetail.schemaGroupName || prev.domain,
      classes: parsedSchema?.root || prev.classes,
      schema: parsedSchema || prev.schema,
      stage: 'schema', // Always navigate to schema studio when opening a run, per reqs
      businessInput: ws.businessInput || prev.businessInput,
      additionalInformation: ws.additionalInformation || prev.additionalInformation,
      additionalRequirements: ws.additionalRequirements || prev.additionalRequirements,
    }));
    
    if (parsedSchema) {
      setEditedSchemaJson(JSON.stringify(parsedSchema, null, 2));
    }
    
    console.log('[HISTORY FE] Navigating to: schema-studio');
    setActiveView('generator');
  }, []);

  const saveToHistory = useCallback(async (): Promise<HistoryRecord> => {
    const record: HistoryRecord = {
      id: currentHistoryRecord ? currentHistoryRecord.id : `hist-${Date.now()}`,
      name: workflow.title || 'Untitled SCDP Schema',
      domain: workflow.domain || 'Financial Operations',
      description: workflow.businessInput.highLevelRequirement || 'Custom generated SCDP schema.',
      status: workflow.runStatus === 'COMPLETED' ? 'Completed' : (workflow.runStatus === 'FAILED' ? 'Failed' : 'Draft'),
      version: currentHistoryRecord ? currentHistoryRecord.version : 'v1.0',
      classCount: workflow.classes?.length || 0,
      componentCount: workflow.schema?.stats.componentCount || 0,
      createdAt: currentHistoryRecord ? currentHistoryRecord.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      workflowState: workflow,
    };

    const saved = await historyService.saveSchema(record);
    setCurrentHistoryRecord(saved);
    return saved;
  }, [workflow, currentHistoryRecord]);

  // Generation 1: High-Level Business Requirement -> Detailed Business Requirement
  const generateBusinessRequirement = useCallback(async () => {
    setGenerationOperationLabel('Generating Business Requirement…');
    setIsGeneratingModalOpen(true);
    setWorkflow((prev: SchemaGenerationWorkflow) => ({
      ...prev,
      generationStatus: 'generating',
      currentProgressSteps: [],
    }));

    try {
      const { resultText: generatedText, runId } = await requirementsService.generateBusinessRequirement(
        workflow.businessInput.highLevelRequirement,
        workflow.businessInput.supportingDocuments,
        (step: GenerationProgressStep) => {
          setWorkflow((prev: SchemaGenerationWorkflow) => {
            const existingIdx = prev.currentProgressSteps.findIndex((s) => s.id === step.id);
            const newSteps = [...prev.currentProgressSteps];
            if (existingIdx >= 0) {
              newSteps[existingIdx] = step;
            } else {
              newSteps.push(step);
            }
            return { ...prev, currentProgressSteps: newSteps };
          });
        },
        (operationId: string) => {
          setActiveOperation({
            operationId,
            type: 'generate-business-requirement',
            status: 'RUNNING',
            message: 'Generating Business Requirement…'
          });
        }
      );


            if (!generatedText || generatedText.trim() === '') {
        throw new Error("Received empty generatedBusinessRequirement from service.");
      }

      setWorkflow((prev: SchemaGenerationWorkflow) => ({
        ...prev,
        runId,
        businessInput: {
          ...prev.businessInput,
          generatedBusinessRequirement: generatedText,
          isBusinessRequirementGenerated: true,
        },
        generationStatus: 'completed',
        updatedAt: new Date().toISOString(),
      }));
      setTimeout(() => setIsGeneratingModalOpen(false), 1500);
    } catch (err: any) {
      console.error(err);
      if (err.message === "Another generation is running") {
        alert("Another generation is running");
        setIsGeneratingModalOpen(false);
      } else if (err.name === 'StoppedError') {
        alert("Generation stopped");
        setIsGeneratingModalOpen(false);
        setActiveOperation(null);
      } else {
        setWorkflow((prev: SchemaGenerationWorkflow) => ({ ...prev, generationStatus: 'error', runStatus: 'FAILED' }));
        setActiveOperation((prev: any) => prev ? { ...prev, status: 'FAILED', error: err.message } : { operationId: 'local', status: 'FAILED', message: 'Failed', error: err.message } as any);
      }
    }
  }, [workflow.businessInput]);

  // Generation 2: Reviewed Business Requirement -> Structured Requirements
  const generateRequirements = useCallback(async () => {
    setGenerationOperationLabel('Generating Requirements…');
    setIsGeneratingModalOpen(true);
    setWorkflow((prev: SchemaGenerationWorkflow) => ({
      ...prev,
      generationStatus: 'generating',
      currentProgressSteps: [],
    }));

    try {
      const result = await requirementsService.generateRequirements(
        workflow.businessInput,
        workflow.runId,
        (step: GenerationProgressStep) => {
          setWorkflow((prev: SchemaGenerationWorkflow) => {
            const existingIdx = prev.currentProgressSteps.findIndex((s) => s.id === step.id);
            const newSteps = [...prev.currentProgressSteps];
            if (existingIdx >= 0) {
              newSteps[existingIdx] = step;
            } else {
              newSteps.push(step);
            }
            return { ...prev, currentProgressSteps: newSteps };
          });
        },
        (operationId: string) => {
          setActiveOperation({
            operationId,
            type: 'generate-requirements',
            status: 'RUNNING',
            message: 'Generating Requirements…'
          });
        }
      );

      setWorkflow((prev: SchemaGenerationWorkflow) => ({
        ...prev,
        requirements: result,
        stage: 'requirements',
        generationStatus: 'completed',
        updatedAt: new Date().toISOString(),
      }));
      setTimeout(() => setIsGeneratingModalOpen(false), 1500);
    } catch (err: any) {
      console.error(err);
      if (err.message === "Another generation is running") {
        alert("Another generation is running");
        setIsGeneratingModalOpen(false);
      } else if (err.name === 'StoppedError') {
        alert("Generation stopped");
        setIsGeneratingModalOpen(false);
        setActiveOperation(null);
      } else {
        setWorkflow((prev: SchemaGenerationWorkflow) => ({ ...prev, generationStatus: 'error', runStatus: 'FAILED' }));
        setActiveOperation((prev: any) => prev ? { ...prev, status: 'FAILED', error: err.message } : { operationId: 'local', status: 'FAILED', message: 'Failed', error: err.message } as any);
      }
    }
  }, [workflow.businessInput]);

  // Generation 3: Classes
  const generateClasses = useCallback(async () => {
    if (!workflow.requirements) return;
    setGenerationOperationLabel('Generating Schema Classes…');
    setIsGeneratingModalOpen(true);
    setWorkflow((prev: SchemaGenerationWorkflow) => ({
      ...prev,
      generationStatus: 'generating',
      currentProgressSteps: [],
    }));

    try {
      const result = await classService.generateClasses(
        workflow.requirements,
        workflow.runId,
        (step: GenerationProgressStep) => {
          setWorkflow((prev: SchemaGenerationWorkflow) => {
            const existingIdx = prev.currentProgressSteps.findIndex((s) => s.id === step.id);
            const newSteps = [...prev.currentProgressSteps];
            if (existingIdx >= 0) {
              newSteps[existingIdx] = step;
            } else {
              newSteps.push(step);
            }
            return { ...prev, currentProgressSteps: newSteps };
          });
        },
        (operationId: string) => {
          setActiveOperation({
            operationId,
            type: 'generate-classes',
            status: 'RUNNING',
            message: 'Generating Schema Classes…'
          });
        }
      );

      if (!result || result.length === 0) {
        throw new Error("No classes generated");
      }

      setWorkflow((prev: SchemaGenerationWorkflow) => ({
        ...prev,
        classes: result,
        stage: 'classes',
        generationStatus: 'completed',
        updatedAt: new Date().toISOString(),
      }));
      setTimeout(() => setIsGeneratingModalOpen(false), 1500);
    } catch (err: any) {
      console.error(err);
      if (err.message === "Another generation is running") {
        alert("Another generation is running");
        setIsGeneratingModalOpen(false);
      } else if (err.name === 'StoppedError') {
        alert("Generation stopped");
        setIsGeneratingModalOpen(false);
        setActiveOperation(null);
      } else {
        setWorkflow((prev: SchemaGenerationWorkflow) => ({ ...prev, generationStatus: 'error', runStatus: 'FAILED' }));
        setActiveOperation((prev: any) => prev ? { ...prev, status: 'FAILED', error: err.message } : { operationId: 'local', status: 'FAILED', message: 'Failed', error: err.message } as any);
      }
    }
  }, [workflow.requirements]);

  // Generation 4: Schema
  const generateSchema = useCallback(async () => {
    if (!workflow.requirements || !workflow.classes) return;
    setGenerationOperationLabel('Generating Schema…');
    setIsGeneratingModalOpen(true);
    setWorkflow((prev: SchemaGenerationWorkflow) => ({
      ...prev,
      generationStatus: 'generating',
      currentProgressSteps: [],
    }));

    try {
      const result = await schemaService.generateSchema(
        workflow.requirements,
        workflow.classes,
        workflow.runId,
        (step: GenerationProgressStep) => {
          setWorkflow((prev: SchemaGenerationWorkflow) => {
            const existingIdx = prev.currentProgressSteps.findIndex((s) => s.id === step.id);
            const newSteps = [...prev.currentProgressSteps];
            if (existingIdx >= 0) {
              newSteps[existingIdx] = step;
            } else {
              newSteps.push(step);
            }
            return { ...prev, currentProgressSteps: newSteps };
          });
        },
        (operationId: string) => {
          setActiveOperation({
            operationId,
            type: 'generate-schema',
            status: 'RUNNING',
            message: 'Generating Schema…'
          });
        }
      );

      setWorkflow((prev: SchemaGenerationWorkflow) => ({
        ...prev,
        schema: result,
        stage: 'schema',
        generationStatus: 'completed',
        updatedAt: new Date().toISOString(),
      }));
      setEditedSchemaJson(result.rawJson);
      setTimeout(() => setIsGeneratingModalOpen(false), 1500);
    } catch (err: any) {
      console.error(err);
      if (err.message === "Another generation is running") {
        alert("Another generation is running");
        setIsGeneratingModalOpen(false);
      } else if (err.name === 'StoppedError') {
        alert("Generation stopped");
        setIsGeneratingModalOpen(false);
        setActiveOperation(null);
      } else {
        setWorkflow((prev: SchemaGenerationWorkflow) => ({ ...prev, generationStatus: 'error', runStatus: 'FAILED' }));
        setActiveOperation((prev: any) => prev ? { ...prev, status: 'FAILED', error: err.message } : { operationId: 'local', status: 'FAILED', message: 'Failed', error: err.message } as any);
      }
    }
  }, [workflow.requirements, workflow.classes]);

  const closeGeneratingModal = useCallback(() => {
    setIsGeneratingModalOpen(false);
  }, []);

  // Helper to record prior state in history before overwrite
  const capturePriorVersion = useCallback((
    reqId: string, 
    reqCode: string, 
    title: string, 
    description: string, 
    changeSummary: string = 'Requirement content edited'
  ) => {
    requirementHistoryService.recordVersion({
      requirementId: reqId,
      requirementCode: reqCode,
      title,
      description,
      actor: 'Logaprasanth (User)',
      timestamp: new Date().toLocaleString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }),
      changeType: 'EDIT',
      changeSummary,
    }).then((newV) => {
      setRequirementVersions((prevMap) => ({
        ...prevMap,
        [reqId]: [...(prevMap[reqId] || []), newV],
        [reqCode]: [...(prevMap[reqCode] || []), newV],
      }));
    });
  }, []);

  // Requirements Update Handlers
  const updateProblemStatement = useCallback((id: string, updated: Partial<ProblemStatement>) => {
    setWorkflow((prev) => {
      if (!prev.requirements) return prev;
      const currentItem = prev.requirements.problemStatements.find((item) => item.id === id);
      if (currentItem && (updated.title !== undefined || updated.description !== undefined)) {
        capturePriorVersion(currentItem.id, currentItem.code, currentItem.title, currentItem.description);
      }
      return {
        ...prev,
        requirements: {
          ...prev.requirements,
          problemStatements: prev.requirements.problemStatements.map((item) =>
            item.id === id ? { ...item, ...updated, isAiGenerated: false } : item
          ),
          lastEditedAt: new Date().toISOString(),
        },
        updatedAt: new Date().toISOString(),
      };
    });
  }, [capturePriorVersion]);

  const updateBusinessObjective = useCallback((id: string, updated: Partial<BusinessObjective>) => {
    setWorkflow((prev) => {
      if (!prev.requirements) return prev;
      const currentItem = prev.requirements.businessObjectives.find((item) => item.id === id);
      if (currentItem && (updated.title !== undefined || updated.description !== undefined)) {
        capturePriorVersion(currentItem.id, currentItem.code, currentItem.title, currentItem.description);
      }
      return {
        ...prev,
        requirements: {
          ...prev.requirements,
          businessObjectives: prev.requirements.businessObjectives.map((item) =>
            item.id === id ? { ...item, ...updated, isAiGenerated: false } : item
          ),
          lastEditedAt: new Date().toISOString(),
        },
        updatedAt: new Date().toISOString(),
      };
    });
  }, [capturePriorVersion]);

  const updateBusinessRequirement = useCallback((id: string, updated: Partial<BusinessRequirement>) => {
    setWorkflow((prev) => {
      if (!prev.requirements) return prev;
      const currentItem = prev.requirements.businessRequirements.find((item) => item.id === id);
      if (currentItem && (updated.title !== undefined || updated.description !== undefined)) {
        capturePriorVersion(currentItem.id, currentItem.code, currentItem.title, currentItem.description);
      }
      return {
        ...prev,
        requirements: {
          ...prev.requirements,
          businessRequirements: prev.requirements.businessRequirements.map((item) =>
            item.id === id ? { ...item, ...updated, isAiGenerated: false } : item
          ),
          lastEditedAt: new Date().toISOString(),
        },
        updatedAt: new Date().toISOString(),
      };
    });
  }, [capturePriorVersion]);

  const addBusinessRequirement = useCallback((newReq: { title: string; category?: string; description: string; code?: string; derivedFromBoCode?: string }) => {
    setWorkflow((prev) => {
      if (!prev.requirements) return prev;
      const count = prev.requirements.businessRequirements.length + 1;
      const code = newReq.code || `BR-${String(count).padStart(3, '0')}`;
      const item: BusinessRequirement = {
        id: `br-${Date.now()}`,
        code,
        title: newReq.title,
        category: newReq.category || 'Business Logic',
        derivedFromBoCode: newReq.derivedFromBoCode || 'BO-001',
        description: newReq.description,
        isAiGenerated: false,
      };
      return {
        ...prev,
        requirements: {
          ...prev.requirements,
          businessRequirements: [...prev.requirements.businessRequirements, item],
          lastEditedAt: new Date().toISOString(),
        },
        updatedAt: new Date().toISOString(),
      };
    });
  }, []);

  const updateFinanceRequirement = useCallback((id: string, updated: Partial<FinanceRequirement>) => {
    setWorkflow((prev) => {
      if (!prev.requirements) return prev;
      const currentItem = prev.requirements.financeRequirements.find((item) => item.id === id);
      if (currentItem && (updated.title !== undefined || updated.description !== undefined)) {
        capturePriorVersion(currentItem.id, currentItem.code, currentItem.title, currentItem.description);
      }
      return {
        ...prev,
        requirements: {
          ...prev.requirements,
          financeRequirements: prev.requirements.financeRequirements.map((item) =>
            item.id === id ? { ...item, ...updated, isAiGenerated: false } : item
          ),
          lastEditedAt: new Date().toISOString(),
        },
        updatedAt: new Date().toISOString(),
      };
    });
  }, [capturePriorVersion]);

  const updateTechnicalRequirement = useCallback((id: string, updated: Partial<TechnicalRequirement>) => {
    setWorkflow((prev) => {
      if (!prev.requirements) return prev;
      const currentItem = prev.requirements.technicalRequirements.find((item) => item.id === id);
      if (currentItem && (updated.title !== undefined || updated.description !== undefined)) {
        capturePriorVersion(currentItem.id, currentItem.code, currentItem.title, currentItem.description);
      }
      return {
        ...prev,
        requirements: {
          ...prev.requirements,
          technicalRequirements: prev.requirements.technicalRequirements.map((item) =>
            item.id === id ? { ...item, ...updated, isAiGenerated: false } : item
          ),
          lastEditedAt: new Date().toISOString(),
        },
        updatedAt: new Date().toISOString(),
      };
    });
  }, [capturePriorVersion]);


  const addAdditionalInformation = useCallback((info: Omit<AdditionalInformation, 'id' | 'createdAt'>) => {
    const newEntry: AdditionalInformation = {
      ...info,
      id: `add-info-${Date.now()}`,
      createdAt: new Date().toISOString(),
      author: info.author || 'Logaprasanth (User)',
    };
    setWorkflow((prev) => ({
      ...prev,
      additionalInformation: [...prev.additionalInformation, newEntry],
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const removeAdditionalInformation = useCallback((id: string) => {
    setWorkflow((prev) => ({
      ...prev,
      additionalInformation: prev.additionalInformation.filter((item) => item.id !== id),
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  // Helper to record prior state of a class before overwrite
  const capturePriorClassVersion = useCallback((
    cls: SchemaClass,
    changeSummary: string = 'Domain class configuration edited'
  ) => {
    classHistoryService.recordVersion({
      classId: cls.id,
      classNumber: cls.classNumber,
      className: cls.className,
      title: `Class #${cls.classNumber} · ${cls.className}`,
      purpose: cls.purpose,
      datasource: cls.datasource,
      grain: cls.grain,
      specification: formatClassSpecification(cls),
      actor: 'Logaprasanth (User)',
      timestamp: new Date().toLocaleString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }),
      changeType: 'EDIT',
      changeSummary,
    }).then((newV) => {
      setClassVersions((prevMap) => ({
        ...prevMap,
        [cls.id]: [...(prevMap[cls.id] || []), newV],
        [`class-${cls.classNumber}`]: [...(prevMap[`class-${cls.classNumber}`] || []), newV],
      }));
    });
  }, []);

  // Classes Update Handlers
  const updateClass = useCallback((id: string, updated: Partial<SchemaClass>) => {
    setWorkflow((prev) => {
      if (!prev.classes) return prev;
      const currentCls = prev.classes.find((c) => c.id === id);
      if (currentCls) {
        capturePriorClassVersion(currentCls);
      }
      return {
        ...prev,
        classes: prev.classes.map((cls) => (cls.id === id ? { ...cls, ...updated } : cls)),
        updatedAt: new Date().toISOString(),
      };
    });
  }, [capturePriorClassVersion]);

  const addClass = useCallback((newClass: SchemaClass) => {
    setWorkflow((prev) => ({
      ...prev,
      classes: [...(prev.classes || []), newClass],
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  // Additional Requirements Handlers
  const addAdditionalRequirement = useCallback((req: Omit<AdditionalRequirement, 'id' | 'uploadedAt'>) => {
    const newReq: AdditionalRequirement = {
      ...req,
      id: `add-req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      uploadedAt: new Date().toISOString(),
    };
    setWorkflow((prev) => ({
      ...prev,
      additionalRequirements: [...(prev.additionalRequirements || []), newReq],
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const removeAdditionalRequirement = useCallback((id: string) => {
    setWorkflow((prev) => ({
      ...prev,
      additionalRequirements: (prev.additionalRequirements || []).filter((r) => r.id !== id),
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const clearAdditionalRequirements = useCallback(() => {
    setWorkflow((prev) => ({
      ...prev,
      additionalRequirements: [],
      updatedAt: new Date().toISOString(),
    }));
  }, []);

    const removeClass = useCallback((id: string) => {
    setWorkflow((prev) => {
      if (!prev.classes) return prev;
      return {
        ...prev,
        classes: prev.classes.filter((cls) => cls.id !== id),
        updatedAt: new Date().toISOString(),
      };
    });
  }, []);

  // Schema Save & Download Handlers
  const saveSchemaChanges = useCallback((): { success: boolean; error?: string } => {
    try {
      const parsed = JSON.parse(editedSchemaJson);
      
      // Capture prior schema version before updating
      if (workflow.schema && workflow.schema.rawJson && workflow.schema.rawJson !== editedSchemaJson) {
        recordSchemaVersion({
          schemaGroupName: workflow.schema.schemaGroupName || 'SCDP Generated Schema',
          rawJson: workflow.schema.rawJson,
          timestamp: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) + ' · ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          actor: 'Logaprasanth (User)',
          changeSummary: 'Direct edits saved in Schema Studio',
        });
      }

      setWorkflow((prev) => {
        if (!prev.schema) return prev;
        const updatedWorkflow = {
          ...prev,
          schema: {
            ...prev.schema,
            root: parsed,
            rawJson: editedSchemaJson,
            generatedAt: new Date().toISOString(),
          },
          updatedAt: new Date().toISOString(),
        };
        // If in edit mode, sync to history record
        if (currentHistoryRecord) {
          historyService.saveSchema({
            ...currentHistoryRecord,
            workflowState: updatedWorkflow,
            updatedAt: new Date().toISOString(),
          }).catch(() => {});
        }
        return updatedWorkflow;
      });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Invalid JSON format' };
    }
  }, [editedSchemaJson, currentHistoryRecord, workflow.schema, recordSchemaVersion]);

  const downloadSchemaJson = useCallback(() => {
    const jsonString = editedSchemaJson || (workflow.schema ? workflow.schema.rawJson : JSON.stringify(workflow, null, 2));
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `DataTwin-Schema-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [editedSchemaJson, workflow]);

  const copySchemaJson = useCallback(async (): Promise<boolean> => {
    try {
      const jsonString = editedSchemaJson || (workflow.schema ? workflow.schema.rawJson : '');
      await navigator.clipboard.writeText(jsonString);
      return true;
    } catch {
      return false;
    }
  }, [editedSchemaJson, workflow.schema]);

  // Assistant Chat Handlers (User-Initiated Only)
  const sendAssistantMessage = useCallback(async (text: string) => {
    const userMsg: AssistantMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      stageContext: workflow.stage,
    };

    setAssistantMessages((prev) => [...prev, userMsg]);
    setIsAssistantThinking(true);

    try {
      const resp = await assistantService.respond(text, {
        stage: workflow.stage,
        requirements: workflow.requirements,
        classes: workflow.classes,
        schema: workflow.schema,
      });

      const assistantMsg: AssistantMessage = {
        id: `ast-${Date.now()}`,
        sender: 'assistant',
        content: resp.message,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        stageContext: workflow.stage,
        suggestedActions: resp.suggestedActions,
      };

      setAssistantMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAssistantThinking(false);
    }
  }, [workflow]);

  const handleAssistantAction = useCallback((action: AssistantSuggestedAction) => {
    if (action.actionType === 'insert-text') {
      loadSampleInput();
    } else if (action.actionType === 'jump-to-stage' && action.payload) {
      setStage(action.payload as WorkflowStage);
    } else if (action.actionType === 'explain-concept' || action.actionType === 'refine-requirement') {
      sendAssistantMessage(action.label);
    }
  }, [loadSampleInput, setStage, sendAssistantMessage]);

  const clearAssistantChat = useCallback(() => {
    setAssistantMessages([]);
  }, []);

  const resetWorkflow = useCallback(() => {
    setWorkflow(initialWorkflow);
    setEditedSchemaJson('');
    setCurrentHistoryRecord(null);
    setGenerationCost(initialGenerationCost);
    // Do NOT insert automatic assistant messages on reset!
  }, []);

  return (
    <WorkflowContext.Provider
      value={{
        workflow,
        setWorkflow,
        setStage,
        setRunStatus,
        updateBusinessInput,
        loadSampleInput,
        addSupportingDocument,
        removeSupportingDocument,
        updateSupportingDocument,
        activeView,
        setActiveView,
        currentHistoryRecord,
        isEditMode: !!currentHistoryRecord,
        loadHistorySchema,
        startNewSchema,
        saveToHistory,
        requirementVersions,
        getRequirementVersions,
        recordRequirementVersion,
        classVersions,
        getClassVersions,
        recordClassVersion,
        schemaVersions,
        getSchemaVersions,
        recordSchemaVersion,
        theme,
        setTheme,

        toggleTheme,
        generationCost,
        generateBusinessRequirement,
        generateRequirements,
        generateClasses,
        generateSchema,
        isGeneratingModalOpen,
        closeGeneratingModal,
        generationOperationLabel,
        setGenerationOperationLabel,
        activeOperation,
        setActiveOperation,
        updateProblemStatement,
        updateBusinessObjective,
        updateBusinessRequirement,
        addBusinessRequirement,
        updateFinanceRequirement,
        updateTechnicalRequirement,
        addAdditionalInformation,
        removeAdditionalInformation,
        additionalRequirements: workflow.additionalRequirements || [],
        addAdditionalRequirement,
        removeAdditionalRequirement,
        clearAdditionalRequirements,
        updateClass,
        addClass,
        removeClass,
        editedSchemaJson,
        setEditedSchemaJson,
        saveSchemaChanges,
        downloadSchemaJson,
        copySchemaJson,
        assistantMessages,
        isAssistantThinking,
        sendAssistantMessage,
        handleAssistantAction,
        clearAssistantChat,
        resetWorkflow,
        loadHistoricalSchemaForEdit,
      }}
    >
      {children}
    </WorkflowContext.Provider>
  );
};

export const useWorkflow = () => {
  const context = useContext(WorkflowContext);
  if (!context) {
    throw new Error('useWorkflow must be used within a WorkflowProvider');
  }
  return context;
};



