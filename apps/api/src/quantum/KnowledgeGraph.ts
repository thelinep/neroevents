import { pool } from '../memory/store.js';
import { generateEmbedding } from '../memory/embeddings.js';
export class KnowledgeGraph {
  async queryRelevant(query: string, userId: string) { const emb = await generateEmbedding(query); const res = await pool.query(`SELECT id,label,properties,1-(embedding<=>$1) AS score FROM kg_nodes WHERE properties->>'userId'=$2 ORDER BY embedding<=>$1 LIMIT 10`, [emb, userId]); return res.rows; }
  async addNode(label: string, properties: any, embedding?: number[]) { if (!embedding) embedding = await generateEmbedding(`${label} ${JSON.stringify(properties)}`); const res = await pool.query(`INSERT INTO kg_nodes (label, properties, embedding) VALUES ($1,$2,$3) RETURNING id`, [label, properties, embedding]); return res.rows[0].id; }
  async addEdge(source: string, target: string, relationship: string, props = {}) { await pool.query(`INSERT INTO kg_edges (source_id,target_id,relationship,properties) VALUES ($1,$2,$3,$4)`, [source, target, relationship, props]); }
}
