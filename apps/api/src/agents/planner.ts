import { callLLM } from '../utils/llm.js';
import { Task } from '../types.js';
import { getProvider } from '../providers/registry.js';

export async function generatePlan(prompt: string, intent: string, context: any, provider: string = 'gpt'): Promise<Task[]> {
  const llm = getProvider(provider);
  const response = await llm(`
    You are a senior software architect. Break the user's request into subtasks.
    Output JSON array with:
    - id (number)
    - name (string)
    - description (string)
    - type (schema|tests|functions|components|config|integration)
    - agent (gemini|claude|gpt|deepseek|qwen|kimi|ollama) – choose the best agent for the task
    - dependencies (array of task ids)
    - expectedOutput (string)
    Request: ${prompt}
    Context: ${JSON.stringify(context)}
    Output only valid JSON.
  `);
  return JSON.parse(response.content);
}