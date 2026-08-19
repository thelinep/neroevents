import { ProviderResponse } from '../types.js';
export async function generateKimi(prompt: string, context?: any): Promise<ProviderResponse> {
  console.warn('⚠️ Kimi provider not implemented – using dummy response.');
  return { content: `[Kimi mock] ${prompt.slice(0, 100)}...` };
}
