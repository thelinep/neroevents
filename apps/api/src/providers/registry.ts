import { generateGemini } from './gemini.js';
import { generateClaude } from './claude.js';
import { generateGPT } from './gpt.js';
import { generateDeepSeek } from './deepseek.js';
import { generateQwen } from './qwen.js';
import { generateKimi } from './kimi.js';
import { generateOllama } from './ollama.js';

const providers: Record<string, any> = {
  gemini: generateGemini,
  claude: generateClaude,
  gpt: generateGPT,
  deepseek: generateDeepSeek,
  qwen: generateQwen,
  kimi: generateKimi,
  ollama: generateOllama,
};

export function getProvider(name: string) {
  if (!providers[name]) throw new Error(`Provider ${name} not registered`);
  return providers[name];
}
