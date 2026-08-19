-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Model performance tracking
CREATE TABLE IF NOT EXISTS model_performance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  model_name TEXT NOT NULL,
  task_type TEXT NOT NULL,           -- planning, coding, testing, etc.
  success_count INT DEFAULT 0,
  total_count INT DEFAULT 0,
  avg_latency_ms FLOAT DEFAULT 0,
  avg_cost_per_call FLOAT DEFAULT 0,
  last_used TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(model_name, task_type)
);

-- Knowledge Graph Nodes
CREATE TABLE IF NOT EXISTS kg_nodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  label TEXT NOT NULL,               -- 'project', 'task', 'file', 'agent', 'user', 'model'
  properties JSONB NOT NULL DEFAULT '{}',
  embedding VECTOR(1536),            -- for semantic search
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_kg_nodes_embedding ON kg_nodes USING ivfflat (embedding vector_cosine_ops);

-- Knowledge Graph Edges
CREATE TABLE IF NOT EXISTS kg_edges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id UUID NOT NULL REFERENCES kg_nodes(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES kg_nodes(id) ON DELETE CASCADE,
  relationship TEXT NOT NULL,        -- 'depends_on', 'created_by', 'similar_to'
  properties JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);