import { ISchemaHistoryService } from '../interfaces';
import { SchemaVersion } from '../../types';
import { API_URL } from './config';

export class ApiSchemaHistoryService implements ISchemaHistoryService {
  async getVersions(): Promise<SchemaVersion[]> {
    return [];
  }

  async recordVersion(version: Omit<SchemaVersion, 'id' | 'versionNumber'>): Promise<SchemaVersion> {
    throw new Error("Use save from WorkflowContext instead");
  }

  async listVersions(runId: string): Promise<any[]> {
    const res = await fetch(`${API_URL}/schema/${runId}/versions`);
    if (!res.ok) {
      if (res.status === 404) return [];
      throw new Error('Failed to fetch schema versions');
    }
    return res.json();
  }

  async getVersion(runId: string, n: number): Promise<any> {
    const res = await fetch(`${API_URL}/schema/${runId}/versions/${n}`);
    if (!res.ok) throw new Error('Failed to fetch schema version');
    return res.json();
  }

  async restoreVersion(runId: string, n: number, userName: string): Promise<any> {
    const res = await fetch(`${API_URL}/schema/${runId}/versions/${n}/restore`, {
      method: 'POST',
      headers: {
        'X-User-Name': userName
      }
    });
    if (!res.ok) throw new Error('Failed to restore schema version');
    return res.json();
  }
}
