export interface SchemaComponent {
  id: string;
  name: string;
  type: 'MATH' | 'FETCHFROMSCHEMA' | 'SUMFROMSCHEMA' | 'GETGROUPFROMSCHEMA2' | string;
  sourceClass?: string;
  sourceColumn?: string;
  expression?: string;
  condition?: string;
  description?: string;
}

export interface SchemaClass {
  id: string;
  classNumber: number;
  className: string;
  purpose: string;
  datasource: string;
  grain: string;
  classLevelFields: string[];
  lookupRules: string[];
  formulaRules: string[];
  components: SchemaComponent[];
  criteria: string[];
  conditions: string[];
  expectedOutput: string;
  dependencies: string[];
  exposes: string[];
  reviewPoints: string;
  associatedRequirements?: string[];
  metadata?: Record<string, unknown>;
  isCustomAdded?: boolean;
  rawText?: string;
}

export interface ClassVersion {
  id: string;
  classId: string;
  classNumber: number;
  className: string;
  versionNumber: number;
  title: string;
  purpose: string;
  datasource: string;
  grain: string;
  specification: string;
  actor: string;
  timestamp: string;
  changeType?: 'INITIAL_GENERATION' | 'EDIT' | 'REGENERATION' | string;
  changeSummary: string;
}
