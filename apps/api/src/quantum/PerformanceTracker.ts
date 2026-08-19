import { pool } from '../memory/store.js';
export class PerformanceTracker {
  async update(model: string, taskType: string, success: boolean, latencyMs: number, cost: number) {
    await pool.query(`INSERT INTO model_performance (model_name, task_type, success_count, total_count, avg_latency_ms, avg_cost_per_call) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (model_name, task_type) DO UPDATE SET success_count = model_performance.success_count + EXCLUDED.success_count, total_count = model_performance.total_count + EXCLUDED.total_count, avg_latency_ms = (model_performance.avg_latency_ms * model_performance.total_count + EXCLUDED.avg_latency_ms * EXCLUDED.total_count) / (model_performance.total_count + EXCLUDED.total_count), avg_cost_per_call = (model_performance.avg_cost_per_call * model_performance.total_count + EXCLUDED.avg_cost_per_call * EXCLUDED.total_count) / (model_performance.total_count + EXCLUDED.total_count), last_used = NOW()`, [model, taskType, success ? 1 : 0, 1, latencyMs, cost]);
  }
  async getBestModel(taskType: string, weights: { cost: number, latency: number, quality: number }) {
    const res = await pool.query(`SELECT model_name, success_count::float / total_count AS quality, avg_latency_ms, avg_cost_per_call FROM model_performance WHERE task_type = $1 AND total_count > 10 ORDER BY (success_count::float / total_count) * $2 - avg_cost_per_call * $3 - avg_latency_ms * $4 DESC LIMIT 1`, [taskType, weights.quality, weights.cost, weights.latency]);
    return res.rows[0]?.model_name || null;
  }
}
