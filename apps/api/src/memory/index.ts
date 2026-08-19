import { MemoryManager } from './MemoryManager.js';


const memoryManager = new MemoryManager();

export async function ingestConversation(messages: { role: string; content: string; timestamp?: string }[]) {
  for (const msg of messages) {
    await memoryManager.addMemory('session', msg.content, { role: msg.role });
  }
}

export async function retrieveRelevantContext(query: string, topK = 5) {
  const results = await memoryManager.retrieveRelevant(query, 'session', topK);
  return results.map((r: any) => r.content).join('\n\n');
}

export * from './MemoryManager.js';
export * from './embeddings.js';
export * from './store.js';
export * from './Summarizer.js';
