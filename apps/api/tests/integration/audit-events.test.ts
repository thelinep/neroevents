import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
} from 'vitest';

import type { FastifyInstance } from 'fastify';

import { buildApp } from '../../src/app.js';
import { pool } from '../../src/db/client.js';

type TenantRole =
  | 'OWNER'
  | 'ADMIN'
  | 'MEMBER'
  | 'VIEWER';

interface SessionTenant {
  id: string;
  name: string;
  slug: string;
  role: TenantRole;
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

const TEST_RUN_ID = `${Date.now()}-${Math.random()
  .toString(36)
  .slice(2, 10)}`;

function uniqueEmail(label: string): string {
  return `${label}-${TEST_RUN_ID}-${Math.random()
    .toString(36)
    .slice(2, 8)}@m26-5.test`;
}

let app: FastifyInstance;

async function createSession(
  label: string,
): Promise<TestSession> {
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: {
      email: uniqueEmail(label),
      password: 'Password123!',
      displayName: label,
    },
  });

  expect(response.statusCode).toBe(201);

  const body = response.json();

  const tenantResult =
    await pool.query<SessionTenant>(
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
    user: body.user,
    tenant: tenantResult.rows[0],
  };
}

function authHeaders(
  session: TestSession,
): Record<string, string> {
  return {
    authorization: `Bearer ${session.token}`,
    'x-tenant-id': session.tenant.id,
  };
}

describe('M26.5 audit events', () => {
  beforeAll(async () => {
    app = buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('records a tenant-scoped project creation event', async () => {
    const session = await createSession(
      'audit-project-create',
    );

    const projectName =
      `M26.5 audit project ${TEST_RUN_ID}`;

    const response = await app.inject({
      method: 'POST',
      url: '/api/projects',
      headers: authHeaders(session),
      payload: {
        name: projectName,
        description: 'M26.5 audit integration test',
      },
    });

    expect(response.statusCode).toBe(201);

    const project = response.json<{
      id: string;
    }>();

    const result = await pool.query<{
      action: string;
      tenant_id: string;
      user_id: string;
      project_id: string;
      resource_type: string;
      resource_id: string;
    }>(
      `
        SELECT
          action,
          tenant_id,
          user_id,
          project_id,
          resource_type,
          resource_id
        FROM audit_events
        WHERE action = 'project:create'
          AND project_id = $1
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [project.id],
    );

    expect(result.rows).toHaveLength(1);

    expect(result.rows[0]).toMatchObject({
      action: 'project:create',
      tenant_id: session.tenant.id,
      user_id: session.user.id,
      project_id: project.id,
      resource_type: 'project',
      resource_id: project.id,
    });
  });

  it('preserves a project deletion audit event after deletion', async () => {
    const session = await createSession(
      'audit-project-delete',
    );

    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/projects',
      headers: authHeaders(session),
      payload: {
        name: `M26.5 delete audit ${TEST_RUN_ID}`,
        description: 'M26.5 deletion audit test',
      },
    });

    expect(createResponse.statusCode).toBe(201);

    const project = createResponse.json<{
      id: string;
    }>();

    const deleteResponse = await app.inject({
      method: 'DELETE',
      url: `/api/projects/${project.id}`,
      headers: authHeaders(session),
    });

    expect(deleteResponse.statusCode).toBe(204);

    const result = await pool.query<{
      action: string;
      project_id: string;
      tenant_id: string;
      user_id: string;
      project_exists: boolean;
    }>(
      `
        SELECT
          ae.action,
          ae.project_id,
          ae.tenant_id,
          ae.user_id,
          (p.id IS NOT NULL) AS project_exists
        FROM audit_events ae
        LEFT JOIN projects p
          ON p.id = ae.project_id
        WHERE ae.action = 'project:delete'
          AND ae.project_id = $1
        ORDER BY ae.created_at DESC
        LIMIT 1
      `,
      [project.id],
    );

    expect(result.rows).toHaveLength(1);

    expect(result.rows[0]).toMatchObject({
      action: 'project:delete',
      project_id: project.id,
      tenant_id: session.tenant.id,
      user_id: session.user.id,
      project_exists: false,
    });
  });

  it('keeps audit events tenant-scoped', async () => {
    const sessionA = await createSession(
      'audit-tenant-a',
    );

    const sessionB = await createSession(
      'audit-tenant-b',
    );

    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/projects',
      headers: authHeaders(sessionA),
      payload: {
        name: `M26.5 tenant isolation ${TEST_RUN_ID}`,
        description: 'Tenant audit isolation test',
      },
    });

    expect(createResponse.statusCode).toBe(201);

    const project = createResponse.json<{
      id: string;
    }>();

    const result = await pool.query<{
      tenant_id: string;
      project_id: string;
    }>(
      `
        SELECT tenant_id, project_id
        FROM audit_events
        WHERE project_id = $1
          AND action = 'project:create'
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [project.id],
    );

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].tenant_id).toBe(
      sessionA.tenant.id,
    );
    expect(result.rows[0].tenant_id).not.toBe(
      sessionB.tenant.id,
    );
  });
});
