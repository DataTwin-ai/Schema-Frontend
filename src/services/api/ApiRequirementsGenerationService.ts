import { IRequirementsGenerationService, ProgressCallback } from '../interfaces';
import { BusinessInput, RequirementsModel, SupportingDocument } from '../../types';

export class ApiRequirementsGenerationService implements IRequirementsGenerationService {
  private apiUrl: string;

  constructor(apiUrl?: string) {
    this.apiUrl = apiUrl || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
  }

  async generateBusinessRequirement(
    highLevelInput: string,
    supportingDocs: SupportingDocument[],
    onProgress?: ProgressCallback
  ): Promise<string> {
    if (onProgress) {
      onProgress({
        id: 'req-init',
        status: 'active',
        label: 'Connecting to backend...',
        detail: 'Sending business requirements request'
      });
    }

    try {
      const response = await fetch(`${this.apiUrl}/generate/business-requirement`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/plain, */*'
        },
        body: JSON.stringify({ 
          highLevelRequirement: highLevelInput 
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate business requirement: ${response.status} ${response.statusText}`);
      }

      const contentType = response.headers.get("content-type");
      let resultText = '';

      if (contentType && contentType.indexOf("application/json") !== -1) {
        const data = await response.json();
        resultText = data.businessRequirement || data.result || data.text || data.data || '';
      } else {
        resultText = await response.text();
      }

      if (onProgress) {
        onProgress({
          id: 'req-done',
          status: 'done',
          label: 'Requirement generated successfully',
        });
      }

      return resultText;
    } catch (error: any) {
      if (onProgress) {
        onProgress({
          id: 'req-error',
          status: 'error',
          label: 'Generation failed',
          detail: error.message || 'Unknown error occurred'
        });
      }
      throw error;
    }
  }

  async generateRequirements(
    input: BusinessInput,
    onProgress?: ProgressCallback
  ): Promise<RequirementsModel> {
    if (onProgress) {
      onProgress({
        id: 'gen-init',
        status: 'active',
        label: 'Connecting to backend...',
        detail: 'Sending structured requirements request'
      });
    }

    const requestBody = {
      highLevelRequirement: input.highLevelRequirement,
      generatedBusinessRequirement: input.generatedBusinessRequirement,
      isBusinessRequirementGenerated: true,
      supportingDocuments: input.supportingDocuments || [],
      additionalInstructions: input.additionalInstructions || ""
    };

    const response = await fetch(`${this.apiUrl}/generate/requirements`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Failed to generate requirements: ${response.statusText}`);
    }

    const data = await response.json();
    
    // The backend might return raw text or a slightly different JSON format.
    // Assuming backend returns a valid JSON that closely matches RequirementsModel
    // We will cast it and map if necessary. If the backend wraps it in a data or result object:
    const requirementsData = data.result || data;

    if (onProgress) {
      onProgress({
        id: 'gen-done',
        status: 'done',
        label: 'Requirements structure generated successfully',
      });
    }

    // Cast or map to RequirementsModel exactly
    return {
      domain: requirementsData.domain,
      highLevelRequirement: requirementsData.highLevelRequirement,
      problemStatements: requirementsData.problemStatements,
      businessObjectives: requirementsData.businessObjectives,
      businessRequirements: requirementsData.businessRequirements,
      financeRequirements: requirementsData.financeRequirements,
      technicalRequirements: requirementsData.technicalRequirements,
      expectedOutput: requirementsData.expectedOutput,
      generatedAt: requirementsData.generatedAt || new Date().toISOString(),
      lastEditedAt: requirementsData.lastEditedAt
    } as RequirementsModel;
  }
}
