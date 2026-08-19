import { ProviderResponse } from '../types.js';
export async function generateDeepSeek(prompt: string, context?: any): Promise<ProviderResponse> {
  console.warn('⚠️ DeepSeek provider not implemented – using dummy response.');
  return { content: `[DeepSeek mock] ${prompt.slice(0, 100)}...` };
}
