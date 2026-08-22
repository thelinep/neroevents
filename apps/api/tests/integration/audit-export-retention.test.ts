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

interface AuditExportResponse {
  items: Array<{
    id: string;
    tenant_id: string;
    user_id: string | null;
    project_id: string | null;
    action: string;
    resource_type: string | null;
    resource_id: string | null;
    metadata: Record<string, unknown>;
    created_at: Date;
  }>;
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
    .slice(2, 8)}@m27-6.test`;
}

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
    createdAt: Date;
  }> = {},
): Promise<AuditEvent> {
  const createdAt =
    overrides.createdAt ?? new Date();

  const result = await pool.query<AuditEvent>(
    `
      INSERT INTO audit_events (
        tenant_id,
        user_id,
        project_id,
        action,
        resource_type,
        resource_id,
        metadata,
        created_at
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8
      )
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
        'export:test',
      overrides.resourceType ??
        'test',
      overrides.resourceId ??
        `m27-6-${TEST_RUN_ID}`,
      JSON.stringify(
        overrides.metadata ?? {
          milestone: 'M27.6',
        },
      ),
      createdAt,
    ],
  );

  expect(result.rows).toHaveLength(1);

  return result.rows[0];
}

function parseExport(
  response: {
    statusCode: number;
    json: <T>() => T;
  },
): AuditExportResponse {
  return response.json<AuditExportResponse>();
}

let app: FastifyInstance;

describe('M27.6 audit export / retention', () => {
  beforeAll(async () => {
    app = buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('export authorization', () => {
    it('allows OWNER to export audit events', async () => {
      const session = await createSession(
        'export-owner',
      );

      await setRole(session, 'OWNER');

      await seedAuditEvent(session, {
        action: 'export:owner',
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/audit/export',
        headers: authHeaders(session),
      });

      expect(response.statusCode).toBe(200);
    });

    it('allows ADMIN to export audit events', async () => {
      const session = await createSession(
        'export-admin',
      );

      await setRole(session, 'ADMIN');

      await seedAuditEvent(session, {
        action: 'export:admin',
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/audit/export',
        headers: authHeaders(session),
      });

      expect(response.statusCode).toBe(200);
    });

    it.each([
      'MEMBER',
      'VIEWER',
    ] as const)(
      '%s cannot export audit events',
      async (role) => {
        const session = await createSession(
          `export-${role.toLowerCase()}`,
        );

        await setRole(session, role);

        const response = await app.inject({
          method: 'GET',
          url: '/api/audit/export',
          headers: authHeaders(session),
        });

        expect(response.statusCode).toBe(403);

        expect(response.json()).toEqual({
          error: expect.any(String),
        });
      },
    );

    it('rejects unauthenticated export', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/audit/export',
      });

      expect(response.statusCode).toBe(401);

      expect(response.json()).toEqual({
        error: expect.any(String),
      });
    });
  });

  describe('tenant isolation', () => {
    it('exports only events belonging to the request tenant', async () => {
      const tenantA = await createSession(
        'export-tenant-a',
      );

      const tenantB = await createSession(
        'export-tenant-b',
      );

      await setRole(tenantA, 'OWNER');
      await setRole(tenantB, 'OWNER');

      const eventA = await seedAuditEvent(
        tenantA,
        {
          action: 'export:tenant-a',
          resourceId: `tenant-a-${TEST_RUN_ID}`,
        },
      );

      const eventB = await seedAuditEvent(
        tenantB,
        {
          action: 'export:tenant-b',
          resourceId: `tenant-b-${TEST_RUN_ID}`,
        },
      );

      const response = await app.inject({
        method: 'GET',
        url: '/api/audit/export',
        headers: authHeaders(tenantA),
      });

      expect(response.statusCode).toBe(200);

      const body = parseExport(response);

      expect(
        body.items.some(
          (item) => item.id === eventA.id,
        ),
      ).toBe(true);

      expect(
        body.items.some(
          (item) => item.id === eventB.id,
        ),
      ).toBe(false);

      expect(
        body.items.every(
          (item) =>
            item.tenant_id ===
            tenantA.tenant.id,
        ),
      ).toBe(true);
    });

    it('ignores an injected tenantId', async () => {
      const tenantA = await createSession(
        'export-injection-a',
      );

      const tenantB = await createSession(
        'export-injection-b',
      );

      await setRole(tenantA, 'OWNER');
      await setRole(tenantB, 'OWNER');

      const eventA = await seedAuditEvent(
        tenantA,
        {
          action: 'export:injection-a',
        },
      );

      const eventB = await seedAuditEvent(
        tenantB,
        {
          action: 'export:injection-b',
        },
      );

      const response = await app.inject({
        method: 'GET',
        url:
          `/api/audit/export?tenantId=${encodeURIComponent(
            tenantB.tenant.id,
          )}`,
        headers: authHeaders(tenantA),
      });

      /*
       * M26.7 established strict query validation.
       * tenantId is not part of the export contract.
       */
      expect(response.statusCode).toBe(400);

      expect(response.json()).toEqual({
        error: expect.any(String),
      });

      /*
       * Keep the variables referenced so this test documents
       * the tenant-isolation setup explicitly.
       */
      expect(eventA.tenant_id).toBe(
        tenantA.tenant.id,
      );

      expect(eventB.tenant_id).toBe(
        tenantB.tenant.id,
      );
    });
  });

  describe('export filtering', () => {
    it('filters by action', async () => {
      const session = await createSession(
        'export-action-filter',
      );

      await setRole(session, 'OWNER');

      const matching = await seedAuditEvent(
        session,
        {
          action: 'export:matching-action',
        },
      );

      await seedAuditEvent(session, {
        action: 'export:other-action',
      });

      const response = await app.inject({
        method: 'GET',
        url:
          '/api/audit/export?action=' +
          encodeURIComponent(
            'export:matching-action',
          ),
        headers: authHeaders(session),
      });

      expect(response.statusCode).toBe(200);

      const body = parseExport(response);

      expect(body.items).toHaveLength(1);
      expect(body.items[0].id).toBe(
        matching.id,
      );
      expect(body.items[0].action).toBe(
        'export:matching-action',
      );
    });

    it('filters by resourceType', async () => {
      const session = await createSession(
        'export-resource-type',
      );

      await setRole(session, 'OWNER');

      const matching = await seedAuditEvent(
        session,
        {
          action: 'export:resource-type',
          resourceType: 'project',
        },
      );

      await seedAuditEvent(session, {
        action: 'export:resource-type-other',
        resourceType: 'agent',
      });

      const response = await app.inject({
        method: 'GET',
        url:
          '/api/audit/export?resourceType=project',
        headers: authHeaders(session),
      });

      expect(response.statusCode).toBe(200);

      const body = parseExport(response);

      expect(
        body.items.some(
          (item) => item.id === matching.id,
        ),
      ).toBe(true);

      expect(
        body.items.every(
          (item) =>
            item.resource_type ===
            'project',
        ),
      ).toBe(true);
    });

    it('filters by resourceId', async () => {
      const session = await createSession(
        'export-resource-id',
      );

      await setRole(session, 'OWNER');

      const resourceId =
        `resource-${TEST_RUN_ID}`;

      const matching = await seedAuditEvent(
        session,
        {
          action: 'export:resource-id',
          resourceId,
        },
      );

      await seedAuditEvent(session, {
        action: 'export:resource-id-other',
        resourceId:
          `other-${TEST_RUN_ID}`,
      });

      const response = await app.inject({
        method: 'GET',
        url:
          `/api/audit/export?resourceId=${encodeURIComponent(
            resourceId,
          )}`,
        headers: authHeaders(session),
      });

      expect(response.statusCode).toBe(200);

      const body = parseExport(response);

      expect(body.items).toHaveLength(1);
      expect(body.items[0].id).toBe(
        matching.id,
      );
      expect(
        body.items[0].resource_id,
      ).toBe(resourceId);
    });

    it('filters by userId', async () => {
      const session = await createSession(
        'export-user-filter',
      );

      await setRole(session, 'OWNER');

      const matching = await seedAuditEvent(
        session,
        {
          action: 'export:user-filter',
        },
      );

      const response = await app.inject({
        method: 'GET',
        url:
          `/api/audit/export?userId=${encodeURIComponent(
            session.user.id,
          )}`,
        headers: authHeaders(session),
      });

      expect(response.statusCode).toBe(200);

      const body = parseExport(response);

      expect(
        body.items.some(
          (item) => item.id === matching.id,
        ),
      ).toBe(true);

      expect(
        body.items.every(
          (item) =>
            item.user_id ===
            session.user.id,
        ),
      ).toBe(true);
    });
  });

  describe('export pagination contract', () => {
    it('respects limit', async () => {
      const session = await createSession(
        'export-limit',
      );

      await setRole(session, 'OWNER');

      await seedAuditEvent(session, {
        action: 'export:limit',
        resourceId: `limit-1-${TEST_RUN_ID}`,
      });

      await seedAuditEvent(session, {
        action: 'export:limit',
        resourceId: `limit-2-${TEST_RUN_ID}`,
      });

      await seedAuditEvent(session, {
        action: 'export:limit',
        resourceId: `limit-3-${TEST_RUN_ID}`,
      });

      const response = await app.inject({
        method: 'GET',
        url:
          '/api/audit/export?action=' +
          encodeURIComponent(
            'export:limit',
          ) +
          '&limit=2',
        headers: authHeaders(session),
      });

      expect(response.statusCode).toBe(200);

      const body = parseExport(response);

      expect(body.items).toHaveLength(2);
      expect(body.pagination).toEqual({
        limit: 2,
        offset: 0,
      });
    });

    it('respects offset', async () => {
      const session = await createSession(
        'export-offset',
      );

      await setRole(session, 'OWNER');

      await seedAuditEvent(session, {
        action: 'export:offset',
        resourceId: `offset-1-${TEST_RUN_ID}`,
      });

      await seedAuditEvent(session, {
        action: 'export:offset',
        resourceId: `offset-2-${TEST_RUN_ID}`,
      });

      const firstResponse =
        await app.inject({
          method: 'GET',
          url:
            '/api/audit/export?action=' +
            encodeURIComponent(
              'export:offset',
            ) +
            '&limit=1&offset=0',
          headers: authHeaders(session),
        });

      expect(
        firstResponse.statusCode,
      ).toBe(200);

      const first = parseExport(
        firstResponse,
      );

      const secondResponse =
        await app.inject({
          method: 'GET',
          url:
            '/api/audit/export?action=' +
            encodeURIComponent(
              'export:offset',
            ) +
            '&limit=1&offset=1',
          headers: authHeaders(session),
        });

      expect(
        secondResponse.statusCode,
      ).toBe(200);

      const second = parseExport(
        secondResponse,
      );

      expect(first.items).toHaveLength(1);
      expect(second.items).toHaveLength(1);

      expect(first.items[0].id).not.toBe(
        second.items[0].id,
      );
    });

    it.each([
      'limit=0',
      'limit=101',
      'limit=abc',
      'offset=-1',
      'offset=abc',
    ])(
      'rejects invalid pagination query: %s',
      async (query) => {
        const session = await createSession(
          'export-invalid-pagination',
        );

        await setRole(session, 'OWNER');

        const response =
          await app.inject({
            method: 'GET',
            url: `/api/audit/export?${query}`,
            headers: authHeaders(session),
          });

        expect(
          response.statusCode,
        ).toBe(400);

        expect(response.json()).toEqual({
          error: expect.any(String),
        });
      },
    );

    it('rejects unknown query parameters', async () => {
      const session = await createSession(
        'export-unknown-query',
      );

      await setRole(session, 'OWNER');

      const response = await app.inject({
        method: 'GET',
        url:
          '/api/audit/export?unexpected=value',
        headers: authHeaders(session),
      });

      expect(response.statusCode).toBe(400);

      expect(response.json()).toEqual({
        error: expect.any(String),
      });
    });
  });

  describe('deterministic export contract', () => {
    it('returns a deterministic event shape', async () => {
      const session = await createSession(
        'export-shape',
      );

      await setRole(session, 'OWNER');

      const event = await seedAuditEvent(
        session,
        {
          action: 'export:shape',
          resourceType: 'project',
          resourceId:
            `shape-${TEST_RUN_ID}`,
          metadata: {
            milestone: 'M27.6',
            deterministic: true,
          },
        },
      );

      const response = await app.inject({
        method: 'GET',
        url:
          '/api/audit/export?action=' +
          encodeURIComponent(
            'export:shape',
          ),
        headers: authHeaders(session),
      });

      expect(response.statusCode).toBe(200);

      const body = parseExport(response);

      expect(body.items).toHaveLength(1);

      expect(
        Object.keys(body.items[0]).sort(),
      ).toEqual([
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

      expect(body.items[0]).toEqual({
        id: event.id,
        tenant_id: event.tenant_id,
        user_id: event.user_id,
        project_id: event.project_id,
        action: event.action,
        resource_type:
          event.resource_type,
        resource_id: event.resource_id,
        metadata: event.metadata,
        created_at:
          event.created_at.toISOString(),
      });
    });

    it('preserves created_at during export', async () => {
      const session = await createSession(
        'export-created-at',
      );

      await setRole(session, 'OWNER');

      const createdAt = new Date(
        '2026-01-15T10:20:30.000Z',
      );

      const event = await seedAuditEvent(
        session,
        {
          action: 'export:created-at',
          createdAt,
        },
      );

      const response = await app.inject({
        method: 'GET',
        url:
          '/api/audit/export?action=' +
          encodeURIComponent(
            'export:created-at',
          ),
        headers: authHeaders(session),
      });

      expect(response.statusCode).toBe(200);

      const body = parseExport(response);

      expect(body.items).toHaveLength(1);

      expect(
        body.items[0].created_at,
      ).toBe(event.created_at.toISOString());
    });

    it('returns events in stable created_at/id order', async () => {
      const session = await createSession(
        'export-order',
      );

      await setRole(session, 'OWNER');

      const timestamp = new Date(
        '2026-02-01T00:00:00.000Z',
      );

      const first = await seedAuditEvent(
        session,
        {
          action: 'export:order',
          createdAt: timestamp,
        },
      );

      const second = await seedAuditEvent(
        session,
        {
          action: 'export:order',
          createdAt: timestamp,
        },
      );

      const response = await app.inject({
        method: 'GET',
        url:
          '/api/audit/export?action=' +
          encodeURIComponent(
            'export:order',
          ),
        headers: authHeaders(session),
      });

      expect(response.statusCode).toBe(200);

      const body = parseExport(response);

      expect(body.items).toHaveLength(2);

      const ids = body.items.map(
        (item) => item.id,
      );

      const expectedIds = [
        first.id,
        second.id,
      ].sort((a, b) =>
        b.localeCompare(a),
      );

      expect(ids).toEqual(expectedIds);
    });
  });

  describe('export integrity and security', () => {
    it('does not expose authorization credentials', async () => {
      const session = await createSession(
        'export-no-token',
      );

      await setRole(session, 'OWNER');

      await seedAuditEvent(session, {
        action: 'export:no-token',
        metadata: {
          safe: true,
        },
      });

      const response = await app.inject({
        method: 'GET',
        url:
          '/api/audit/export?action=' +
          encodeURIComponent(
            'export:no-token',
          ),
        headers: authHeaders(session),
      });

      expect(response.statusCode).toBe(200);

      const serialized =
        response.payload;

      expect(serialized).not.toContain(
        session.token,
      );

      expect(serialized).not.toContain(
        'authorization',
      );
    });

    it('does not permit cross-tenant event IDs through filters', async () => {
      const sessionA = await createSession(
        'export-cross-id-a',
      );

      const sessionB = await createSession(
        'export-cross-id-b',
      );

      await setRole(sessionA, 'OWNER');
      await setRole(sessionB, 'OWNER');

      const eventB = await seedAuditEvent(
        sessionB,
        {
          action: 'export:cross-id',
        },
      );

      const response = await app.inject({
        method: 'GET',
        url:
          `/api/audit/export?resourceId=${encodeURIComponent(
            eventB.resource_id!,
          )}`,
        headers: authHeaders(sessionA),
      });

      expect(response.statusCode).toBe(200);

      const body = parseExport(response);

      expect(
        body.items.some(
          (item) => item.id === eventB.id,
        ),
      ).toBe(false);
    });
  });

  describe('retention governance', () => {
    it('does not expose a public retention mutation endpoint', async () => {
      const session = await createSession(
        'retention-public',
      );

      await setRole(session, 'OWNER');

      const response = await app.inject({
        method: 'POST',
        url: '/api/audit/retention',
        headers: authHeaders(session),
        payload: {
          before:
            '2025-01-01T00:00:00.000Z',
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('does not expose a public retention delete endpoint', async () => {
      const session = await createSession(
        'retention-delete',
      );

      await setRole(session, 'OWNER');

      const response = await app.inject({
        method: 'DELETE',
        url: '/api/audit/retention',
        headers: authHeaders(session),
      });

      expect(response.statusCode).toBe(404);
    });

    it('prevents direct deletion of retention-eligible events', async () => {
      const session = await createSession(
        'retention-immutable',
      );

      const oldEvent = await seedAuditEvent(
        session,
        {
          action: 'retention:eligible',
          createdAt: new Date(
            '2024-01-01T00:00:00.000Z',
          ),
        },
      );

      await expect(
        pool.query(
          `
            DELETE FROM audit_events
            WHERE id = $1
          `,
          [oldEvent.id],
        ),
      ).rejects.toMatchObject({
        code: expect.any(String),
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
          [oldEvent.id],
        );

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].id).toBe(
        oldEvent.id,
      );
    });

    it('prevents retention from changing historical events', async () => {
      const session = await createSession(
        'retention-update',
      );

      const oldEvent = await seedAuditEvent(
        session,
        {
          action: 'retention:historical',
          createdAt: new Date(
            '2024-01-01T00:00:00.000Z',
          ),
        },
      );

      await expect(
        pool.query(
          `
            UPDATE audit_events
            SET action = $1
            WHERE id = $2
          `,
          [
            'retention:tampered',
            oldEvent.id,
          ],
        ),
      ).rejects.toMatchObject({
        code: expect.any(String),
        message: expect.stringContaining(
          'audit_events are immutable',
        ),
      });

      const result =
        await pool.query<{
          action: string;
        }>(
          `
            SELECT action
            FROM audit_events
            WHERE id = $1
          `,
          [oldEvent.id],
        );

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].action).toBe(
        'retention:historical',
      );
    });
  });

  describe('export / retention compatibility', () => {
    it('preserves collection behavior for exported events', async () => {
      const session = await createSession(
        'export-collection-compat',
      );

      await setRole(session, 'OWNER');

      const event = await seedAuditEvent(
        session,
        {
          action:
            'export:collection-compat',
        },
      );

      const collection =
        await app.inject({
          method: 'GET',
          url:
            '/api/audit?action=' +
            encodeURIComponent(
              'export:collection-compat',
            ),
          headers: authHeaders(session),
        });

      expect(collection.statusCode).toBe(
        200,
      );

      const collectionBody =
        collection.json<{
          items: AuditExportResponse['items'];
        }>();

      const exported =
        await app.inject({
          method: 'GET',
          url:
            '/api/audit/export?action=' +
            encodeURIComponent(
              'export:collection-compat',
            ),
          headers: authHeaders(session),
        });

      expect(exported.statusCode).toBe(200);

      const exportBody =
        parseExport(exported);

      expect(
        exportBody.items,
      ).toHaveLength(1);

      expect(
        collectionBody.items[0],
      ).toEqual(
        exportBody.items[0],
      );

      expect(
        exportBody.items[0].id,
      ).toBe(event.id);
    });
  });
});