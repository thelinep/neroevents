-- ============================================================
-- M26.1 — Tenant & Membership Foundation
-- ============================================================

-- ------------------------------------------------------------
-- Tenants
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- Tenant memberships
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS tenant_memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL
    REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL
    REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT tenant_memberships_unique
    UNIQUE (tenant_id, user_id),

  CONSTRAINT tenant_memberships_role_check
    CHECK (
      role IN ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER')
    )
);

CREATE INDEX IF NOT EXISTS idx_tenant_memberships_tenant_id
  ON tenant_memberships(tenant_id);

CREATE INDEX IF NOT EXISTS idx_tenant_memberships_user_id
  ON tenant_memberships(user_id);

-- ------------------------------------------------------------
-- Add tenant ownership to existing resources
-- ------------------------------------------------------------

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS tenant_id UUID;

ALTER TABLE custom_agents
  ADD COLUMN IF NOT EXISTS tenant_id UUID;

ALTER TABLE custom_models
  ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- ------------------------------------------------------------
-- Create one personal tenant for every existing user
-- ------------------------------------------------------------

INSERT INTO tenants (id, name, slug)
SELECT
  u.id,
  COALESCE(NULLIF(TRIM(u.display_name), ''), split_part(u.email, '@', 1)),
  'personal-' || u.id::text
FROM users u
WHERE NOT EXISTS (
  SELECT 1
  FROM tenants t
  WHERE t.id = u.id
);

-- ------------------------------------------------------------
-- Make every existing user the OWNER of their tenant
-- ------------------------------------------------------------

INSERT INTO tenant_memberships (
  tenant_id,
  user_id,
  role
)
SELECT
  u.id,
  u.id,
  'OWNER'
FROM users u
WHERE NOT EXISTS (
  SELECT 1
  FROM tenant_memberships tm
  WHERE tm.tenant_id = u.id
    AND tm.user_id = u.id
);

-- ------------------------------------------------------------
-- Backfill existing resources
-- ------------------------------------------------------------

UPDATE projects
SET tenant_id = user_id
WHERE tenant_id IS NULL;

UPDATE custom_agents
SET tenant_id = user_id
WHERE tenant_id IS NULL;

UPDATE custom_models
SET tenant_id = user_id
WHERE tenant_id IS NULL;

-- ------------------------------------------------------------
-- Enforce tenant ownership
-- ------------------------------------------------------------

ALTER TABLE projects
  ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE custom_agents
  ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE custom_models
  ALTER COLUMN tenant_id SET NOT NULL;

-- ------------------------------------------------------------
-- Foreign keys
-- ------------------------------------------------------------

ALTER TABLE projects
  ADD CONSTRAINT projects_tenant_id_fkey
  FOREIGN KEY (tenant_id)
  REFERENCES tenants(id)
  ON DELETE CASCADE;

ALTER TABLE custom_agents
  ADD CONSTRAINT custom_agents_tenant_id_fkey
  FOREIGN KEY (tenant_id)
  REFERENCES tenants(id)
  ON DELETE CASCADE;

ALTER TABLE custom_models
  ADD CONSTRAINT custom_models_tenant_id_fkey
  FOREIGN KEY (tenant_id)
  REFERENCES tenants(id)
  ON DELETE CASCADE;

-- ------------------------------------------------------------
-- Tenant indexes
-- ------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_projects_tenant_id
  ON projects(tenant_id);

CREATE INDEX IF NOT EXISTS idx_custom_agents_tenant_id
  ON custom_agents(tenant_id);

CREATE INDEX IF NOT EXISTS idx_custom_models_tenant_id
  ON custom_models(tenant_id);
