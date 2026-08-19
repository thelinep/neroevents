
import { pool } from '../db/client.js';
import { generateEmbedding } from './embeddings.js';
import { Summarizer } from './Summarizer.js';
export class MemoryManager {
  private summarizer = new Summarizer();
  async retrieveRelevant(query: string, sessionId: string, topK = 10) {
    const emb = await generateEmbedding(query);
    const res = await pool.query(`SELECT content, embedding, 1 - (embedding <=> $1) AS score FROM session_memory WHERE session_id = $2 ORDER BY embedding <=> $1 LIMIT $3`, [emb, sessionId, topK]);
    return res.rows;
  }
  async addMemory(sessionId: string, content: string, metadata = {}) {
    const emb = await generateEmbedding(content);
    await pool.query(`INSERT INTO session_memory (session_id, content, embedding, metadata) VALUES ($1,$2,$3,$4)`, [sessionId, content, emb, metadata]);
    await this.pruneIfNeeded(sessionId);
  }
  async pruneIfNeeded(sessionId: string) {
    const policy = { maxMessages: 100 };
    const count = await pool.query(`SELECT COUNT(*) FROM session_memory WHERE session_id = $1`, [sessionId]);
    if (count.rows[0].count > policy.maxMessages) {
      const toSummarize = await pool.query(`SELECT id, content FROM session_memory WHERE session_id = $1 ORDER BY created_at ASC LIMIT $2`, [sessionId, Math.ceil(policy.maxMessages * 0.3)]);
      const summary = await this.summarizer.summarize(toSummarize.rows.map((r: any) => r.content));
      await pool.query(`DELETE FROM session_memory WHERE id = ANY($1)`, [toSummarize.rows.map((r: any) => r.id)]);
      await this.addMemory(sessionId, summary, { type: 'summary' });
    }
  }
}
