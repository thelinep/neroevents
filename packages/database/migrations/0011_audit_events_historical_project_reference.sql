-- ============================================================
-- M26.5 — Preserve project references in audit history
-- ============================================================

ALTER TABLE audit_events
  DROP CONSTRAINT IF EXISTS audit_events_project_id_fkey;
