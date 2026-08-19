import OpenAI from 'openai';
import { config } from '../config.js';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'dummy', baseURL: process.env.LLM_BASE_URL || 'https://api.openai.com/v1' });
export async function callLLM(messages: Array<{role: 'system'|'user'|'assistant', content: string}>, options?: any) {
  const response = await openai.chat.completions.create({ model: process.env.LLM_MODEL || 'gpt-4o-mini', messages, temperature: 0.3, max_tokens: 4096 });
  return response.choices[0].message.content || '';
}
