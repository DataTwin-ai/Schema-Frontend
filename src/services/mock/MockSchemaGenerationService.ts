import { ISchemaGenerationService, ProgressCallback } from '../interfaces';
import { RequirementsModel, SchemaClass, SchemaModel } from '../../types';
import { sampleSchemaModel } from '../../fixtures';

export class MockSchemaGenerationService implements ISchemaGenerationService {
  async generateSchema(
    requirements: RequirementsModel,
    classes: SchemaClass[],
    onProgress?: ProgressCallback
  ): Promise<SchemaModel> {
    const steps = [
      { id: '1', label: 'Transforming domain classes into PO Validation schema structure', detail: `Processing ${classes.length} active classes` },
      { id: '2', label: 'Resolving GETGROUPFROMSCHEMA2 and FETCHFROMSCHEMA references', detail: 'Validating dependency acyclicity and lookup parameters' },
      { id: '3', label: 'Compiling MATH expressions & workflow triggers', detail: 'Checking BaseValue, TaxableBase, DocumentValue, and SLA rules' },
      { id: '4', label: 'Generating formatted SCDP JSON specification', detail: 'Validating production schema output against master specification' },
    ];

    for (let i = 0; i < steps.length; i++) {
      if (onProgress) {
        onProgress({
          id: steps[i].id,
          label: steps[i].label,
          detail: steps[i].detail,
          status: 'active',
        });
      }
      await new Promise((resolve) => setTimeout(resolve, 360));
      if (onProgress) {
        onProgress({
          id: steps[i].id,
          label: steps[i].label,
          detail: steps[i].detail,
          status: 'done',
        });
      }
    }

    const schemaModel: SchemaModel = JSON.parse(JSON.stringify(sampleSchemaModel));
    schemaModel.generatedAt = new Date().toISOString();
    return schemaModel;
  }
}
