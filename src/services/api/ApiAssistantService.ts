import { IAssistantService } from '../interfaces';
import { AssistantContext, AssistantResponse } from '../../types';
import { API_BASE } from './config';

export class ApiAssistantService implements IAssistantService {
  private sessionId = 'default-session-' + Date.now();

  async respond(
    message: string,
    context: AssistantContext
  ): Promise<AssistantResponse> {
    try {
      // Create session id tied to context stage or just a general one
      const response = await fetch(`${API_BASE}/api/chat/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: this.sessionId,
          message: message,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        message: data.reply || data.error || 'No response from assistant.',
      };
    } catch (error: any) {
      return {
        message: `Error connecting to assistant API: ${error.message}`,
      };
    }
  }
}
