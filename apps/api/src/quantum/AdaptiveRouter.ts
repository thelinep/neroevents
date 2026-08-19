import { PerformanceTracker } from './PerformanceTracker.js';
export class AdaptiveRouter {
  constructor(private perf: PerformanceTracker) {}
  async selectModel(taskType: string, userWeights = { cost: 0.3, latency: 0.2, quality: 0.5 }) {
    const best = await this.perf.getBestModel(taskType, userWeights);
    if (best) return best;
    const fallbackMap: Record<string,string> = { planning: 'gemini', coding: 'deepseek', testing: 'gpt', debugging: 'claude', reviewing: 'claude', deploying: 'ollama' };
    return fallbackMap[taskType] || 'ollama';
  }
}
