import { IClassHistoryService } from '../interfaces';
import { ClassVersion } from '../../types';
import { API_URL } from './config';

export class ApiClassHistoryService implements IClassHistoryService {
  
  async getVersions(classId: string): Promise<ClassVersion[]> {
    return [];
  }

  async recordVersion(version: Omit<ClassVersion, 'id' | 'versionNumber'>): Promise<ClassVersion> {
    throw new Error("Use save from WorkflowContext instead");
  }

  async getAllVersions(): Promise<Record<string, ClassVersion[]>> {
    return {};
  }

  async listVersions(runId: string, classNumber: string): Promise<any[]> {
    const res = await fetch(`${API_URL}/class-prompts/${classNumber}/versions?runId=${runId}`);
    if (!res.ok) {
      if (res.status === 404) return [];
      throw new Error('Failed to fetch class versions');
    }
    return res.json();
  }

  async getVersion(runId: string, classNumber: string, n: number): Promise<any> {
    const res = await fetch(`${API_URL}/class-prompts/${classNumber}/versions/${n}?runId=${runId}`);
    if (!res.ok) throw new Error('Failed to fetch class version');
    return res.json();
  }

  async restoreVersion(runId: string, classNumber: string, n: number, userName: string): Promise<any> {
    const res = await fetch(`${API_URL}/class-prompts/${classNumber}/versions/${n}/restore?runId=${runId}`, {
      method: 'POST',
      headers: {
        'X-User-Name': userName
      }
    });
    if (!res.ok) throw new Error('Failed to restore class version');
    return res.json();
  }
}
