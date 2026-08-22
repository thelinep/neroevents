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

let app: FastifyInstance;

beforeAll(async () => {
  app = buildApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

const TEST_RUN_ID = `${Date.now()}-${Math.random()
  .toString(36)
  .slice(2, 10)}`;

function uniqueTestEmail(prefix: string): string {
  return `${prefix}-${TEST_RUN_ID}-${Math.random()
    .toString(36)
    .slice(2, 8)}@m28-2.test`;
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

  const body = JSON.parse(response.payload) as {
    user?: SessionUser;
    token?: string;
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

describe('M28.2 Error Handling', () => {
  describe('404 Not Found', () => {
    let session: TestSession;

    beforeAll(async () => {
      session = await createSession('m28-2-404');
    });

    it('returns 404 for an unknown authenticated API route', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/__m28_2_not_found__',
        headers: authHeaders(
          session,
          session.tenant.id,
        ),
      });

      expect(response.statusCode).toBe(404);
    });

    it('returns the JSON 404 contract for an unknown API route', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/__m28_2_not_found__',
        headers: authHeaders(
          session,
          session.tenant.id,
        ),
      });

      expect(response.statusCode).toBe(404);
      expect(response.headers['content-type']).toContain(
        'application/json',
      );

      expect(response.json()).toEqual({
        error: 'Not found',
      });
    });

    it('does not expose stack traces in an API 404 response', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/__m28_2_not_found__',
        headers: authHeaders(
          session,
          session.tenant.id,
        ),
      });

      expect(response.statusCode).toBe(404);
      expect(response.payload).not.toContain('at ');
      expect(response.payload).not.toContain('Error:');
      expect(response.payload).not.toContain('stack');
    });
  });

  describe('401 Unauthorized', () => {
    it('rejects an unauthenticated protected API request', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/audit',
      });

      expect(response.statusCode).toBe(401);

      const body = JSON.parse(response.payload) as {
        error?: string;
      };

      expect(body).toEqual({
        error: 'Unauthorized',
      });
    });

    it('does not expose authentication details', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/audit',
      });

      expect(response.statusCode).toBe(401);
      expect(response.payload).not.toContain('token');
      expect(response.payload).not.toContain('password');
      expect(response.payload).not.toContain('Bearer');
    });
  });

  describe('400 Bad Request', () => {
    it('returns 400 when a protected API request omits tenant selection after authentication', async () => {
      const session = await createSession('m28-2-400');

      const response = await app.inject({
        method: 'GET',
        url: '/api/audit',
        headers: {
          authorization: `Bearer ${session.session.token}`,
        },
      });

      expect(response.statusCode).toBe(400);

      const body = JSON.parse(response.payload) as {
        error?: string;
      };

      expect(body).toEqual({
        error: 'Tenant selection required',
      });
    });
  });

  describe('403 Forbidden', () => {
    it('returns 403 for an authenticated user without the required permission', async () => {
      const session = await createSession('m28-2-403');

      /*
       * Registration creates an OWNER.
       *
       * Demote this temporary membership to VIEWER so that the
       * authenticated request remains valid but does not have
       * audit:read.
       */
      const update = await pool.query(
        `
          UPDATE tenant_memberships
          SET role = 'VIEWER'
          WHERE user_id = $1
            AND tenant_id = $2
        `,
        [
          session.user.id,
          session.tenant.id,
        ],
      );

      expect(update.rowCount).toBe(1);

      const response = await app.inject({
        method: 'GET',
        url: '/api/audit',
        headers: authHeaders(
          session,
          session.tenant.id,
        ),
      });

      expect(response.statusCode).toBe(403);

      const body = JSON.parse(response.payload) as {
        error?: string;
      };

      expect(body.error).toBeDefined();
      expect(body.error).not.toContain('token');
      expect(body.error).not.toContain('password');
    });
  });

  describe('Health and readiness isolation', () => {
    it('keeps /health available without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.payload) as {
        status?: string;
      };

      expect(body).toEqual({
        status: 'ok',
      });
    });

    it('keeps /ready available without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/ready',
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.payload) as {
        status?: string;
        database?: string;
      };

      expect(body).toEqual({
        status: 'ready',
        database: 'ok',
      });
    });
  });
});