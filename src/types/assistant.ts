import { WorkflowStage } from './workflow';
import { RequirementsModel } from './requirements';
import { SchemaClass } from './classes';
import { SchemaModel } from './schema';

export interface AssistantContext {
  stage: WorkflowStage;
  requirements?: RequirementsModel;
  classes?: SchemaClass[];
  schema?: SchemaModel;
  activeEntityId?: string;
  activeEntityType?: 'problem-statement' | 'objective' | 'requirement' | 'class' | 'schema-node' | null;
  runId?: string;
}

export interface AssistantSuggestedAction {
  label: string;
  actionType: 'insert-text' | 'refine-requirement' | 'highlight-class' | 'jump-to-stage' | 'explain-concept';
  payload?: any;
}

export interface AssistantMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  stageContext: WorkflowStage;
  suggestedActions?: AssistantSuggestedAction[];
  isThought?: boolean;
}

export interface AssistantResponse {
  message: string;
  suggestedActions?: AssistantSuggestedAction[];
  contextInsights?: string[];
  success?: boolean;
  filesModified?: boolean;
}
