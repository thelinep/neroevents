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

interface JsonError {
  error?: string;
}

interface AuditResponse {
  items: Array<Record<string, unknown>>;
  pagination: {
    limit: number;
    offset: number;
  };
}

interface HealthResponse {
  status?: string;
}

interface ReadyResponse {
  status?: string;
  database?: string;
}

let app: FastifyInstance;

const TEST_RUN_ID = `${Date.now()}-${Math.random()
  .toString(36)
  .slice(2, 10)}`;

const LATENCY_BUDGET_MS = 1000;

function uniqueTestEmail(prefix: string): string {
  return `${prefix}-${TEST_RUN_ID}-${Math.random()
    .toString(36)
    .slice(2, 8)}@m28-7.test`;
}

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

function elapsedMs(startedAt: number): number {
  return performance.now() - startedAt;
}

async function createSession(
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

  const body = response.json() as {
    user?: SessionUser;
    token?: string;
    tenant?: SessionTenant;
  };

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
    [body.user!.id],
  );

  expect(tenantResult.rows).toHaveLength(1);

  return {
    user: body.user!,
    session: {
      token: body.token!,
    },
    tenant: tenantResult.rows[0],
  };
}

async function injectHealth(): Promise<{
  statusCode: number;
  body: HealthResponse;
  durationMs: number;
}> {
  const startedAt = performance.now();

  const response = await app.inject({
    method: 'GET',
    url: '/health',
  });

  return {
    statusCode: response.statusCode,
    body: response.json() as HealthResponse,
    durationMs: elapsedMs(startedAt),
  };
}

async function injectReady(): Promise<{
  statusCode: number;
  body: ReadyResponse;
  durationMs: number;
}> {
  const startedAt = performance.now();

  const response = await app.inject({
    method: 'GET',
    url: '/ready',
  });

  return {
    statusCode: response.statusCode,
    body: response.json() as ReadyResponse,
    durationMs: elapsedMs(startedAt),
  };
}

describe('M28.7 Performance & Reliability', () => {
  let session: TestSession;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();

    session = await createSession('m28-7-performance');
  });

  afterAll(async () => {
    await app.close();
    await pool.end();
  });

  describe('Health reliability', () => {
    it('returns HTTP 200 repeatedly', async () => {
      const results = await Promise.all(
        Array.from({ length: 10 }, () => injectHealth()),
      );

      expect(results).toHaveLength(10);

      for (const result of results) {
        expect(result.statusCode).toBe(200);
        expect(result.body).toEqual({
          status: 'ok',
        });
      }
    });

    it('remains within the health latency budget', async () => {
      const results = await Promise.all(
        Array.from({ length: 10 }, () => injectHealth()),
      );

      for (const result of results) {
        expect(result.statusCode).toBe(200);
        expect(result.durationMs).toBeLessThan(
          LATENCY_BUDGET_MS,
        );
      }
    });
  });

  describe('Readiness reliability', () => {
    it('returns HTTP 200 repeatedly while the database is ready', async () => {
      const results = await Promise.all(
        Array.from({ length: 10 }, () => injectReady()),
      );

      expect(results).toHaveLength(10);

      for (const result of results) {
        expect(result.statusCode).toBe(200);
        expect(result.body).toEqual({
          status: 'ready',
          database: 'ok',
        });
      }
    });

    it('remains within the readiness latency budget', async () => {
      const results = await Promise.all(
        Array.from({ length: 10 }, () => injectReady()),
      );

      for (const result of results) {
        expect(result.statusCode).toBe(200);
        expect(result.durationMs).toBeLessThan(
          LATENCY_BUDGET_MS,
        );
      }
    });
  });

  describe('Authenticated API reliability', () => {
    it('repeatedly serves authenticated audit requests', async () => {
      const results = await Promise.all(
        Array.from({ length: 10 }, () =>
          app.inject({
            method: 'GET',
            url: '/api/audit',
            headers: authHeaders(
              session,
              session.tenant.id,
            ),
          }),
        ),
      );

      expect(results).toHaveLength(10);

      for (const response of results) {
        expect(response.statusCode).toBe(200);

        const body = response.json() as AuditResponse;

        expect(Array.isArray(body.items)).toBe(true);
        expect(body.pagination).toBeDefined();
        expect(body.pagination.limit).toBe(50);
        expect(body.pagination.offset).toBe(0);
      }
    });

    it('keeps authenticated audit requests within the reliability latency budget', async () => {
      const results = await Promise.all(
        Array.from({ length: 10 }, async () => {
          const startedAt = performance.now();

          const response = await app.inject({
            method: 'GET',
            url: '/api/audit',
            headers: authHeaders(
              session,
              session.tenant.id,
            ),
          });

          return {
            response,
            durationMs: elapsedMs(startedAt),
          };
        }),
      );

      for (const result of results) {
        expect(result.response.statusCode).toBe(200);
        expect(result.durationMs).toBeLessThan(
          LATENCY_BUDGET_MS,
        );
      }
    });
  });

  describe('Pagination reliability', () => {
    it('preserves default pagination semantics', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/audit',
        headers: authHeaders(
          session,
          session.tenant.id,
        ),
      });

      expect(response.statusCode).toBe(200);

      const body = response.json() as AuditResponse;

      expect(body.pagination).toEqual({
        limit: 50,
        offset: 0,
      });
      expect(Array.isArray(body.items)).toBe(true);
    });

    it('accepts the maximum supported audit page size', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/audit?limit=100',
        headers: authHeaders(
          session,
          session.tenant.id,
        ),
      });

      expect(response.statusCode).toBe(200);

      const body = response.json() as AuditResponse;

      expect(body.pagination).toEqual({
        limit: 100,
        offset: 0,
      });
      expect(Array.isArray(body.items)).toBe(true);
      expect(body.items.length).toBeLessThanOrEqual(100);
    });

    it('preserves offset semantics', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/audit?limit=1&offset=1',
        headers: authHeaders(
          session,
          session.tenant.id,
        ),
      });

      expect(response.statusCode).toBe(200);

      const body = response.json() as AuditResponse;

      expect(body.pagination).toEqual({
        limit: 1,
        offset: 1,
      });
      expect(Array.isArray(body.items)).toBe(true);
      expect(body.items.length).toBeLessThanOrEqual(1);
    });
  });

  describe('Concurrent stability', () => {
    it('handles concurrent health and readiness requests without unexpected 5xx responses', async () => {
      const requests = [
        ...Array.from({ length: 10 }, () =>
          app.inject({
            method: 'GET',
            url: '/health',
          }),
        ),
        ...Array.from({ length: 10 }, () =>
          app.inject({
            method: 'GET',
            url: '/ready',
          }),
        ),
      ];

      const responses = await Promise.all(requests);

      expect(responses).toHaveLength(20);

      for (const response of responses) {
        expect(response.statusCode).not.toBeGreaterThanOrEqual(
          500,
        );
      }

      const healthResponses = responses.slice(0, 10);
      const readyResponses = responses.slice(10);

      for (const response of healthResponses) {
        expect(response.statusCode).toBe(200);
        expect(response.json()).toEqual({
          status: 'ok',
        });
      }

      for (const response of readyResponses) {
        expect(response.statusCode).toBe(200);
        expect(response.json()).toEqual({
          status: 'ready',
          database: 'ok',
        });
      }
    });

    it('handles concurrent authenticated audit requests without cross-request failures', async () => {
      const responses = await Promise.all(
        Array.from({ length: 10 }, () =>
          app.inject({
            method: 'GET',
            url: '/api/audit?limit=1',
            headers: authHeaders(
              session,
              session.tenant.id,
            ),
          }),
        ),
      );

      expect(responses).toHaveLength(10);

      for (const response of responses) {
        expect(response.statusCode).toBe(200);

        const body = response.json() as AuditResponse;

        expect(Array.isArray(body.items)).toBe(true);
        expect(body.pagination).toEqual({
          limit: 1,
          offset: 0,
        });

        for (const event of body.items) {
          expect(event.tenant_id).toBe(
            session.tenant.id,
          );
        }
      }
    });
  });

  describe('Failure containment', () => {
    it('keeps malformed requests controlled without exposing internal details', async () => {
      const cases = [
        {
          url: '/api/audit/not-a-uuid',
          expectedStatus: 400,
        },
        {
          url: '/api/audit?limit=not-an-integer',
          expectedStatus: 400,
        },
        {
          url: '/api/audit?limit=0',
          expectedStatus: 400,
        },
        {
          url: '/api/audit?offset=-1',
          expectedStatus: 400,
        },
      ];

      for (const testCase of cases) {
        const response = await app.inject({
          method: 'GET',
          url: testCase.url,
          headers: authHeaders(
            session,
            session.tenant.id,
          ),
        });

        expect(response.statusCode).toBe(
          testCase.expectedStatus,
        );

        expect(response.payload).not.toContain(
          'password',
        );
        expect(response.payload).not.toContain(
          'Bearer',
        );
        expect(response.payload).not.toContain(
          'stack',
        );
        expect(response.payload).not.toContain(
          ' at ',
        );
        expect(response.payload).not.toContain(
          'node_modules',
        );
      }
    });
  });
});