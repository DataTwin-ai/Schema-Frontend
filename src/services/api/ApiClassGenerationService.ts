import { IClassGenerationService, ProgressCallback } from '../interfaces';
import { RequirementsModel, SchemaClass } from '../../types';

import { API_URL } from './config';
import { pollOperation } from './pollOperation';

export class ApiClassGenerationService implements IClassGenerationService {

  async generateClasses(
    requirements: RequirementsModel,
    runId?: string,
    onProgress?: ProgressCallback,
    onOperationStarted?: (operationId: string) => void,
    additionalRequirements?: string[],
    additionalInformation?: any[],
    onStatusUpdate?: (statusData: any) => void
  ): Promise<SchemaClass[]> {
    if (onProgress) {
      onProgress({ id: 'class-init', status: 'active', label: 'Connecting to backend...', detail: 'Sending generate classes request' });
    }

    const payload: Record<string, any> = {};
    if (runId) payload.runId = runId;
    if (requirements) payload.requirements = requirements;
    if (additionalRequirements && additionalRequirements.length > 0) {
      payload.additionalRequirements = additionalRequirements;
    }

    const response = await fetch(`${API_URL}/generate/classes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      if (response.status === 409) {
        throw new Error("Another generation is running");
      }
      throw new Error(`Failed to generate classes: ${response.statusText}`);
    }

    const initData = await response.json();

    // Async flow: backend returns { operationId, status: 'RUNNING' }
    if (initData.operationId) {
      const operationId: string = initData.operationId;
      if (onOperationStarted) onOperationStarted(operationId);

      const statusData = await pollOperation(operationId, onProgress, onStatusUpdate);

      if (statusData.status === 'AWAITING_APPROVAL') {
        const plan = statusData.plan || statusData.result?.plan || statusData.result;
        return {
          awaitingApproval: true,
          operationId,
          plan,
        } as any;
      }

      // On completion, load GET /api/class-prompts into the existing cards
      let rawClasses: any[] = [];
      try {
        const promptsRes = await fetch(`${API_URL}/class-prompts?run_id=${runId || ''}`);
        if (promptsRes.ok) {
          const promptsData = await promptsRes.json();
          rawClasses = promptsData.classes || [];
        }
      } catch (e) {
        console.warn('Failed to load class prompts:', e);
      }

      if (rawClasses.length === 0) {
        rawClasses = Array.isArray(statusData.classes)
          ? statusData.classes
          : (statusData.result?.classes || statusData.result || []);
      }

      if (onProgress) {
        onProgress({ id: 'class-done', status: 'done', label: 'Classes generated successfully' });
      }

      const mapped = this.mapClasses(rawClasses);
      (mapped as any).count = statusData.count ?? statusData.result?.count ?? mapped.length;
      return mapped;
    }

    // Fallback: direct response or fetch class-prompts
    let rawClasses = Array.isArray(initData) ? initData : (initData.classes || initData.result || []);
    if (rawClasses.length === 0) {
      try {
        const promptsRes = await fetch(`${API_URL}/class-prompts?run_id=${runId || ''}`);
        if (promptsRes.ok) {
          const promptsData = await promptsRes.json();
          rawClasses = promptsData.classes || [];
        }
      } catch (e) {
        console.warn('Failed to load class prompts:', e);
      }
    }

    if (onProgress) {
      onProgress({ id: 'class-done', status: 'done', label: 'Classes generated successfully' });
    }

    const mapped = this.mapClasses(rawClasses);
    (mapped as any).count = initData.count ?? initData.result?.count ?? mapped.length;
    return mapped;
  }

  public mapClasses(rawClasses: any[]): SchemaClass[] {
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
      metadata: {
        ...(rawClass.metadata || {}),
        fileName: rawClass.metadata?.fileName || rawClass.metadata?.file_name || rawClass.fileName || rawClass.file_name,
        promptHash: rawClass.metadata?.promptHash || rawClass.metadata?.prompt_hash || rawClass.promptHash || rawClass.prompt_hash
      },
      isCustomAdded: rawClass.isCustomAdded || false,
      rawText: rawClass.rawText ?? rawClass.raw_text,
    } as SchemaClass));
  }
}
