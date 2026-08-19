import OpenAI from 'openai';
import { ProviderResponse } from '../types.js';
const client = new OpenAI({ baseURL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1', apiKey: 'ollama' });
export async function generateOllama(prompt: string, context?: any): Promise<ProviderResponse> {
  const model = context?.model || 'llama3.2';
  const response = await client.chat.completions.create({ model, messages: [{ role: 'user', content: prompt }], temperature: 0.3, max_tokens: 4096 });
  return { content: response.choices[0].message.content || '', usage: response.usage };
}
