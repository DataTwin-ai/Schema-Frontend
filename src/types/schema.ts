export interface SchemaTreeNode {
  title: string;
  technicalName: string;
  val?: string;
  equality?: string;
  children?: SchemaTreeNode[];
  expanded?: boolean;
}

export interface SchemaValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    totalClasses: number;
    totalComponents: number;
    totalFields: number;
    totalLookupRules: number;
  };
}

export interface SchemaModel {
  schemaGroupName: string;
  root: SchemaTreeNode[];
  rawJson: string;
  classes?: any[];
  generatedAt: string;
  version: string;
  stats: {
    classCount: number;
    componentCount: number;
    fieldCount: number;
    formulaCount: number;
  };
  validationResult: SchemaValidationResult;
}

export interface SchemaVersion {
  id: string;
  versionNumber: number;
  schemaGroupName: string;
  rawJson: string;
  classes?: any[];
  timestamp: string;
  actor: string;
  changeSummary?: string;
}
