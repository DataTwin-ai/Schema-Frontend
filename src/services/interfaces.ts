import {
  BusinessInput,
  RequirementsModel,
  SchemaClass,
  SchemaModel,
  GenerationProgressStep,
  AssistantContext,
  AssistantResponse,
  GenerationCost,
  SupportingDocument,
  User,
  HistoryRecord,
  RequirementVersion,
  ClassVersion,
  SchemaVersion,
} from '../types';

export interface ProgressCallback {
  (step: GenerationProgressStep): void;
}

export interface IRequirementsGenerationService {
  generateBusinessRequirement(
    highLevelInput: string,
    supportingDocs: SupportingDocument[],
    onProgress?: ProgressCallback,
    onOperationStarted?: (operationId: string) => void
  ): Promise<{ resultText: string; runId: string }>;

  generateRequirements(input: BusinessInput, runId?: string, onProgress?: ProgressCallback, onOperationStarted?: (operationId: string) => void): Promise<RequirementsModel>;
}

export interface IClassGenerationService {
  generateClasses(requirements: RequirementsModel, runId?: string, onProgress?: ProgressCallback, onOperationStarted?: (operationId: string) => void): Promise<SchemaClass[]>;
}

export interface ISchemaGenerationService {
  generateSchema(requirements: RequirementsModel, classes: SchemaClass[], runId?: string, onProgress?: ProgressCallback, onOperationStarted?: (operationId: string) => void): Promise<SchemaModel>;
}

export interface IAssistantService {
  respond(
    message: string,
    context: AssistantContext
  ): Promise<AssistantResponse>;
}

export interface IPricingService {
  getEstimatedCost(context?: {
    businessInput?: BusinessInput;
    requirements?: RequirementsModel;
    classes?: SchemaClass[];
    schema?: SchemaModel;
  }): Promise<GenerationCost>;
}

export interface IAuthService {
  login(email: string, password: string): Promise<{ success: boolean; user?: User; error?: string }>;
  logout(): Promise<void>;
  getCurrentUser(): Promise<User | null>;
  isAuthenticated(): Promise<boolean>;
}

export interface IHistoryService {
  listSchemas(): Promise<HistoryRecord[]>;
  getSchema(id: string): Promise<HistoryRecord | null>;
  saveSchema(record: HistoryRecord): Promise<HistoryRecord>;
  createVersion(id: string, newVersion: string): Promise<HistoryRecord>;
  deleteSchema(id: string): Promise<boolean>;
}

export interface IRequirementHistoryService {
  getVersions(requirementId: string): Promise<RequirementVersion[]>;
  recordVersion(version: Omit<RequirementVersion, 'id' | 'versionNumber'>): Promise<RequirementVersion>;
  getAllVersions(): Promise<Record<string, RequirementVersion[]>>;
}

export interface IClassHistoryService {
  getVersions(classId: string): Promise<ClassVersion[]>;
  recordVersion(version: Omit<ClassVersion, 'id' | 'versionNumber'>): Promise<ClassVersion>;
  getAllVersions(): Promise<Record<string, ClassVersion[]>>;
}

export interface ISchemaHistoryService {
  getVersions(): Promise<SchemaVersion[]>;
  recordVersion(version: Omit<SchemaVersion, 'id' | 'versionNumber'>): Promise<SchemaVersion>;
}


