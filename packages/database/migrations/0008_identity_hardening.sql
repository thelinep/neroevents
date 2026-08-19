-- M04 Identity hardening
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_user_active ON sessions(user_id, revoked_at, expires_at);

ALTER TABLE users
  ADD CONSTRAINT users_email_length CHECK (char_length(email) BETWEEN 3 AND 320);

ALTER TABLE sessions
  ADD CONSTRAINT sessions_token_hash_length CHECK (char_length(token_hash) = 64);
