-- Security/operational indexes. All statements are idempotent.
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_project_tasks_project_status ON project_tasks(project_id, status);
CREATE INDEX IF NOT EXISTS idx_custom_agents_user_id ON custom_agents(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_models_user_id ON custom_models(user_id);
CREATE INDEX IF NOT EXISTS idx_history_user_created ON history_entries(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_session_memory_session_created ON session_memory(session_id, created_at DESC);
