import { IClassGenerationService, ProgressCallback } from '../interfaces';
import { RequirementsModel, SchemaClass } from '../../types';
import { sampleSchemaClasses } from '../../fixtures';

export class MockClassGenerationService implements IClassGenerationService {
  async generateClasses(
    requirements: RequirementsModel,
    runId?: string,
    onProgress?: ProgressCallback,
    onOperationStarted?: (operationId: string) => void
  ): Promise<SchemaClass[]> {
    const steps = [
      { id: '1', label: 'Analyzing requirement layers & grain definitions', detail: 'Evaluating requirements against master datasources PO_I, CA, AP' },
      { id: '2', label: 'Generating Transaction & Valuation Class (PO_ItemCalculation)', detail: 'Mapped line item valuation, discounts, taxes, and document totals' },
      { id: '3', label: 'Generating Master Reference Classes (CostAllocationMaster, AP)', detail: 'Configured LOB cost allocation profiles and workflow SLA rules' },
      { id: '4', label: 'Formulating Multi-Segment Allocation Classes (POCostAllocation1, TCostAllocationValue, POCostAllocation)', detail: 'Configured GETGROUPFROMSCHEMA2 lookups, ratio denominators, and proportional distributions' },
      { id: '5', label: 'Constructing Approval & Workflow Routing Class (POWF)', detail: 'Integrated multi-tier approval triggers and SLA threshold validations' },
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
      await new Promise((resolve) => setTimeout(resolve, 380));
      if (onProgress) {
        onProgress({
          id: steps[i].id,
          label: steps[i].label,
          detail: steps[i].detail,
          status: 'done',
        });
      }
    }

    // Return deep cloned dynamic classes
    return JSON.parse(JSON.stringify(sampleSchemaClasses));
  }
}
