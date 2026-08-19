import { ProviderResponse } from '../types.js';
export async function generateClaude(prompt: string, context?: any): Promise<ProviderResponse> {
  console.warn('⚠️ Claude provider not implemented – using dummy response.');
  return { content: `[Claude mock] ${prompt.slice(0, 100)}...` };
}
