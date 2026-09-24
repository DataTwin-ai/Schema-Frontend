import { SchemaGenerationWorkflow } from './workflow';

export type HistoryStatus = 'Draft' | 'Completed' | 'In Review' | 'Archived' | 'Failed';

export interface HistoryRecord {
  id: string;
  name: string;
  domain: string;
  description: string;
  status: HistoryStatus;
  version: string;
  classCount: number;
  componentCount: number;
  createdAt: string;
  updatedAt: string;
  workflowState: SchemaGenerationWorkflow;
}
