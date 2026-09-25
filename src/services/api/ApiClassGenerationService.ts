import { IClassGenerationService, ProgressCallback } from '../interfaces';
import { RequirementsModel, SchemaClass } from '../../types';

import { API_URL } from './config';
import { pollOperation } from './pollOperation';

export class ApiClassGenerationService implements IClassGenerationService {

  async generateClasses(
    requirements: RequirementsModel,
    runId?: string,
    onProgress?: ProgressCallback,
    onOperationStarted?: (operationId: string) => void
  ): Promise<SchemaClass[]> {
    if (onProgress) {
      onProgress({ id: 'class-init', status: 'active', label: 'Connecting to backend...', detail: 'Sending generate classes request' });
    }

    const response = await fetch(`${API_URL}/generate/classes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requirements, runId }),
    });

    if (!response.ok) {
      if (response.status === 409) {
        throw new Error("Another generation is running");
      }
      throw new Error(`Failed to generate classes: ${response.statusText}`);
    }

    const initData = await response.json();

    // New async flow: backend returns { operationId, status: 'RUNNING' }
    if (initData.operationId) {
      const operationId: string = initData.operationId;
      if (onOperationStarted) onOperationStarted(operationId);

      const statusData = await pollOperation(operationId, onProgress);
      
      const rawClasses = Array.isArray(statusData.classes)
        ? statusData.classes
        : (statusData.result?.classes || statusData.result || []);

      if (onProgress) {
        onProgress({ id: 'class-done', status: 'done', label: 'Classes generated successfully' });
      }

      return this.mapClasses(rawClasses);
    }

    // Legacy synchronous flow fallback (if backend still returns direct result)
    const rawClasses = Array.isArray(initData) ? initData : (initData.classes || initData.result || []);
    if (onProgress) {
      onProgress({ id: 'class-done', status: 'done', label: 'Classes generated successfully' });
    }
    return this.mapClasses(rawClasses);
  }

  private mapClasses(rawClasses: any[]): SchemaClass[] {
    return rawClasses.map((rawClass: any) => ({
      id: rawClass.id || `class-${rawClass.class_no || rawClass.classNumber || Math.random()}`,
      classNumber: rawClass.class_no || rawClass.classNumber || 0,
      className: rawClass.class_name || rawClass.className || 'Unknown Class',
      purpose: rawClass.purpose || '',
      datasource: rawClass.datasource || '',
      grain: rawClass.grain || '',
      classLevelFields: rawClass.class_level_fields || rawClass.classLevelFields || [],
      lookupRules: rawClass.lookup_rules || rawClass.lookupRules || [],
      formulaRules: rawClass.formula_rules || rawClass.formulaRules || [],
      components: (rawClass.components || []).map((comp: any, idx: number) => ({
        id: comp.id || `comp-${idx}`,
        name: comp.name || '',
        type: comp.type || 'MATH',
        sourceClass: comp.source_class || comp.sourceClass,
        sourceColumn: comp.source_column || comp.sourceColumn,
        expression: comp.expression,
        condition: comp.condition,
        description: comp.description,
      })),
      criteria: rawClass.criteria || [],
      conditions: rawClass.conditions || [],
      expectedOutput: rawClass.expected_output || rawClass.expectedOutput || '',
      dependencies: rawClass.dependencies || [],
      exposes: rawClass.exposes || [],
      reviewPoints: rawClass.review_points || rawClass.reviewPoints || '',
      associatedRequirements: rawClass.associated_requirements || rawClass.associatedRequirements || [],
      metadata: rawClass.metadata || {},
      isCustomAdded: rawClass.isCustomAdded || false,
      rawText: rawClass.rawText ?? rawClass.raw_text,
    } as SchemaClass));
  }
}