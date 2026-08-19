import { callLLM } from '../utils/llm.js';
export async function classifyIntent(prompt: string): Promise<string> {
  const response = await callLLM([{ role: 'system', content: 'Classify into: code, design, research, analysis, planning, debugging, general. Return only the category.' }, { role: 'user', content: prompt }]);
  return response.trim();
}
