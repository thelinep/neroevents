-- ============================================================
-- M26.5 — Tenant-scoped audit events
-- ============================================================

ALTER TABLE audit_events
  ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- Existing audit_events is currently empty, so this can be
-- hardened directly without a data backfill.

ALTER TABLE audit_events
  ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE audit_events
  ADD CONSTRAINT audit_events_tenant_id_fkey
  FOREIGN KEY (tenant_id)
  REFERENCES tenants(id)
  ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_audit_events_tenant_created
  ON audit_events(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_events_tenant_project_created
  ON audit_events(tenant_id, project_id, created_at DESC);
