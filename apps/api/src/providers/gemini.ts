import { ProviderResponse } from '../types.js';
export async function generateGemini(prompt: string, context?: any): Promise<ProviderResponse> {
  console.warn('⚠️ Gemini provider not implemented – using dummy response.');
  return { content: `[Gemini mock] ${prompt.slice(0, 100)}...` };
}
