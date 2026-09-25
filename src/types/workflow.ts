import { RequirementsModel } from './requirements';
import { SchemaClass } from './classes';
import { SchemaModel } from './schema';

export type WorkflowStage =
  | 'business-input'
  | 'requirements'
  | 'scdp-input'
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

export interface SchemaGenerationWorkflow {
  id: string;
  title: string;
  domain: string;
  stage: WorkflowStage;
  runStatus: RunStatus;
  businessInput: BusinessInput;
  requirements?: RequirementsModel;
  classes?: SchemaClass[];
  schema?: SchemaModel;
  additionalInformation: AdditionalInformation[];
  additionalRequirements?: AdditionalRequirement[];
  generationStatus: GenerationStatus;
  currentProgressSteps: GenerationProgressStep[];
  updatedAt: string;
  runId?: string;
  lastError?: string;
  caseName?: string;
}
