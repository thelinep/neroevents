import { callLLM } from '../utils/llm.js';
export class Summarizer {
  async summarize(texts: string[]): Promise<string> {
    const combined = texts.join('\n---\n');
    return await callLLM([{ role: 'system', content: 'You are a summarization assistant. Condense the following into a concise summary (max 200 words).' }, { role: 'user', content: combined }]);
  }
}
