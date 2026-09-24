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
      let response: Response;
      try {
        response = await fetch(`${this.apiUrl}/generate/business-requirement`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json, text/plain, */*'
          },
          body: JSON.stringify({ 
            highLevelRequirement: highLevelInput 
          }),
        });
      } catch (netErr: any) {
        throw new Error(`Unable to connect to backend API at ${this.apiUrl}. Please ensure the FastAPI server is running.`);
      }

      if (!response.ok) {
        let errDetail = `${response.status} ${response.statusText}`;
        try {
          const errJson = await response.json();
          if (errJson && errJson.detail) {
            errDetail = errJson.detail;
          }
        } catch (_) {}
        throw new Error(`Failed to generate business requirement: ${errDetail}`);
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

    let response: Response;
    try {
      response = await fetch(`${this.apiUrl}/generate/requirements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
    } catch (netErr: any) {
      throw new Error(`Unable to connect to backend API at ${this.apiUrl}. Please ensure the FastAPI server is running.`);
    }

    if (!response.ok) {
      let errDetail = `${response.status} ${response.statusText}`;
      try {
        const errJson = await response.json();
        if (errJson && errJson.detail) {
          errDetail = errJson.detail;
        }
      } catch (_) {}
      throw new Error(`Failed to generate requirements: ${errDetail}`);
    }

    const data = await response.json();
    const requirementsData = data.result || data;

    if (onProgress) {
      onProgress({
        id: 'gen-done',
        status: 'done',
        label: 'Requirements structure generated successfully',
      });
    }

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
