import { ProviderResponse } from '../types.js';
export async function generateQwen(prompt: string, context?: any): Promise<ProviderResponse> {
  console.warn('⚠️ Qwen provider not implemented – using dummy response.');
  return { content: `[Qwen mock] ${prompt.slice(0, 100)}...` };
}
