import { ISchemaGenerationService, ProgressCallback } from '../interfaces';
import { RequirementsModel, SchemaClass, SchemaModel, SchemaTreeNode, SchemaValidationResult } from '../../types';

const POLL_INTERVAL_MS = 1500;

export class ApiSchemaGenerationService implements ISchemaGenerationService {
  private apiUrl: string;

  constructor(apiUrl?: string) {
    this.apiUrl = apiUrl || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
  }

  async generateSchema(
    requirements: RequirementsModel,
    classes: SchemaClass[],
    onProgress?: ProgressCallback,
    onOperationStarted?: (operationId: string) => void
  ): Promise<SchemaModel> {
    if (onProgress) {
      onProgress({ id: 'schema-init', status: 'active', label: 'Connecting to backend...', detail: 'Sending generate schema request' });
    }

    const response = await fetch(`${this.apiUrl}/generate/schema`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requirements, classes }),
    });

    if (!response.ok) {
      throw new Error(`Failed to generate schema: ${response.statusText}`);
    }

    const initData = await response.json();

    // New async flow: backend returns { operationId, status: 'RUNNING' }
    if (initData.operationId) {
      const operationId: string = initData.operationId;
      if (onOperationStarted) onOperationStarted(operationId);

      while (true) {
        await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));

        const baseUrl = this.apiUrl.endsWith('/api') ? this.apiUrl.slice(0, -4) : this.apiUrl;
        const statusRes = await fetch(`${baseUrl}/api/operations/${operationId}/status`);
        if (!statusRes.ok) throw new Error('Failed to poll operation status');

        const statusData = await statusRes.json();

        if (onProgress) {
          onProgress({
            id: 'schema-progress',
            status: 'active',
            label: `Generating Schema... (${statusData.status})`,
            detail: statusData.progress ? `Step ${statusData.progress.current} of ${statusData.progress.total}` : '',
          });
        }

        if (statusData.status === 'COMPLETED') {
          const rawSchema = statusData.schema || statusData.result || statusData;
          return this.buildSchemaModel(rawSchema, classes);
        }

        if (statusData.status === 'STOPPED') throw new Error('Schema generation was stopped by user');
        if (statusData.status === 'FAILED') throw new Error(statusData.error || 'Schema generation failed');
      }
    }

    // Legacy synchronous fallback
    const rawSchema = initData.schema || initData.result || initData;
    return this.buildSchemaModel(rawSchema, classes);
  }

  private buildSchemaModel(rawSchema: any, classes: SchemaClass[]): SchemaModel {
    // Build SchemaTreeNode[] from any JSON value, recursively.
    // This handles any structure the backend returns — SCDP objects, arrays, scalars.
    const buildTreeFromJson = (value: any, label: string, depth = 0): SchemaTreeNode => {
      if (value === null || value === undefined) {
        return {
          title: label,
          technicalName: label,
          val: String(value),
          children: [],
        };
      }

      if (typeof value !== 'object') {
        // Scalar: string, number, boolean
        return {
          title: label,
          technicalName: label,
          val: String(value),
          children: [],
        };
      }

      if (Array.isArray(value)) {
        // Array: render each element as a child
        return {
          title: `${label} (${value.length})`,
          technicalName: label,
          children: value.map((item, idx) => {
            // If item is an object with a name or title field, use it
            const childLabel =
              item?.title ||
              item?.name ||
              item?.class_name ||
              item?.className ||
              item?.technicalName ||
              item?.technical_name ||
              `[${idx}]`;
            return buildTreeFromJson(item, String(childLabel), depth + 1);
          }),
        };
      }

      // Object: each key becomes a child node
      // Prefer a meaningful display name from common backend fields
      const displayTitle =
        value.title ||
        value.name ||
        value.class_name ||
        value.className ||
        value.technicalName ||
        value.technical_name ||
        label;

      const children: SchemaTreeNode[] = Object.entries(value)
        .filter(([, v]) => v !== null && v !== undefined)
        .map(([key, v]) => buildTreeFromJson(v, key, depth + 1));

      return {
        title: String(displayTitle),
        technicalName: value.technicalName || value.technical_name || label,
        val: value.val || value.value || undefined,
        equality: value.equality || undefined,
        children,
        expanded: depth === 0,
      };
    };

    // Build the root tree from the backend's root array.
    // Support multiple possible root field names.
    const rawRoot: any[] = Array.isArray(rawSchema)
      ? rawSchema
      : Array.isArray(rawSchema.root)
      ? rawSchema.root
      : Array.isArray(rawSchema.classes)
      ? rawSchema.classes
      : [];

    // If the backend already provides SchemaTreeNode-shaped nodes (with title/technicalName),
    // use them directly; otherwise build from raw JSON.
    const hasNativeTreeStructure =
      rawRoot.length > 0 &&
      typeof rawRoot[0] === 'object' &&
      rawRoot[0] !== null &&
      ('title' in rawRoot[0] || 'technicalName' in rawRoot[0]);

    let rootNodes: SchemaTreeNode[];

    if (hasNativeTreeStructure) {
      // Backend already returns proper tree nodes — map directly preserving structure
      const mapTreeNodes = (nodes: any[]): SchemaTreeNode[] => {
        if (!nodes || !Array.isArray(nodes)) return [];
        return nodes.map(node => ({
          title: node.title || node.name || 'Unknown Node',
          technicalName: node.technicalName || node.technical_name || node.technical || '',
          val: node.val || node.value || undefined,
          equality: node.equality || undefined,
          children: mapTreeNodes(node.children || []),
          expanded: node.expanded || false,
        }));
      };
      rootNodes = mapTreeNodes(rawRoot);
    } else {
      // Backend returns raw SCDP JSON — build tree dynamically from the root array
      rootNodes = rawRoot.map((item, idx) => {
        const label =
          item?.title ||
          item?.name ||
          item?.class_name ||
          item?.className ||
          `Class ${idx + 1}`;
        return buildTreeFromJson(item, String(label), 0);
      });
    }

    // The JSON editor always gets the COMPLETE backend response
    const rawJsonStr = JSON.stringify(rawSchema, null, 2);

    // Class count comes from the actual root data length, not the classes array
    const classCount = rawRoot.length || classes.length;

    return {
      schemaGroupName: rawSchema.schemaGroupName || rawSchema.schema_group_name || 'Generated Schema',
      root: rootNodes,
      rawJson: rawJsonStr,
      generatedAt: rawSchema.generatedAt || new Date().toISOString(),
      version: rawSchema.version || '1.0',
      stats: rawSchema.stats || {
        classCount,
        componentCount: classes.reduce((acc, cls) => acc + (cls.components?.length || 0), 0),
        fieldCount: 0,
        formulaCount: classes.reduce((acc, cls) => acc + (cls.formulaRules?.length || 0), 0),
      },
      validationResult: rawSchema.validationResult || {
        isValid: true,
        errors: [],
        warnings: [],
        stats: {
          totalClasses: classCount,
          totalComponents: 0,
          totalFields: 0,
          totalLookupRules: 0,
        },
      } as SchemaValidationResult,
    } as SchemaModel;
  }
}

