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

const TEST_RUN_ID = `${Date.now()}-${Math.random()
  .toString(36)
  .slice(2, 10)}`;

function uniqueEmail(label: string): string {
  return `${label}-${TEST_RUN_ID}-${Math.random()
    .toString(36)
    .slice(2, 8)}@m27-5.test`;
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

async function setRole(
  session: TestSession,
  role: TenantRole,
): Promise<void> {
  await pool.query(
    `
      UPDATE tenant_memberships
      SET role = $1
      WHERE tenant_id = $2
        AND user_id = $3
    `,
    [
      role,
      session.tenant.id,
      session.user.id,
    ],
  );

  session.tenant.role = role;
}

async function seedAuditEvent(
  session: TestSession,
  overrides: Partial<{
    action: string;
    resourceType: string;
    resourceId: string;
    metadata: Record<string, unknown>;
    projectId: string | null;
  }> = {},
): Promise<AuditEvent> {
  const result = await pool.query<AuditEvent>(
    `
      INSERT INTO audit_events (
        tenant_id,
        user_id,
        project_id,
        action,
        resource_type,
        resource_id,
        metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING
        id,
        tenant_id,
        user_id,
        project_id,
        action,
        resource_type,
        resource_id,
        metadata,
        created_at
    `,
    [
      session.tenant.id,
      session.user.id,
      overrides.projectId ?? null,
      overrides.action ??
        'governance:test',
      overrides.resourceType ??
        'test',
      overrides.resourceId ??
        `m27-5-${TEST_RUN_ID}`,
      JSON.stringify(
        overrides.metadata ?? {
          milestone: 'M27.5',
          immutable: true,
        },
      ),
    ],
  );

  expect(result.rows).toHaveLength(1);

  return result.rows[0];
}

describe('M27.5 audit governance', () => {
  beforeAll(async () => {
    app = buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('does not expose a POST audit mutation endpoint', async () => {
    const session = await createSession(
      'governance-post',
    );

    const response = await app.inject({
      method: 'POST',
      url: '/api/audit',
      headers: authHeaders(session),
      payload: {
        action: 'governance:forged',
      },
    });

    expect(response.statusCode).toBe(404);
  });

  it('does not expose a PATCH audit mutation endpoint', async () => {
    const session = await createSession(
      'governance-patch',
    );

    const event = await seedAuditEvent(
      session,
    );

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/audit/${event.id}`,
      headers: authHeaders(session),
      payload: {
        action: 'governance:forged',
      },
    });

    expect(response.statusCode).toBe(404);
  });

  it('does not expose a PUT audit mutation endpoint', async () => {
    const session = await createSession(
      'governance-put',
    );

    const event = await seedAuditEvent(
      session,
    );

    const response = await app.inject({
      method: 'PUT',
      url: `/api/audit/${event.id}`,
      headers: authHeaders(session),
      payload: {
        action: 'governance:forged',
      },
    });

    expect(response.statusCode).toBe(404);
  });

  it('does not expose a DELETE audit mutation endpoint', async () => {
    const session = await createSession(
      'governance-delete',
    );

    const event = await seedAuditEvent(
      session,
    );

    const response = await app.inject({
      method: 'DELETE',
      url: `/api/audit/${event.id}`,
      headers: authHeaders(session),
    });

    expect(response.statusCode).toBe(404);
  });

  it.each([
    'OWNER',
    'ADMIN',
    'MEMBER',
    'VIEWER',
  ] as const)(
    '%s cannot update audit events',
    async (role) => {
      const session = await createSession(
        `governance-update-${role}`,
      );

      await setRole(session, role);

      const event = await seedAuditEvent(
        session,
      );

      const before =
        await pool.query<AuditEvent>(
          `
            SELECT
              id,
              tenant_id,
              user_id,
              project_id,
              action,
              resource_type,
              resource_id,
              metadata,
              created_at
            FROM audit_events
            WHERE id = $1
          `,
          [event.id],
        );

      expect(before.rows).toHaveLength(1);

      await expect(
        pool.query(
          `
            UPDATE audit_events
            SET action = $1
            WHERE id = $2
          `,
          [
            'governance:tampered',
            event.id,
          ],
        ),
      ).rejects.toMatchObject({
  code: '42501',
  message: expect.stringContaining(
    'audit_events are immutable',
  ),
});

      const after =
        await pool.query<AuditEvent>(
          `
            SELECT
              id,
              tenant_id,
              user_id,
              project_id,
              action,
              resource_type,
              resource_id,
              metadata,
              created_at
            FROM audit_events
            WHERE id = $1
          `,
          [event.id],
        );

      expect(after.rows).toHaveLength(1);
      expect(after.rows[0]).toEqual(
        before.rows[0],
      );
    },
  );

  it.each([
    'OWNER',
    'ADMIN',
    'MEMBER',
    'VIEWER',
  ] as const)(
    '%s cannot delete audit events',
    async (role) => {
      const session = await createSession(
        `governance-delete-${role}`,
      );

      await setRole(session, role);

      const event = await seedAuditEvent(
        session,
      );

      await expect(
        pool.query(
          `
            DELETE FROM audit_events
            WHERE id = $1
          `,
          [event.id],
        ),
      ).rejects.toMatchObject({
  code: '42501',
  message: expect.stringContaining(
    'audit_events are immutable',
  ),
});

      const result =
        await pool.query<{
          id: string;
        }>(
          `
            SELECT id
            FROM audit_events
            WHERE id = $1
          `,
          [event.id],
        );

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].id).toBe(
        event.id,
      );
    },
  );

  it('keeps tenant ownership immutable', async () => {
    const session = await createSession(
      'governance-tenant',
    );

    const event = await seedAuditEvent(
      session,
    );

    const foreignTenant =
      await createSession(
        'governance-foreign-tenant',
      );

    await expect(
      pool.query(
        `
          UPDATE audit_events
          SET tenant_id = $1
          WHERE id = $2
        `,
        [
          foreignTenant.tenant.id,
          event.id,
        ],
      ),
    ).rejects.toMatchObject({
  code: '42501',
  message: expect.stringContaining(
    'audit_events are immutable',
  ),
});

    const result =
      await pool.query<{
        tenant_id: string;
      }>(
        `
          SELECT tenant_id
          FROM audit_events
          WHERE id = $1
        `,
        [event.id],
      );

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].tenant_id).toBe(
      session.tenant.id,
    );
  });

  it('keeps actor identity immutable', async () => {
    const session = await createSession(
      'governance-actor',
    );

    const event = await seedAuditEvent(
      session,
    );

    const foreignSession =
      await createSession(
        'governance-foreign-actor',
      );

    await expect(
      pool.query(
        `
          UPDATE audit_events
          SET user_id = $1
          WHERE id = $2
        `,
        [
          foreignSession.user.id,
          event.id,
        ],
      ),
    ).rejects.toMatchObject({
  code: '42501',
  message: expect.stringContaining(
    'audit_events are immutable',
  ),
});

    const result =
      await pool.query<{
        user_id: string | null;
      }>(
        `
          SELECT user_id
          FROM audit_events
          WHERE id = $1
        `,
        [event.id],
      );

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].user_id).toBe(
      session.user.id,
    );
  });

  it('keeps audit semantics immutable', async () => {
    const session = await createSession(
      'governance-semantics',
    );

    const event = await seedAuditEvent(
      session,
      {
        action: 'governance:original',
        resourceType: 'project',
        resourceId: `original-${TEST_RUN_ID}`,
        metadata: {
          original: true,
          milestone: 'M27.5',
        },
      },
    );

    await expect(
      pool.query(
        `
          UPDATE audit_events
          SET
            action = $1,
            resource_type = $2,
            resource_id = $3,
            metadata = $4
          WHERE id = $5
        `,
        [
          'governance:tampered',
          'tampered',
          `tampered-${TEST_RUN_ID}`,
          JSON.stringify({
            original: false,
          }),
          event.id,
        ],
      ),
    ).rejects.toMatchObject({
  code: '42501',
  message: expect.stringContaining(
    'audit_events are immutable',
  ),
});

    const result =
      await pool.query<AuditEvent>(
        `
          SELECT
            id,
            tenant_id,
            user_id,
            project_id,
            action,
            resource_type,
            resource_id,
            metadata,
            created_at
          FROM audit_events
          WHERE id = $1
        `,
        [event.id],
      );

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toEqual(
      event,
    );
  });

  it('keeps created_at immutable', async () => {
    const session = await createSession(
      'governance-created-at',
    );

    const event = await seedAuditEvent(
      session,
    );

    await expect(
      pool.query(
        `
          UPDATE audit_events
          SET created_at = NOW()
          WHERE id = $1
        `,
        [event.id],
      ),
    ).rejects.toMatchObject({
  code: '42501',
  message: expect.stringContaining(
    'audit_events are immutable',
  ),
});

    const result =
      await pool.query<{
        created_at: Date;
      }>(
        `
          SELECT created_at
          FROM audit_events
          WHERE id = $1
        `,
        [event.id],
      );

    expect(result.rows).toHaveLength(1);
    expect(
      result.rows[0].created_at,
    ).toStrictEqual(event.created_at);
  });

  it('allows the server audit writer to insert events', async () => {
    const session = await createSession(
      'governance-insert',
    );

    const event = await seedAuditEvent(
      session,
      {
        action: 'governance:insert',
      },
    );

    expect(event.id).toEqual(
      expect.any(String),
    );

    expect(event.tenant_id).toBe(
      session.tenant.id,
    );

    expect(event.user_id).toBe(
      session.user.id,
    );

    expect(event.action).toBe(
      'governance:insert',
    );
  });

  it('preserves audit-read behavior after governance enforcement', async () => {
    const session = await createSession(
      'governance-read',
    );

    await setRole(session, 'OWNER');

    const event = await seedAuditEvent(
      session,
      {
        action: 'governance:read',
      },
    );

    const listResponse = await app.inject({
      method: 'GET',
      url: '/api/audit',
      headers: authHeaders(session),
    });

    expect(listResponse.statusCode).toBe(200);

    const list =
      listResponse.json<{
        items: AuditEvent[];
      }>();

    expect(
      list.items.some(
        (item) => item.id === event.id,
      ),
    ).toBe(true);

    const detailResponse =
      await app.inject({
        method: 'GET',
        url: `/api/audit/${event.id}`,
        headers: authHeaders(session),
      });

    expect(detailResponse.statusCode).toBe(
      200,
    );

    const detail =
      detailResponse.json<AuditEvent>();

    expect(detail).toEqual({ ...event, created_at: event.created_at.toISOString()});
  });
});