import { API_URL } from './config';
import { ClassPlanRow } from '../../utils/classPlanUtils';

export interface ClassPlanResponse {
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  source: 'generated' | 'edited' | 'seeded';
  version: number;
  text: string;
  classes: ClassPlanRow[];
  validation?: {
    ok: boolean;
    errors: { line: number; message: string }[];
  };
  approvedAt?: string;
  runId?: string;
  operationId?: string;
}

export class ApiClassPlanService {
  async getClassPlan(runId: string): Promise<ClassPlanResponse | null> {
    if (!runId) return null;
    const res = await fetch(`${API_URL}/runs/${encodeURIComponent(runId)}/class-plan`);
    if (!res.ok) {
      if (res.status === 404) return null;
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `HTTP ${res.status}`);
    }
    return res.json();
  }

  async saveDraft(runId: string, text: string, baseVersion: number): Promise<ClassPlanResponse> {
    const res = await fetch(`${API_URL}/runs/${encodeURIComponent(runId)}/class-plan`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, baseVersion }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const error: any = new Error(err.detail || `HTTP ${res.status}`);
      error.status = res.status;
      error.errors = err.errors;
      throw error;
    }

    return res.json();
  }

  async approvePlan(runId: string, text: string, baseVersion: number): Promise<ClassPlanResponse> {
    const res = await fetch(`${API_URL}/runs/${encodeURIComponent(runId)}/class-plan/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, baseVersion }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const error: any = new Error(err.detail || `HTTP ${res.status}`);
      error.status = res.status;
      error.errors = err.errors;
      throw error;
    }

    return res.json();
  }

  async regeneratePlan(runId: string): Promise<ClassPlanResponse> {
    const res = await fetch(`${API_URL}/runs/${encodeURIComponent(runId)}/class-plan/regenerate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `HTTP ${res.status}`);
    }

    return res.json();
  }

  async rejectPlan(runId: string, reason?: string): Promise<{ status: string; runId: string; reason?: string }> {
    const res = await fetch(`${API_URL}/runs/${encodeURIComponent(runId)}/class-plan/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: reason || 'Class plan rejected by user' }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `HTTP ${res.status}`);
    }

    return res.json();
  }
}

export const apiClassPlanService = new ApiClassPlanService();
