-- Fine‑tuning datasets
CREATE TABLE IF NOT EXISTS datasets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  file_path TEXT NOT NULL,
  format TEXT NOT NULL,              -- 'jsonl', 'csv'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fine‑tuning jobs
CREATE TABLE IF NOT EXISTS fine_tune_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  base_model TEXT NOT NULL,
  dataset_id UUID REFERENCES datasets(id),
  status TEXT NOT NULL,              -- 'pending', 'running', 'completed', 'failed'
  job_id TEXT,                       -- external job ID from provider
  result_model_id UUID REFERENCES custom_models(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- History/audit log
CREATE TABLE IF NOT EXISTS history_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  action TEXT NOT NULL,              -- 'project_created', 'task_approved', etc.
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_history_user_id ON history_entries(user_id);
CREATE INDEX idx_history_project_id ON history_entries(project_id);
CREATE INDEX idx_history_created_at ON history_entries(created_at);

-- Memory (RAG) – session-level memory
CREATE TABLE IF NOT EXISTS session_memory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding VECTOR(1536),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_session_memory_embedding ON session_memory USING ivfflat (embedding vector_cosine_ops);