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
        status: 'in-progress',
        message: 'Connecting to backend...',
        details: 'Sending business requirements request'
      });
    }

    const response = await fetch(`${this.apiUrl}/generate/business-requirement`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ highLevelInput, supportingDocs }),
    });

    if (!response.ok) {
      throw new Error(`Failed to generate business requirement: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (onProgress) {
      onProgress({
        id: 'req-done',
        status: 'completed',
        message: 'Requirement generated',
      });
    }

    return data.result || data.text || '';
  }

  async generateRequirements(
    input: BusinessInput,
    onProgress?: ProgressCallback
  ): Promise<RequirementsModel> {
    if (onProgress) {
      onProgress({
        id: 'gen-init',
        status: 'in-progress',
        message: 'Connecting to backend...',
        details: 'Sending structured requirements request'
      });
    }

    const response = await fetch(`${this.apiUrl}/generate/requirements`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
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
        status: 'completed',
        message: 'Requirements structure generated successfully',
      });
    }

    // Cast or map to RequirementsModel exactly
    return {
      domain: requirementsData.domain || input.domain || 'Unknown Domain',
      highLevelRequirement: requirementsData.highLevelRequirement || input.description || '',
      problemStatements: requirementsData.problemStatements || [],
      businessObjectives: requirementsData.businessObjectives || [],
      businessRequirements: requirementsData.businessRequirements || [],
      financeRequirements: requirementsData.financeRequirements || [],
      technicalRequirements: requirementsData.technicalRequirements || [],
      expectedOutput: requirementsData.expectedOutput || {
        title: 'Expected Output',
        type: 'Table',
        description: '',
        sampleRecords: []
      },
      generatedAt: requirementsData.generatedAt || new Date().toISOString(),
      lastEditedAt: requirementsData.lastEditedAt
    } as RequirementsModel;
  }
}
