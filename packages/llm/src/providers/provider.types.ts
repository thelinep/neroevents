export type ProviderId = 'openai' | 'anthropic' | 'google' | 'deepseek' | 'qwen' | 'kimi' | 'ollama';

export interface GenerateRequest {
  model: string;
  prompt: string;
  temperature?: number;
}

export interface GenerateResponse {
  text: string;
  provider: ProviderId;
  model: string;
  usage?: { inputTokens?: number; outputTokens?: number };
  latencyMs?: number;
}

export interface LLMProvider {
  id: ProviderId;
  generate(request: GenerateRequest): Promise<GenerateResponse>;
}
