import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import {buildApp} from '../../src/app.js';
import { pool } from '../../src/db/client.js';

type TenantRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';


interface SessionTenant {
  id: string;
  name: string;
  slug: string;
  role: TenantRole;
}

interface SessionUser {
  id: string;
  email: string;
  displayName: string | null;
}

interface TestSession {
  user: SessionUser;
  session: {
    token: string;
  };
  tenant: SessionTenant;
}

interface Project {
  id: string;
  name?: string;
  tenant_id?: string;
  tenantId?: string;
}

interface Agent {
  id: string;
  name?: string;
  tenant_id?: string;
  tenantId?: string;
}

const TEST_RUN_ID = `${Date.now()}-${Math.random()
  .toString(36)
  .slice(2, 10)}`;

function uniqueTestEmail(prefix: string): string {
  return `${prefix}-${TEST_RUN_ID}-${Math.random()
    .toString(36)
    .slice(2, 8)}@m26-3.test`;
}

interface TestSession {
  token: string;
  user: {
    id: string;
    email: string;
    displayName: string | null;
  };
  tenant: SessionTenant;
}




interface SessionTenant {
  id: string;
  name: string;
  slug: string;
  role: TenantRole;
}

interface TestSession {
  token: string;
  session: {
    token: string;
  };
  user: {
    id: string;
    email: string;
    displayName: string | null;
  };
  tenant: SessionTenant;
}

let app!: ReturnType<typeof buildApp>;



async function createTestSession(
  label: string,
): Promise<TestSession> {
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: {
      email: uniqueTestEmail(label),
      password: 'Password123!',
      displayName: label,
    },
  });

  expect(response.statusCode).toBe(201);

  const body = JSON.parse(response.payload);

  expect(body.user?.id).toBeTruthy();
  expect(body.token).toBeTruthy();

  const tenantResult = await pool.query<SessionTenant>(
    `
      SELECT
        t.id,
        t.name,
        t.slug,
        tm.role
      FROM tenant_memberships tm
      JOIN tenants t
        ON t.id = tm.tenant_id
      WHERE tm.user_id = $1
      ORDER BY tm.created_at ASC
      LIMIT 1
    `,
    [body.user.id],
  );

  expect(tenantResult.rows).toHaveLength(1);

  return {
    token: body.token,
    session:{token: body.token},
    user: body.user,
    tenant: tenantResult.rows[0],
  };
}

beforeAll(async () => {
  app = buildApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

function authHeaders(
  session: TestSession,
  tenantId?: string,
): Record<string, string> {
  return {
    authorization: `Bearer ${session.session.token}`,
    ...(tenantId
      ? {
          'x-tenant-id': tenantId,
        }
      : {}),
  };
}

async function createTenant(
  name: string,
  slug: string,
): Promise<string> {
  const result = await pool.query<{ id: string }>(
    `
      INSERT INTO tenants (
        id,
        name,
        slug
      )
      VALUES (
        gen_random_uuid(),
        $1,
        $2
      )
      RETURNING id
    `,
    [name, slug],
  );

  return result.rows[0].id;
}

async function addMembership(
  tenantId: string,
  userId: string,
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER' = 'MEMBER',
): Promise<void> {
  await pool.query(
    `
      INSERT INTO tenant_memberships (
        tenant_id,
        user_id,
        role
      )
      VALUES ($1, $2, $3)
      ON CONFLICT (tenant_id, user_id)
      DO UPDATE SET role = EXCLUDED.role
    `,
    [tenantId, userId, role],
  );
}

async function createProject(
  tenantId: string,
  ownerId: string,
  name: string,
): Promise<Project> {
  const result = await pool.query<Project>(
    `
      INSERT INTO projects (
        id,
        user_id,
        name,
        description,
        tenant_id
      )
      VALUES (
        gen_random_uuid(),
        $1,
        $2,
        $3,
        $4
      )
      RETURNING *
    `,
    [
      ownerId,
      name,
      `M26.3 security test project: ${name}`,
      tenantId,
    ],
  );

  return result.rows[0];
}

async function createPrivateAgent(
  tenantId: string,
  ownerId: string,
  name: string,
): Promise<Agent> {
  const result = await pool.query<Agent>(
    `
      INSERT INTO custom_agents (
        id,
        user_id,
        name,
        description,
        system_prompt,
        model_provider,
        model_name,
        temperature,
        tools,
        is_public,
        tenant_id
      )
      VALUES (
        gen_random_uuid(),
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        false,
        $9
      )
      RETURNING *
    `,
    [
      ownerId,
      name,
      `M26.3 security test agent: ${name}`,
      'You are an M26.3 security test agent.',
      'test',
      'test-model',
      0.5,
      JSON.stringify([]),
      tenantId,
    ],
  );

  return result.rows[0];
}

describe('M26.3 tenant security', () => {
  let app: FastifyInstance;

  let tenantAFilesystem: string;
  let tenantBFiles: string;

  beforeAll(async () => {
    app = await buildApp();

    await app.ready();

    const root = await fs.mkdtemp(
      path.join(
        os.tmpdir(),
        'nevo-m26-3-tenant-security-',
      ),
    );

    tenantAFilesystem = path.join(root, 'tenant-a');
    tenantBFiles = path.join(root, 'tenant-b');

    await fs.mkdir(tenantAFilesystem, {
      recursive: true,
    });

    await fs.mkdir(tenantBFiles, {
      recursive: true,
    });

    await fs.writeFile(
      path.join(tenantAFilesystem, 'tenant-a.txt'),
      'tenant-a-secret',
      'utf8',
    );

    await fs.writeFile(
      path.join(tenantBFiles, 'tenant-b.txt'),
      'tenant-b-secret',
      'utf8',
    );

    process.env.NEVO_WORKSPACE_ROOT = root;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('explicit tenant selection', () => {
    it('rejects protected requests without a tenant selection', async () => {
      const session = await createTestSession(

        'missing-tenant',
      );

      const response = await app.inject({
        method: 'GET',
        url: '/api/projects',
        headers: authHeaders(session),
      });

      expect(response.statusCode).toBe(400);
    });

    it('rejects a tenant the authenticated user does not belong to', async () => {
      const sessionA = await createTestSession(

        'tenant-selection-a',
      );

      const sessionB = await createTestSession(

        'tenant-selection-b',
      );

      expect(sessionA.tenant.id).not.toBe(
        sessionB.tenant.id,
      );

      const response = await app.inject({
        method: 'GET',
        url: '/api/projects',
        headers: authHeaders(
          sessionA,
          sessionB.tenant.id,
        ),
      });

      expect([403, 404]).toContain(response.statusCode);
    });

    it('accepts an explicitly selected tenant when membership exists', async () => {
      const session = await createTestSession(

        'tenant-selection-member',
      );

      const additionalTenant = await createTenant(
        `M26.3 Selected Tenant ${TEST_RUN_ID}`,
        `m26-3-selected-${TEST_RUN_ID}`,
      );

      await addMembership(
        additionalTenant,
        session.user.id,
        'MEMBER',
      );

      const response = await app.inject({
        method: 'GET',
        url: '/api/projects',
        headers: authHeaders(
          session,
          additionalTenant,
        ),
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('project isolation', () => {
    it('allows a tenant to access its own project', async () => {
      const session = await createTestSession(

        'project-owner',
      );

      const project = await createProject(
        session.tenant.id,
        session.user.id,
        `Tenant A Project ${TEST_RUN_ID}`,
      );

      const response = await app.inject({
        method: 'GET',
        url: `/api/projects/${project.id}`,
        headers: authHeaders(
          session,
          session.tenant.id,
        ),
      });

      expect(response.statusCode).toBe(200);
    });

    it('denies access to a project belonging to another tenant', async () => {
      const sessionA = await createTestSession(

        'project-tenant-a',
      );

      const sessionB = await createTestSession(

        'project-tenant-b',
      );

      const projectB = await createProject(
        sessionB.tenant.id,
        sessionB.user.id,
        `Tenant B Project ${TEST_RUN_ID}`,
      );

      const response = await app.inject({
        method: 'GET',
        url: `/api/projects/${projectB.id}`,
        headers: authHeaders(
          sessionA,
          sessionA.tenant.id,
        ),
      });

      expect([403, 404]).toContain(response.statusCode);
    });
  });

  describe('agent isolation', () => {
    it('allows a tenant to access its own private agent', async () => {
      const session = await createTestSession(

        'agent-owner',
      );

      const agent = await createPrivateAgent(
        session.tenant.id,
        session.user.id,
        `Tenant A Agent ${TEST_RUN_ID}`,
      );

      const response = await app.inject({
        method: 'GET',
        url: `/api/agents/${agent.id}`,
        headers: authHeaders(
          session,
          session.tenant.id,
        ),
      });

      expect(response.statusCode).toBe(200);
    });

    it('denies access to another tenant private agent', async () => {
      const sessionA = await createTestSession(

        'agent-tenant-a',
      );

      const sessionB = await createTestSession(

        'agent-tenant-b',
      );

      const agentB = await createPrivateAgent(
        sessionB.tenant.id,
        sessionB.user.id,
        `Tenant B Agent ${TEST_RUN_ID}`,
      );

      const response = await app.inject({
        method: 'GET',
        url: `/api/agents/${agentB.id}`,
        headers: authHeaders(
          sessionA,
          sessionA.tenant.id,
        ),
      });

      expect([403, 404]).toContain(response.statusCode);
    });

    it('does not convert public sharing into mutation authority', async () => {
      const owner = await createTestSession(

        'agent-public-owner',
      );

      const other = await createTestSession(

        'agent-public-other',
      );

      const agent = await createPrivateAgent(
        owner.tenant.id,
        owner.user.id,
        `Shared Agent ${TEST_RUN_ID}`,
      );

      await pool.query(
        `
          UPDATE custom_agents
          SET is_public = true
          WHERE id = $1
        `,
        [agent.id],
      );

      const response = await app.inject({
        method: 'PUT',
        url: `/api/agents/${agent.id}`,
        headers: authHeaders(
          other,
          other.tenant.id,
        ),
        payload: {
          name: `Unauthorized Mutation ${TEST_RUN_ID}`,
        },
      });

      expect([403, 404]).toContain(response.statusCode);
    });
  });

  describe('filesystem isolation', () => {
    it('requires authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/files/list',
      });

      expect(response.statusCode).toBe(401);
    });

    it('requires an explicit tenant', async () => {
      const session = await createTestSession(

        'filesystem-no-tenant',
      );

      const response = await app.inject({
        method: 'GET',
        url: '/api/files/list',
        headers: authHeaders(session),
      });

      expect(response.statusCode).toBe(400);
    });

    // const tenantADir = path.resolve(process.cwd(), 'tenant-a');



  it('allows access to the current tenant filesystem', async () => {
  const session = await createTestSession(
    'filesystem-current',
  );

  const tenantADir = path.resolve(process.cwd(), 'tenant-a');
  const tenantAFile = path.join(tenantADir, 'tenant-a.txt');

  await fs.mkdir(tenantADir, { recursive: true });
  await fs.writeFile(
    tenantAFile,
    'tenant-a test file',
    'utf8',
  );

  try {
    const response = await app.inject({
      method: 'GET',
      url: '/api/files/list?dir=tenant-a',
      headers: authHeaders(
        session,
        session.tenant.id,
      ),
    });

    expect(response.statusCode).toBe(200);

    const body = response.json<{
      items: Array<{
        name: string;
      }>;
    }>();

    expect(
      body.items.some(
        (item) => item.name === 'tenant-a.txt',
      ),
    ).toBe(true);
  } finally {
    await fs.rm(tenantADir, {
      recursive: true,
      force: true,
    });
  }
});

    it('rejects traversal outside the tenant filesystem', async () => {
      const session = await createTestSession(

        'filesystem-traversal',
      );

      const response = await app.inject({
        method: 'GET',
        url: '/api/files/file?file=../tenant-b/tenant-b.txt',
        headers: authHeaders(
          session,
          session.tenant.id,
        ),
      });

      expect([400, 403, 404]).toContain(
        response.statusCode,
      );
    });

    it('cannot select another tenant through the filesystem path', async () => {
      const session = await createTestSession(

        'filesystem-cross-tenant',
      );

      const response = await app.inject({
        method: 'GET',
        url: '/api/files/file?file=tenant-b/tenant-b.txt',
        headers: authHeaders(
          session,
          session.tenant.id,
        ),
      });

      expect([403, 404]).toContain(response.statusCode);
    });
  });

  describe('anonymous access regression', () => {
    it('rejects unauthenticated project access', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/projects',
      });

      expect(response.statusCode).toBe(401);
    });

    it('rejects unauthenticated agent access', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/agents',
      });

      expect(response.statusCode).toBe(401);
    });

    it('rejects unauthenticated file access', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/files/list',
      });

      expect(response.statusCode).toBe(401);
    });
  });
});