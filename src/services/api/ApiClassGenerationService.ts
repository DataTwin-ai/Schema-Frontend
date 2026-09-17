import { IClassGenerationService, ProgressCallback } from '../interfaces';
import { RequirementsModel, SchemaClass } from '../../types';

export class ApiClassGenerationService implements IClassGenerationService {
  private apiUrl: string;

  constructor(apiUrl?: string) {
    this.apiUrl = apiUrl || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
  }

  async generateClasses(
    requirements: RequirementsModel,
    onProgress?: ProgressCallback
  ): Promise<SchemaClass[]> {
    if (onProgress) {
      onProgress({
        id: 'class-init',
        status: 'in-progress',
        message: 'Connecting to backend...',
        details: 'Sending generate classes request'
      });
    }

    const response = await fetch(`${this.apiUrl}/generate/classes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requirements }),
    });

    if (!response.ok) {
      throw new Error(`Failed to generate classes: ${response.statusText}`);
    }

    const data = await response.json();
    const rawClasses = Array.isArray(data) ? data : (data.classes || data.result || []);

    if (onProgress) {
      onProgress({
        id: 'class-done',
        status: 'completed',
        message: 'Classes generated successfully',
      });
    }

    // Map backend class schema to frontend SchemaClass model
    return rawClasses.map((rawClass: any) => {
      return {
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
        isCustomAdded: rawClass.isCustomAdded || false
      } as SchemaClass;
    });
  }
}
