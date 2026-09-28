import { SchemaModel, HistoryRecord } from '../../types';
import { API_URL } from './config';

export class ApiSchemaStudioService {
  async generateSchema(
    requirements: any,
    classes: any[],
    runId: string,
    onProgress?: (step: any) => void,
    onOperationStarted?: (operationId: string) => void
  ): Promise<any> {
    if (onProgress) {
      onProgress({ id: 'schema-init', status: 'active', label: 'Connecting to backend...', detail: 'Sending generate schema request' });
    }

    const response = await fetch(`${API_URL}/generate/schema`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requirements,
        classes,
        runId
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || `HTTP ${response.status}`);
    }

    const data = await response.json();
    if (onOperationStarted && data.operationId) {
      onOperationStarted(data.operationId);
    }

    return data;
  }

  async getSchema(runId: string): Promise<any> {
    const response = await fetch(`${API_URL}/schema/${runId}`);
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || `HTTP ${response.status}`);
    }
    return await response.json();
  }

  async updateSchema(runId: string, source: string, changeSummary: string, rawJson: string): Promise<any> {
    const response = await fetch(`${API_URL}/schema/${runId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source,
        changeSummary,
        rawJson
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || `HTTP ${response.status}`);
    }

    return await response.json();
  }

  async getSchemaVersions(runId: string): Promise<any[]> {
    const response = await fetch(`${API_URL}/schema/${runId}/versions`);
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || `HTTP ${response.status}`);
    }
    return await response.json();
  }

  async restoreSchemaVersion(runId: string, versionId: string): Promise<any> {
    const response = await fetch(`${API_URL}/schema/${runId}/versions/${versionId}/restore`, {
      method: 'POST'
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || `HTTP ${response.status}`);
    }
    return await response.json();
  }
}

export const schemaStudioService = new ApiSchemaStudioService();
