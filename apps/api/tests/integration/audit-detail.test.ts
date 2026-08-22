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

interface AuditEvent {
  id: string;
  tenant_id: string;
  user_id: string | null;
  project_id: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  metadata: Record<string, unknown>;
  created_at: Date;
}

interface AuditError {
  error: string;
}

const TEST_RUN_ID = `${Date.now()}-${Math.random()
  .toString(36)
  .slice(2, 10)}`;

function uniqueEmail(label: string): string {
  return `${label}-${TEST_RUN_ID}-${Math.random()
    .toString(36)
    .slice(2, 8)}@m27-2.test`;
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

async function seedAuditEvent(input: {
  tenantId: string;
  userId?: string | null;
  action: string;
  resourceType?: string | null;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<string> {
  const result = await pool.query<{ id: string }>(
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
      RETURNING id
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

  expect(result.rows).toHaveLength(1);

  return result.rows[0].id;
}

async function readAuditDetail(
  session: TestSession,
  id: string,
): Promise<{
  statusCode: number;
  body: AuditEvent | AuditError;
}> {
  const response = await app.inject({
    method: 'GET',
    url: `/api/audit/${id}`,
    headers: authHeaders(session),
  });

  return {
    statusCode: response.statusCode,
    body: response.json(),
  };
}

describe('M27.2 audit detail API', () => {
  beforeAll(async () => {
    app = buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('allows OWNER to read event', async () => {
    const session = await createSession(
      'audit-detail-owner',
    );

    const id = await seedAuditEvent({
      tenantId: session.tenant.id,
      userId: session.user.id,
      action: 'project:create',
      resourceType: 'project',
      resourceId: 'owner-project',
      metadata: {
        milestone: 'M27.2',
      },
    });

    const result = await readAuditDetail(
      session,
      id,
    );

    expect(result.statusCode).toBe(200);

    expect(result.body).toMatchObject({
      id,
      tenant_id: session.tenant.id,
      user_id: session.user.id,
      action: 'project:create',
      resource_type: 'project',
      resource_id: 'owner-project',
      metadata: {
        milestone: 'M27.2',
      },
    });
  });

  it('allows ADMIN to read event', async () => {
    const owner = await createSession(
      'audit-detail-admin-owner',
    );

    const admin = await createSession(
      'audit-detail-admin',
    );

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

    const adminTenant =
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
            AND tm.tenant_id = $2
        `,
        [admin.user.id, owner.tenant.id],
      );

    expect(adminTenant.rows).toHaveLength(1);

    const adminSession: TestSession = {
      ...admin,
      tenant: adminTenant.rows[0],
    };

    const id = await seedAuditEvent({
      tenantId: owner.tenant.id,
      userId: admin.user.id,
      action: 'project:update',
      resourceType: 'project',
      resourceId: 'admin-project',
    });

    const result = await readAuditDetail(
      adminSession,
      id,
    );

    expect(result.statusCode).toBe(200);

    expect(result.body).toMatchObject({
      id,
      tenant_id: owner.tenant.id,
      action: 'project:update',
    });
  });

  it('rejects MEMBER with 403', async () => {
    const session = await createSession(
      'audit-detail-member',
    );

    await pool.query(
      `
        UPDATE tenant_memberships
        SET role = 'MEMBER'
        WHERE user_id = $1
          AND tenant_id = $2
      `,
      [session.user.id, session.tenant.id],
    );

    const memberTenant =
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
            AND tm.tenant_id = $2
        `,
        [session.user.id, session.tenant.id],
      );

    expect(memberTenant.rows).toHaveLength(1);

    const memberSession: TestSession = {
      ...session,
      tenant: memberTenant.rows[0],
    };

    const id = await seedAuditEvent({
      tenantId: session.tenant.id,
      userId: session.user.id,
      action: 'member:event',
    });

    const result = await readAuditDetail(
      memberSession,
      id,
    );

    expect(result.statusCode).toBe(403);
    expect(result.body).toEqual({
      error: expect.any(String),
    });
  });

  it('rejects VIEWER with 403', async () => {
    const session = await createSession(
      'audit-detail-viewer',
    );

    await pool.query(
      `
        UPDATE tenant_memberships
        SET role = 'VIEWER'
        WHERE user_id = $1
          AND tenant_id = $2
      `,
      [session.user.id, session.tenant.id],
    );

    const viewerTenant =
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
            AND tm.tenant_id = $2
        `,
        [session.user.id, session.tenant.id],
      );

    expect(viewerTenant.rows).toHaveLength(1);

    const viewerSession: TestSession = {
      ...session,
      tenant: viewerTenant.rows[0],
    };

    const id = await seedAuditEvent({
      tenantId: session.tenant.id,
      userId: session.user.id,
      action: 'viewer:event',
    });

    const result = await readAuditDetail(
      viewerSession,
      id,
    );

    expect(result.statusCode).toBe(403);
    expect(result.body).toEqual({
      error: expect.any(String),
    });
  });

  it('returns 401 for unauthenticated requests', async () => {
    const session = await createSession(
      'audit-detail-unauthenticated',
    );

    const id = await seedAuditEvent({
      tenantId: session.tenant.id,
      userId: session.user.id,
      action: 'unauthenticated:event',
    });

    const response = await app.inject({
      method: 'GET',
      url: `/api/audit/${id}`,
    });

    expect(response.statusCode).toBe(401);

    expect(response.json()).toEqual({
      error: expect.any(String),
    });
  });

  it('returns 404 for a missing event', async () => {
    const session = await createSession(
      'audit-detail-missing',
    );

    const missingId =
      '00000000-0000-4000-8000-000000000000';

    const result = await readAuditDetail(
      session,
      missingId,
    );

    expect(result.statusCode).toBe(404);

    expect(result.body).toEqual({
      error: expect.any(String),
    });
  });

  it('returns 404 for a foreign-tenant event', async () => {
    const owner = await createSession(
      'audit-detail-foreign-owner',
    );

    const attacker = await createSession(
      'audit-detail-foreign-attacker',
    );

    const id = await seedAuditEvent({
      tenantId: owner.tenant.id,
      userId: owner.user.id,
      action: 'foreign:event',
      resourceType: 'secret',
      resourceId: 'foreign-resource',
    });

    const result = await readAuditDetail(
      attacker,
      id,
    );

    expect(result.statusCode).toBe(404);

    expect(result.body).toEqual({
      error: expect.any(String),
    });
  });

  it('returns 400 for a malformed UUID', async () => {
    const session = await createSession(
      'audit-detail-malformed',
    );

    const result = await readAuditDetail(
      session,
      'not-a-uuid',
    );

    expect(result.statusCode).toBe(400);

    expect(result.body).toEqual({
      error: expect.any(String),
    });
  });

  it('returns a deterministic event shape', async () => {
    const session = await createSession(
      'audit-detail-shape',
    );

    const id = await seedAuditEvent({
      tenantId: session.tenant.id,
      userId: session.user.id,
      action: 'shape:test',
      resourceType: 'test',
      resourceId: 'shape-resource',
      metadata: {
        milestone: 'M27.2',
        deterministic: true,
      },
    });

    const result = await readAuditDetail(
      session,
      id,
    );

    expect(result.statusCode).toBe(200);

    const body = result.body as AuditEvent;

    expect(Object.keys(body).sort()).toEqual([
      'action',
      'created_at',
      'id',
      'metadata',
      'project_id',
      'resource_id',
      'resource_type',
      'tenant_id',
      'user_id',
    ]);

    expect(body).toMatchObject({
      id,
      tenant_id: session.tenant.id,
      user_id: session.user.id,
      project_id: null,
      action: 'shape:test',
      resource_type: 'test',
      resource_id: 'shape-resource',
      metadata: {
        milestone: 'M27.2',
        deterministic: true,
      },
    });

    expect(typeof body.created_at).toBe(
      'string',
    );
  });

  it('matches the collection event', async () => {
    const session = await createSession(
      'audit-detail-collection-match',
    );

    const id = await seedAuditEvent({
      tenantId: session.tenant.id,
      userId: session.user.id,
      action: 'collection:match',
      resourceType: 'project',
      resourceId: 'collection-resource',
      metadata: {
        source: 'M27.2',
      },
    });

    const detail = await readAuditDetail(
      session,
      id,
    );

    expect(detail.statusCode).toBe(200);

    const listResponse = await app.inject({
      method: 'GET',
      url: '/api/audit',
      headers: authHeaders(session),
    });

    expect(listResponse.statusCode).toBe(200);

    const listBody =
      listResponse.json<{
        items: AuditEvent[];
      }>();

    const listEvent = listBody.items.find(
      (item) => item.id === id,
    );

    expect(listEvent).toBeDefined();

    expect(detail.body).toEqual(
      listEvent,
    );
  });
});