import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocket } from 'ws';
import { Task } from './types.js';
import { generateDiff, applyDiff } from './utils/diff.js';
import { gitCommit } from './utils/git.js';
import { getProvider } from './providers/registry.js';
import { ingestConversation, retrieveRelevantContext } from './memory/index.js';
import { generatePlan } from './agents/planner.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TASKS_FILE = path.join(__dirname, 'tasks.json');

export class Orchestrator {
  private tasks: Task[] = [];
  private clients: Map<string, WebSocket> = new Map();
  private context: Record<string, string> = {};
  private pendingApprovals: number[] = [];

  async initialize() {
    try {
      const data = await readFile(TASKS_FILE, 'utf-8');
      this.tasks = JSON.parse(data);
    } catch { /* no tasks yet */ }
  }

  private async saveTasks() {
    await writeFile(TASKS_FILE, JSON.stringify(this.tasks, null, 2));
  }

  getTasks() { return this.tasks; }
  getTask(id: number) { return this.tasks.find(t => t.id === id); }

  addClient(id: string, conn: WebSocket) { this.clients.set(id, conn); }
  removeClient(id: string) { this.clients.delete(id); }

  private broadcast(msg: any) {
    for (const [_, conn] of this.clients) {
      try { conn.send(JSON.stringify(msg)); } catch {}
    }
  }

  // NEW: accepts provider parameter
  async generateRoadmap(description: string, codeContext: string | null = null, provider: string = 'gpt') {
    const newTasks = await generatePlan(description, 'code', {}, provider);
    let maxId = this.tasks.reduce((m, t) => Math.max(m, t.id), 0);
    newTasks.forEach((t: any) => { if (!t.id) t.id = ++maxId; });
    this.tasks.push(...newTasks);
    await this.saveTasks();
    this.broadcast({ type: 'roadmap_generated', tasks: newTasks });
    return newTasks;
  }

  async runTask(id: number) {
    const task = this.getTask(id);
    if (!task) return;
    task.status = 'running';
    this.broadcast({ type: 'task_update', task });

    try {
      const provider = getProvider(task.agent);
      const context = await retrieveRelevantContext(task.prompt, 5);
      const prompt = this.buildPrompt(task, context);
      const response = await provider(prompt);
      await ingestConversation([{ role: 'assistant', content: response.content }]);
      const diff = await generateDiff(task.files || [], response, this.context);
      task.result = { diff, logs: response.logs || [] };
      task.status = 'awaiting_approval';
      this.pendingApprovals.push(id);
      this.broadcast({ type: 'task_update', task });
    } catch (e: any) {
      task.status = 'failed';
      task.error = e.message;
      this.broadcast({ type: 'task_update', task });
    }
  }

  private buildPrompt(task: Task, context: string) {
    let prompt = `Relevant context:\n${context}\n\nTask: ${task.name}\n${task.prompt}\n`;
    for (const file of task.files || []) {
      const content = this.context[file] || 'File does not exist.';
      prompt += `\n### ${file}\n\`\`\`\n${content}\n\`\`\`\n`;
    }
    return prompt;
  }

  async approveTask(id: number) {
    const task = this.getTask(id);
    if (!task || task.status !== 'awaiting_approval') return;
    const repoRoot = process.env.REPO_ROOT || process.cwd();
    await applyDiff(task.result.diff, repoRoot);
    for (const file of task.files || []) {
      const fullPath = path.join(repoRoot, file);
      const content = await readFile(fullPath, 'utf-8');
      this.context[file] = content;
    }
    await gitCommit(`Apply task: ${task.name}`, repoRoot);
    await ingestConversation([{ role: 'user', content: `Approved task: ${task.name}` }]);
    task.status = 'applied';
    this.pendingApprovals = this.pendingApprovals.filter(tid => tid !== id);
    this.broadcast({ type: 'task_update', task });
    await this.saveTasks();
  }

  rejectTask(id: number) {
    const task = this.getTask(id);
    if (!task || task.status !== 'awaiting_approval') return;
    task.status = 'rejected';
    this.pendingApprovals = this.pendingApprovals.filter(tid => tid !== id);
    this.broadcast({ type: 'task_update', task });
    this.saveTasks();
  }

  // NEW: multi‑agent conversation
  async converse(initialMessage: string, agents: string[] = ['gemini', 'qwen', 'claude', 'deepseek']) {
    const conversation: { role: string; content: string }[] = [
      { role: 'user', content: initialMessage }
    ];
    for (const agentName of agents) {
      const provider = getProvider(agentName);
      const prompt = `
        Previous conversation:
        ${conversation.map(m => `${m.role}: ${m.content}`).join('\n')}
        Now you are ${agentName}. Continue or respond.
      `;
      const response = await provider(prompt);
      conversation.push({ role: 'assistant', content: response.content });
      await ingestConversation([{ role: 'assistant', content: response.content }]);
    }
    return conversation;
  }
}

export const orchestrator = new Orchestrator();