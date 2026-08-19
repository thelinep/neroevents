import { ProviderResponse } from '../types.js';
export async function generateGPT(prompt: string, context?: any): Promise<ProviderResponse> {
  console.warn('⚠️ GPT provider not implemented – using dummy response.');
  return { content: `[GPT mock] ${prompt.slice(0, 100)}...` };
}
