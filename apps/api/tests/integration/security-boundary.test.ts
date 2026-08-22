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

interface ErrorBody {
  error?: string;
}

interface RegisterResponse {
  user?: SessionUser;
  token?: string;
  expiresAt?: string;
  tenant?: SessionTenant;
}

let app: FastifyInstance;

const TEST_RUN_ID = `${Date.now()}-${Math.random()
  .toString(36)
  .slice(2, 10)}`;

function uniqueTestEmail(prefix: string): string {
  return `${prefix}-${TEST_RUN_ID}-${Math.random()
    .toString(36)
    .slice(2, 8)}@m28-5.test`;
}

function authHeaders(
  session: TestSession,
  tenantId: string = session.tenant.id,
): Record<string, string> {
  return {
    authorization: `Bearer ${session.session.token}`,
    'x-tenant-id': tenantId,
  };
}

function parseError(payload: string): ErrorBody {
  return JSON.parse(payload) as ErrorBody;
}

async function createSession(
  label: string,
): Promise<TestSession> {
  const email = uniqueTestEmail(label);

  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: {
      email,
      password: 'Password123!',
      displayName: label,
    },
  });

  expect(response.statusCode).toBe(201);

  const body = response.json() as RegisterResponse;

  expect(body.user?.id).toBeTruthy();
  expect(body.user?.email).toBe(email);
  expect(body.token).toBeTruthy();
  expect(body.tenant?.id).toBeTruthy();

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

  const tenant = tenantResult.rows[0];

  expect(tenant.id).toBe(body.tenant!.id);

  return {
    user: body.user!,
    session: {
      token: body.token!,
    },
    tenant,
  };
}

beforeAll(async () => {
  app = buildApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe('M28.5 API Security Boundary & Abuse Protection', () => {
  describe('Authentication boundary', () => {
    it('rejects a protected API request without Authorization', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/audit',
      });

      expect(response.statusCode).toBe(401);

      expect(parseError(response.payload)).toEqual({
        error: 'Unauthorized',
      });
    });

    it('rejects a malformed Bearer authorization header', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/audit',
        headers: {
          authorization: 'Basic invalid-credentials',
        },
      });

      expect(response.statusCode).toBe(401);

      expect(parseError(response.payload)).toEqual({
        error: 'Unauthorized',
      });
    });

    it('rejects an invalid Bearer token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/audit',
        headers: {
          authorization: 'Bearer definitely-not-a-valid-session-token',
        },
      });

      expect(response.statusCode).toBe(401);

      expect(parseError(response.payload)).toEqual({
        error: 'Unauthorized',
      });
    });

    it('does not expose credentials or authentication internals', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/audit',
        headers: {
          authorization: 'Bearer definitely-not-a-valid-session-token',
        },
      });

      expect(response.statusCode).toBe(401);

      expect(response.payload).not.toContain('password');
      expect(response.payload).not.toContain('token');
      expect(response.payload).not.toContain('Bearer');
      expect(response.payload).not.toContain('stack');
      expect(response.payload).not.toContain('Error:');
      expect(response.payload).not.toContain(' at ');
    });
  });

  describe('Authenticated tenant boundary', () => {
    let ownerSession: TestSession;
    let otherSession: TestSession;

    beforeAll(async () => {
      ownerSession = await createSession('m28-5-owner');
      otherSession = await createSession('m28-5-other');
    });

    it('requires tenant selection for an authenticated protected API request', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/audit',
        headers: {
          authorization: `Bearer ${ownerSession.session.token}`,
        },
      });

      expect(response.statusCode).toBe(400);

      expect(parseError(response.payload)).toEqual({
        error: 'Tenant selection required',
      });
    });

    it('accepts the authenticated user with their own tenant', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/audit',
        headers: authHeaders(ownerSession),
      });

      expect(response.statusCode).toBe(200);

      const body = response.json() as {
        items?: unknown[];
        pagination?: {
          limit?: number;
          offset?: number;
        };
      };

      expect(Array.isArray(body.items)).toBe(true);
      expect(body.pagination).toBeDefined();
      expect(body.pagination?.limit).toBe(50);
      expect(body.pagination?.offset).toBe(0);
    });

    it('rejects access to a tenant the authenticated user does not belong to', async () => {
      expect(otherSession.tenant.id).not.toBe(
        ownerSession.tenant.id,
      );

      const response = await app.inject({
        method: 'GET',
        url: '/api/audit',
        headers: authHeaders(
          ownerSession,
          otherSession.tenant.id,
        ),
      });

      expect(response.statusCode).toBe(403);

      expect(parseError(response.payload)).toEqual({
        error: 'Tenant membership required',
      });
    });
  });

  describe('Protected authentication endpoints', () => {
    it('protects GET /api/auth/me', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
      });

      expect(response.statusCode).toBe(401);

      expect(parseError(response.payload)).toEqual({
        error: 'Unauthorized',
      });
    });

    it('protects POST /api/auth/logout when no Bearer token is supplied', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/logout',
      });

      expect(response.statusCode).toBe(401);

      expect(parseError(response.payload)).toEqual({
        error: 'Unauthorized',
      });
    });

    it('protects POST /api/auth/refresh when no Bearer token is supplied', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/refresh',
      });

      expect(response.statusCode).toBe(401);

      expect(parseError(response.payload)).toEqual({
        error: 'Unauthorized',
      });
    });
  });

  describe('Public security boundary', () => {
    it('keeps /health publicly reachable', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);

      expect(response.json()).toEqual({
        status: 'ok',
      });
    });

    it('keeps /ready publicly reachable', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/ready',
      });

      expect(response.statusCode).toBe(200);

      expect(response.json()).toEqual({
        status: 'ready',
        database: 'ok',
      });
    });
  });

  describe('Authentication abuse protection', () => {
    it('returns 429 after the authentication rate limit is exceeded', async () => {
      const email = uniqueTestEmail('m28-5-rate-limit');

      let lastResponseStatus = 0;
      let rateLimitedResponse: Awaited<
        ReturnType<typeof app.inject>
      > | null = null;

      /*
       * AuthRateLimiter is configured as:
       *
       *   60_000 ms window
       *   10 attempts
       *
       * The limiter key is:
       *
       *   request.ip + normalized email
       *
       * Therefore all requests below deliberately use the
       * same email from the same injected request origin.
       *
       * The first request may register successfully.
       * Subsequent requests may return 409 because the email
       * already exists. That is expected. The security condition
       * is that the limiter eventually returns 429.
       */
      for (let attempt = 1; attempt <= 11; attempt += 1) {
        const response = await app.inject({
          method: 'POST',
          url: '/api/auth/register',
          payload: {
            email,
            password: 'Password123!',
            displayName: 'M28.5 Rate Limit Tester',
          },
        });

        lastResponseStatus = response.statusCode;

        if (response.statusCode === 429) {
          rateLimitedResponse = response;
          break;
        }
      }

      expect(
        rateLimitedResponse,
        `expected HTTP 429 after rate-limit attempts; last status was ${lastResponseStatus}`,
      ).not.toBeNull();

      expect(rateLimitedResponse!.statusCode).toBe(429);

      expect(
        rateLimitedResponse!.headers['retry-after'],
      ).toBe('60');

      expect(
        parseError(rateLimitedResponse!.payload),
      ).toEqual({
        error: 'Too many authentication attempts',
      });
    });
  });

  describe('Security error hygiene', () => {
    it('does not expose internal details for tenant authorization failure', async () => {
      const ownerSession = await createSession(
        'm28-5-hygiene-owner',
      );
      const otherSession = await createSession(
        'm28-5-hygiene-other',
      );

      const response = await app.inject({
        method: 'GET',
        url: '/api/audit',
        headers: authHeaders(
          ownerSession,
          otherSession.tenant.id,
        ),
      });

      expect(response.statusCode).toBe(403);

      expect(response.payload).not.toContain(
        ownerSession.session.token,
      );
      expect(response.payload).not.toContain(
        otherSession.session.token,
      );
      expect(response.payload).not.toContain('password');
      expect(response.payload).not.toContain('Bearer');
      expect(response.payload).not.toContain('stack');
      expect(response.payload).not.toContain('Error:');
      expect(response.payload).not.toContain(' at ');

      expect(parseError(response.payload)).toEqual({
        error: 'Tenant membership required',
      });
    });

    it('does not expose internal details for malformed authorization', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/audit',
        headers: {
          authorization: 'Bearer',
        },
      });

      expect(response.statusCode).toBe(401);

      expect(response.payload).not.toContain('password');
      expect(response.payload).not.toContain('token');
      expect(response.payload).not.toContain('stack');
      expect(response.payload).not.toContain('Error:');
      expect(response.payload).not.toContain(' at ');

      expect(parseError(response.payload)).toEqual({
        error: 'Unauthorized',
      });
    });
  });
});