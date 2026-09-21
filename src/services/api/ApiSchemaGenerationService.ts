import { ISchemaGenerationService, ProgressCallback } from '../interfaces';
import { RequirementsModel, SchemaClass, SchemaModel, SchemaTreeNode, SchemaValidationResult } from '../../types';

export class ApiSchemaGenerationService implements ISchemaGenerationService {
  private apiUrl: string;

  constructor(apiUrl?: string) {
    this.apiUrl = apiUrl || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
  }

  async generateSchema(
    requirements: RequirementsModel,
    classes: SchemaClass[],
    onProgress?: ProgressCallback
  ): Promise<SchemaModel> {
    if (onProgress) {
      onProgress({
        id: 'schema-init',
        status: 'active',
        label: 'Connecting to backend...',
        detail: 'Sending generate schema request'
      });
    }

    const response = await fetch(`${this.apiUrl}/generate/schema`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requirements, classes }),
    });

    if (!response.ok) {
      throw new Error(`Failed to generate schema: ${response.statusText}`);
    }

    const data = await response.json();
    const rawSchema = data.schema || data.result || data;

    if (onProgress) {
      onProgress({
        id: 'schema-done',
        status: 'done',
        label: 'Schema generated successfully',
      });
    }

    // Map the backend root tree to frontend SchemaTreeNode format if it differs
    const mapTreeNodes = (nodes: any[]): SchemaTreeNode[] => {
      if (!nodes || !Array.isArray(nodes)) return [];
      return nodes.map(node => ({
        title: node.title || node.name || 'Unknown Node',
        technicalName: node.technicalName || node.technical_name || node.technical || '',
        val: node.val || node.value || undefined,
        equality: node.equality || undefined,
        children: mapTreeNodes(node.children || []),
        expanded: node.expanded || false
      }));
    };

    const rootNodes = mapTreeNodes(Array.isArray(rawSchema) ? rawSchema : (rawSchema.root || []));
    const rawJsonStr = typeof rawSchema === 'string' ? rawSchema : JSON.stringify(rawSchema, null, 2);

    return {
      schemaGroupName: rawSchema.schemaGroupName || rawSchema.schema_group_name || 'Generated Schema',
      root: rootNodes,
      rawJson: rawJsonStr,
      generatedAt: rawSchema.generatedAt || new Date().toISOString(),
      version: rawSchema.version || '1.0',
      stats: rawSchema.stats || {
        classCount: classes.length,
        componentCount: classes.reduce((acc, cls) => acc + (cls.components?.length || 0), 0),
        fieldCount: 0,
        formulaCount: classes.reduce((acc, cls) => acc + (cls.formulaRules?.length || 0), 0),
      },
      validationResult: rawSchema.validationResult || {
        isValid: true,
        errors: [],
        warnings: [],
        stats: {
          totalClasses: classes.length,
          totalComponents: 0,
          totalFields: 0,
          totalLookupRules: 0
        }
      } as SchemaValidationResult
    } as SchemaModel;
  }
}
