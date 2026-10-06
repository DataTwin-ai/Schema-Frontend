import { RequirementsModel } from './requirements';
import { SchemaClass } from './classes';
import { SchemaModel } from './schema';

export type WorkflowStage =
  | 'business-input'
  | 'requirements'
  | 'classes'
  | 'classes'

  | 'schema'
  | 'output';

export type RunStatus = 'DRAFT' | 'COMPLETED' | 'FAILED';

export type GenerationStatus = 'idle' | 'generating' | 'completed' | 'error';

export interface GenerationProgressStep {
  id: string;
  label: string;
  detail?: string;
  status: 'pending' | 'active' | 'done' | 'error';
}

export interface SupportingDocument {
  id: string;
  name: string;
  type: string;
  size: number;
  status: 'uploaded' | 'processing' | 'processed' | 'error';
  uploadedAt: string;
  previewText?: string;
}

export interface AttachedInfoFile {
  name: string;
  size?: number;
  type?: string;
  rawFile?: File;
}

export interface AdditionalInformation {
  id: string;
  category: 'business' | 'finance' | 'technical' | 'rule' | 'constraint' | 'note';
  content: string;
  files?: AttachedInfoFile[];
  createdAt: string;
  author?: string;
}

export interface AdditionalRequirement {
  id: string;
  fileName: string;
  content: string;
  sourceScreen: string;
  uploadedAt?: string;
}

export interface BusinessInput {
  highLevelRequirement: string;
  generatedBusinessRequirement?: string;
  isBusinessRequirementGenerated?: boolean;
  supportingDocuments: SupportingDocument[];
  additionalInstructions: string;
}


export interface ClassPlanTrigger {
  id: string;
  description?: string;
  included?: boolean;
  votes?: number;
  totalVotes?: number;
}

export interface PlannedClass {
  order: number;
  className: string;
  datasource: string;
  triggerId: string;
  evidenceQuote?: string;
}

export interface ClassPlan {
  locked?: boolean;
  plannedClasses: PlannedClass[];
  uncertainTriggers?: ClassPlanTrigger[];
}

export interface SchemaGenerationWorkflow {

  id: string;
  displayName?: string;
  lastDraftSavedAt?: string;
  title: string;
  domain: string;
  stage: WorkflowStage;
  runStatus: RunStatus;
  businessInput: BusinessInput;
  requirements?: RequirementsModel;
  classes?: SchemaClass[];
  classPlan?: ClassPlan;
  schema?: SchemaModel;
  additionalInformation: AdditionalInformation[];
  additionalRequirements?: AdditionalRequirement[];
  finalOutputInputs?: {
    eventJson: any;
    expectedOutput: any;
    schemaKey: string;
    uploadSchema: boolean;
    eventFileName?: string;
    expectedFileName?: string;
    confirmOverwrite?: boolean;
  };
  generationStatus: GenerationStatus;
  currentProgressSteps: GenerationProgressStep[];
  updatedAt: string;
  runId?: string;
  lastError?: string;
  caseName?: string;
}
