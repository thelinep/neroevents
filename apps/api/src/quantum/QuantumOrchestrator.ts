import { classifyIntent } from '../agents/classifier.js';
import { generatePlan } from '../agents/planner.js';
import { KnowledgeGraph } from './KnowledgeGraph.js';
import { PerformanceTracker } from './PerformanceTracker.js';
import { AdaptiveRouter } from './AdaptiveRouter.js';
import { orchestrator } from '../orchestrator.js';
import { logger } from '../utils/logger.js';
type AutonomyLevel = 'min' | 'average' | 'high' | 'full';
export class QuantumOrchestrator {
  private kg = new KnowledgeGraph();
  private perf = new PerformanceTracker();
  private router = new AdaptiveRouter(this.perf);
  private pendingApprovals = new Map();
  async processGoal(userId: string, prompt: string, autonomy: AutonomyLevel = 'average') {
    const startTime = Date.now();
    const intent = await classifyIntent(prompt);
    const relevant = await this.kg.queryRelevant(prompt, userId);
    let plan = await generatePlan(prompt, intent, relevant);
    for (const task of plan) task.agent = await this.router.selectModel(task.type);
    if (autonomy === 'min') { const ok = await this.requestPlanApproval(userId, plan); if (!ok) return { status: 'aborted' }; }
    const results: Record<string,any> = {};
    for (const task of plan) {
      const needsApproval = this.needsApproval(task, autonomy);
      if (needsApproval) { const ok = await this.requestTaskApproval(userId, task); if (!ok) { results[task.id] = { success: false, error: 'Rejected' }; continue; } }
      results[task.id] = await this.executeTaskWithRetry(task);
    }
    await this.kg.addNode('project', { userId, prompt, intent, plan, results });
    for (const task of plan) await this.kg.addEdge('project', `task:${task.id}`, 'contains');
    const duration = Date.now() - startTime;
    for (const task of plan) await this.perf.update(task.agent, task.type, results[task.id]?.success ?? false, duration, 0.001);
    return { intent, plan, results, meta: { autonomy } };
  }
  private needsApproval(task: any, autonomy: AutonomyLevel) {
    const highImpact = ['deploy','schema','delete'];
    if (autonomy === 'min') return true;
    if (autonomy === 'average') return highImpact.includes(task.type);
    if (autonomy === 'high') return task.type === 'deploy';
    return false;
  }
  private async requestPlanApproval(userId: string, plan: any[]) { return true; } // stub
  private async requestTaskApproval(userId: string, task: any) { return true; }
  private async executeTaskWithRetry(task: any) {
    let attempts = 0;
    while (attempts < 3) {
      try { const result = await orchestrator.runTask(task.id); return { success: true, data: result }; }
      catch (e) { attempts++; if (attempts >= 3) { task.agent = 'ollama'; const fallback = await orchestrator.runTask(task.id); return { success: true, data: fallback, fallback: true }; } }
    }
    return { success: false, error: 'All attempts failed' };
  }
}
export const quantumOrchestrator = new QuantumOrchestrator();
