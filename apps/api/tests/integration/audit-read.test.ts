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

interface AuditRow {
  id: string;
  tenant_id: string;
  user_id: string | null;
  project_id: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface AuditResponse {
  items: AuditRow[];
  pagination: {
    limit: number;
    offset: number;
  };
}

const TEST_RUN_ID = `${Date.now()}-${Math.random()
  .toString(36)
  .slice(2, 10)}`;

function uniqueEmail(label: string): string {
  return `${label}-${TEST_RUN_ID}-${Math.random()
    .toString(36)
    .slice(2, 8)}@m26-6.test`;
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

  const body = response.json<{
    token: string;
    user: TestSession['user'];
  }>();

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

async function seedAuditEvent(input: {
  tenantId: string;
  userId?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await pool.query(
    `
      INSERT INTO audit_events (
        tenant_id,
        user_id,
        action,
        resource_type,
        resource_id,
        metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6)
    `,
    [
      input.tenantId,
      input.userId ?? null,
      input.action,
      input.resourceType ?? null,
      input.resourceId ?? null,
      JSON.stringify(input.metadata ?? {}),
    ],
  );
}

async function readAudit(
  session: TestSession,
  query = '',
): Promise<{
  statusCode: number;
  body: AuditResponse | { error: string };
}> {
  const response = await app.inject({
    method: 'GET',
    url: `/api/audit${query}`,
    headers: authHeaders(session),
  });

  return {
    statusCode: response.statusCode,
    body: response.json(),
  };
}

describe('GET /audit', () => {
  beforeAll(async () => {
    app = buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('allows OWNER to read audit events', async () => {
    const session = await createSession('audit-read-owner');

    await seedAuditEvent({
      tenantId: session.tenant.id,
      userId: session.user.id,
      action: 'project:create',
      resourceType: 'project',
      resourceId: 'owner-project',
    });

    const result = await readAudit(session);

    expect(result.statusCode).toBe(200);

    const body = result.body as AuditResponse;

    expect(body.items.length).toBeGreaterThanOrEqual(1);
    expect(body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          tenant_id: session.tenant.id,
          action: 'project:create',
        }),
      ]),
    );
  });

it('allows ADMIN to read audit events', async () => {
  const owner = await createSession(
    'audit-read-admin-owner',
  );

  const admin = await createSession(
    'audit-read-admin',
  );

  // Move the ADMIN user's membership into the OWNER tenant.
  await pool.query(
    `
      DELETE FROM tenant_memberships
      WHERE user_id = $1
        AND tenant_id = $2
    `,
    [admin.user.id, admin.tenant.id],
  );

  await pool.query(
    `
      INSERT INTO tenant_memberships (
        tenant_id,
        user_id,
        role
      )
      VALUES ($1, $2, 'ADMIN')
    `,
    [owner.tenant.id, admin.user.id],
  );

  const adminTenant = await pool.query<SessionTenant>(
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
        AND tm.tenant_id = $2
    `,
    [admin.user.id, owner.tenant.id],
  );

  expect(adminTenant.rows).toHaveLength(1);

  const adminSession: TestSession = {
    ...admin,
    tenant: adminTenant.rows[0],
  };

  await seedAuditEvent({
    tenantId: owner.tenant.id,
    userId: admin.user.id,
    action: 'project:update',
    resourceType: 'project',
    resourceId: 'admin-project',
  });

  const result = await readAudit(adminSession);

  expect(result.statusCode).toBe(200);

  const body = result.body as AuditResponse;

  expect(body.items).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        tenant_id: owner.tenant.id,
        action: 'project:update',
      }),
    ]),
  );
});

  it('rejects MEMBER with 403', async () => {
    const session = await createSession('audit-read-member');

    await pool.query(
      `
        UPDATE tenant_memberships
        SET role = 'MEMBER'
        WHERE user_id = $1
          AND tenant_id = $2
      `,
      [session.user.id, session.tenant.id],
    );

    const memberTenant = await pool.query<SessionTenant>(
      `
        SELECT
          t.id,
          t.name,
          t.slug,
          tm.role
        FROM tenant_memberships tm
        JOIN tenants t ON t.id = tm.tenant_id
        WHERE tm.user_id = $1
          AND tm.tenant_id = $2
      `,
      [session.user.id, session.tenant.id],
    );

    const memberSession: TestSession = {
      ...session,
      tenant: memberTenant.rows[0],
    };

    const result = await readAudit(memberSession);

    expect(result.statusCode).toBe(403);
  });

  it('rejects VIEWER with 403', async () => {
    const session = await createSession('audit-read-viewer');

    await pool.query(
      `
        UPDATE tenant_memberships
        SET role = 'VIEWER'
        WHERE user_id = $1
          AND tenant_id = $2
      `,
      [session.user.id, session.tenant.id],
    );

    const viewerTenant = await pool.query<SessionTenant>(
      `
        SELECT
          t.id,
          t.name,
          t.slug,
          tm.role
        FROM tenant_memberships tm
        JOIN tenants t ON t.id = tm.tenant_id
        WHERE tm.user_id = $1
          AND tm.tenant_id = $2
      `,
      [session.user.id, session.tenant.id],
    );

    const viewerSession: TestSession = {
      ...session,
      tenant: viewerTenant.rows[0],
    };

    const result = await readAudit(viewerSession);

    expect(result.statusCode).toBe(403);
  });

  it("returns only the caller's tenant events", async () => {
    const sessionA = await createSession(
      'audit-read-isolation-a',
    );
    const sessionB = await createSession(
      'audit-read-isolation-b',
    );

    await seedAuditEvent({
      tenantId: sessionA.tenant.id,
      userId: sessionA.user.id,
      action: 'tenant-a:event',
      resourceType: 'test',
      resourceId: 'tenant-a',
    });

    await seedAuditEvent({
      tenantId: sessionB.tenant.id,
      userId: sessionB.user.id,
      action: 'tenant-b:event',
      resourceType: 'test',
      resourceId: 'tenant-b',
    });

    const result = await readAudit(sessionA);

    expect(result.statusCode).toBe(200);

    const body = result.body as AuditResponse;

    expect(
      body.items.some(
        (item) => item.action === 'tenant-a:event',
      ),
    ).toBe(true);

    expect(
      body.items.some(
        (item) => item.action === 'tenant-b:event',
      ),
    ).toBe(false);

    expect(
      body.items.every(
        (item) =>
          item.tenant_id === sessionA.tenant.id,
      ),
    ).toBe(true);
  });

  it('filters by action', async () => {
    const session = await createSession(
      'audit-read-action',
    );

    await seedAuditEvent({
      tenantId: session.tenant.id,
      action: 'project:create',
    });

    await seedAuditEvent({
      tenantId: session.tenant.id,
      action: 'project:update',
    });

    const result = await readAudit(
      session,
      '?action=project%3Acreate',
    );

    expect(result.statusCode).toBe(200);

    const body = result.body as AuditResponse;

    expect(body.items.length).toBeGreaterThan(0);
    expect(
      body.items.every(
        (item) => item.action === 'project:create',
      ),
    ).toBe(true);
  });

  it('filters by resourceType', async () => {
    const session = await createSession(
      'audit-read-resource',
    );

    await seedAuditEvent({
      tenantId: session.tenant.id,
      action: 'resource:test',
      resourceType: 'project',
    });

    await seedAuditEvent({
      tenantId: session.tenant.id,
      action: 'resource:test',
      resourceType: 'agent',
    });

    const result = await readAudit(
      session,
      '?resourceType=project',
    );

    expect(result.statusCode).toBe(200);

    const body = result.body as AuditResponse;

    expect(body.items.length).toBeGreaterThan(0);
    expect(
      body.items.every(
        (item) => item.resource_type === 'project',
      ),
    ).toBe(true);
  });

  it('filters by userId', async () => {
    const sessionA = await createSession(
      'audit-read-user-a',
    );
    const sessionB = await createSession(
      'audit-read-user-b',
    );

    await seedAuditEvent({
      tenantId: sessionA.tenant.id,
      userId: sessionA.user.id,
      action: 'user-a:event',
    });

    await seedAuditEvent({
      tenantId: sessionA.tenant.id,
      userId: sessionB.user.id,
      action: 'user-b:event',
    });

    const result = await readAudit(
      sessionA,
      `?userId=${encodeURIComponent(sessionA.user.id)}`,
    );

    expect(result.statusCode).toBe(200);

    const body = result.body as AuditResponse;

    expect(body.items.length).toBeGreaterThan(0);
    expect(
      body.items.every(
        (item) => item.user_id === sessionA.user.id,
      ),
    ).toBe(true);
  });

  it('applies limit and offset pagination', async () => {
    const session = await createSession(
      'audit-read-pagination',
    );

    for (let index = 0; index < 5; index += 1) {
      await seedAuditEvent({
        tenantId: session.tenant.id,
        action: `pagination:${index}`,
      });
    }

    const first = await readAudit(
      session,
      '?limit=2&offset=0',
    );

    const second = await readAudit(
      session,
      '?limit=2&offset=2',
    );

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);

    const firstBody = first.body as AuditResponse;
    const secondBody = second.body as AuditResponse;

    expect(firstBody.items).toHaveLength(2);
    expect(secondBody.items).toHaveLength(2);

    expect(firstBody.pagination).toEqual({
      limit: 2,
      offset: 0,
    });

    expect(secondBody.pagination).toEqual({
      limit: 2,
      offset: 2,
    });

    expect(firstBody.items[0].id).not.toBe(
      secondBody.items[0].id,
    );
  });

  it('caps limit at 100', async () => {
    const session = await createSession(
      'audit-read-limit',
    );

    const result = await readAudit(
      session,
      '?limit=150',
    );

    expect(result.statusCode).toBe(200);

    const body = result.body as AuditResponse;

    expect(body.pagination.limit).toBe(100);
    expect(body.items.length).toBeLessThanOrEqual(100);
  });

  it('normalizes a negative offset to 0', async () => {
    const session = await createSession(
      'audit-read-negative-offset',
    );

    const result = await readAudit(
      session,
      '?limit=2&offset=-50',
    );

    expect(result.statusCode).toBe(200);

    const body = result.body as AuditResponse;

    expect(body.pagination).toEqual({
      limit: 2,
      offset: 0,
    });
  });

  it('ignores an injected tenantId and uses the request tenant', async () => {
    const sessionA = await createSession(
      'audit-read-injected-tenant-a',
    );
    const sessionB = await createSession(
      'audit-read-injected-tenant-b',
    );

    await seedAuditEvent({
      tenantId: sessionA.tenant.id,
      userId: sessionA.user.id,
      action: 'tenant-a:visible',
    });

    await seedAuditEvent({
      tenantId: sessionB.tenant.id,
      userId: sessionB.user.id,
      action: 'tenant-b:hidden',
    });

    const result = await readAudit(
      sessionA,
      `?tenantId=${encodeURIComponent(
        sessionB.tenant.id,
      )}`,
    );

    expect(result.statusCode).toBe(200);

    const body = result.body as AuditResponse;

    expect(
      body.items.some(
        (item) => item.action === 'tenant-a:visible',
      ),
    ).toBe(true);

    expect(
      body.items.some(
        (item) => item.action === 'tenant-b:hidden',
      ),
    ).toBe(false);

    expect(
      body.items.every(
        (item) =>
          item.tenant_id === sessionA.tenant.id,
      ),
    ).toBe(true);
  });
});