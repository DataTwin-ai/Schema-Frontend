import { IRequirementsGenerationService, ProgressCallback } from '../interfaces';
import { BusinessInput, RequirementsModel, SupportingDocument } from '../../types';
import { sampleRequirements, sampleBusinessInput } from '../../fixtures';

export class MockRequirementsGenerationService implements IRequirementsGenerationService {
  async generateBusinessRequirement(
    highLevelInput: string,
    supportingDocs: SupportingDocument[],
    onProgress?: ProgressCallback
  ): Promise<string> {
    const steps = [
      { id: '1', label: 'Analyzing high-level business requirement', detail: 'Parsing core operational intent & domain scope' },
      { id: '2', label: 'Synthesizing detailed Business Requirement', detail: 'Formulating supplier advance calculations, FIFO matching & validation rules' },
      { id: '3', label: 'Structuring key capabilities & validation criteria', detail: 'Generating comprehensive business requirement draft' },
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
      await new Promise((resolve) => setTimeout(resolve, 350));
      if (onProgress) {
        onProgress({
          id: steps[i].id,
          label: steps[i].label,
          detail: steps[i].detail,
          status: 'done',
        });
      }
    }

    if (highLevelInput && highLevelInput.trim().length > 0) {
      return `DOMAIN: Accounts Payable (AP)
HLR: ${highLevelInput.trim()}

Key Operational Capabilities:
1. Retrieval of contract milestones and purchase order parameters to compute eligible supplier advance payments.
2. Maintenance of a real-time sub-ledger tracking advance balances by Supplier ID and Purchase Order ID.
3. Automated matching routine and FIFO allocation logic for eligible pending supplier invoices.
4. Validation rules preventing over-allocation beyond invoice totals or remaining advance balances.
5. Immediate decrement of active advance pool balances and calculation of adjusted net payable amounts upon approval.`;
    }

    return sampleBusinessInput.generatedBusinessRequirement || '';
  }

  async generateRequirements(
    input: BusinessInput,
    onProgress?: ProgressCallback
  ): Promise<RequirementsModel> {
    const steps = [
      { id: '1', label: 'Ingesting reviewed Business Requirement', detail: 'Parsing domain rules & document attachments' },
      { id: '2', label: 'Formulating Problem Statements (PS-001..PS-006)', detail: 'Mapped Calculation, Workflow, Allocation, Validation, and Decision' },
      { id: '3', label: 'Deriving Business Objectives & Requirements', detail: 'Structured BO-001..BO-004 and BR-001..BR-007' },
      { id: '4', label: 'Synthesizing Finance & Technical Specifications', detail: 'Generated 7 Finance (FR) and 4 Technical (TR) rules' },
      { id: '5', label: 'Constructing expected ledger verification profile', detail: 'Synthesized supplier advance allocation schedule' },
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
      await new Promise((resolve) => setTimeout(resolve, 350));
      if (onProgress) {
        onProgress({
          id: steps[i].id,
          label: steps[i].label,
          detail: steps[i].detail,
          status: 'done',
        });
      }
    }

    const customized: RequirementsModel = {
      ...sampleRequirements,
      highLevelRequirement: input.generatedBusinessRequirement || input.highLevelRequirement || sampleRequirements.highLevelRequirement,
      generatedAt: new Date().toISOString(),
    };

    return customized;
  }
}
