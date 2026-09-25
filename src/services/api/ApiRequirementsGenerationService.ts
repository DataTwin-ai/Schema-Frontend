import { IRequirementsGenerationService, ProgressCallback } from '../interfaces';
import { BusinessInput, RequirementsModel, SupportingDocument } from '../../types';

import { API_URL } from './config';
import { pollOperation } from './pollOperation';

export class ApiRequirementsGenerationService implements IRequirementsGenerationService {

  async generateBusinessRequirement(
    highLevelInput: string,
    supportingDocs: SupportingDocument[],
    onProgress?: ProgressCallback,
    onOperationStarted?: (operationId: string) => void
  ): Promise<{ resultText: string; runId: string }> {
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
        response = await fetch(`${API_URL}/generate/business-requirement`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json, text/plain, */*'
          },
          body: JSON.stringify({ 
            highLevelRequirement: highLevelInput,
            additionalRequirements: supportingDocs && supportingDocs.length > 0 ? supportingDocs : undefined
          }),
        });
      } catch (netErr: any) {
        throw new Error(`Unable to connect to backend API at ${API_URL}. Please ensure the FastAPI server is running.`);
      }

      if (!response.ok) {
        let errDetail = `${response.status} ${response.statusText}`;
        try {
          const errJson = await response.json();
          if (errJson && errJson.detail) {
            errDetail = errJson.detail;
          }
        } catch (_) {}
        if (response.status === 409) {
          throw new Error("Another generation is running");
        }
        throw new Error(`Failed to generate business requirement: ${errDetail}`);
      }

      const contentType = response.headers.get("content-type");
      let resultText = '';
      let runId = '';

      if (contentType && contentType.indexOf("application/json") !== -1) {
        const data = await response.json();
        
        if (data.operationId) {
          const operationId: string = data.operationId;
          
          if (typeof onOperationStarted === 'function') {
            onOperationStarted(operationId);
          }
          
          const statusData = await pollOperation(operationId, onProgress);
          
          if (!statusData.generatedBusinessRequirement || statusData.generatedBusinessRequirement.trim() === '') {
            throw new Error("Backend returned COMPLETED but generatedBusinessRequirement is empty or missing.");
          }
          resultText = statusData.generatedBusinessRequirement;
          runId = statusData.runId || '';
        } else {
          if (!data.generatedBusinessRequirement || data.generatedBusinessRequirement.trim() === '') {
            throw new Error("Backend response missing generatedBusinessRequirement.");
          }
          resultText = data.generatedBusinessRequirement;
          runId = data.runId || '';
        }
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


      return { resultText, runId };
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

  async generateRequirements(input: BusinessInput, runId?: string, onProgress?: ProgressCallback, onOperationStarted?: (operationId: string) => void): Promise<RequirementsModel> {
    if (!runId) throw new Error("runId is required to fetch requirements");
    
    if (onProgress) {
      onProgress({
        id: 'gen-init',
        status: 'active',
        label: 'Fetching parsed requirements...',
        detail: 'Reading completed pipeline output'
      });
    }

    let response: Response;
    try {
      response = await fetch(`${API_URL}/runs/${runId}/requirements`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      });
    } catch (netErr: any) {
      throw new Error(`Unable to connect to backend API at ${API_URL}. Please ensure the FastAPI server is running.`);
    }

    if (!response.ok) {
      let errDetail = `${response.status} ${response.statusText}`;
      try {
        const errJson = await response.json();
        if (errJson && errJson.detail) {
          errDetail = errJson.detail;
        }
      } catch (_) {}
      throw new Error(`Failed to fetch requirements: ${errDetail}`);
    }

    const requirementsData = await response.json();

    if (onProgress) {
      onProgress({
        id: 'gen-done',
        status: 'done',
        label: 'Requirements structure fetched successfully',
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
