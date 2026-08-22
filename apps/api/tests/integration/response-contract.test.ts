import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
} from 'vitest';

import { buildApp } from '../../src/app.js';
import { pool } from '../../src/db/client.js';
import type { FastifyInstance } from 'fastify';

interface TestUser {
  id: string;
  email: string;
  displayName: string | null;
}

interface TestTenant {
  id: string;
  name: string;
  slug: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
}

interface TestSession {
  user: TestUser;
  token: string;
  tenant: TestTenant;
}

let app: FastifyInstance;

const TEST_RUN_ID = `${Date.now()}-${Math.random()
  .toString(36)
  .slice(2, 10)}`;

function uniqueTestEmail(prefix: string): string {
  return `${prefix}-${TEST_RUN_ID}-${Math.random()
    .toString(36)
    .slice(2, 8)}@m28-4.test`;
}

function authHeaders(
  session: TestSession,
  includeTenant = true,
): Record<string, string> {
  return {
    authorization: `Bearer ${session.token}`,
    ...(includeTenant
      ? {
          'x-tenant-id': session.tenant.id,
        }
      : {}),
  };
}

function assertIsoDateString(value: unknown): void {
  expect(typeof value).toBe('string');

  const parsed = Date.parse(value as string);

  expect(Number.isNaN(parsed)).toBe(false);
}

function assertUserContract(
  user: unknown,
): asserts user is TestUser {
  expect(user).toBeDefined();
  expect(typeof user).toBe('object');
  expect(user).not.toBeNull();

  const value = user as Record<string, unknown>;

  expect(typeof value.id).toBe('string');
  expect(typeof value.email).toBe('string');

  expect(
    value.displayName === null ||
      typeof value.displayName === 'string',
  ).toBe(true);

  expect(Object.keys(value).sort()).toEqual([
    'displayName',
    'email',
    'id',
  ]);
}

function assertTenantContract(
  tenant: unknown,
): asserts tenant is TestTenant {
  expect(tenant).toBeDefined();
  expect(typeof tenant).toBe('object');
  expect(tenant).not.toBeNull();

  const value = tenant as Record<string, unknown>;

  expect(typeof value.id).toBe('string');
  expect(typeof value.name).toBe('string');
  expect(typeof value.slug).toBe('string');

  expect([
    'OWNER',
    'ADMIN',
    'MEMBER',
    'VIEWER',
  ]).toContain(value.role);

  expect(Object.keys(value).sort()).toEqual([
    'id',
    'name',
    'role',
    'slug',
  ]);
}

function assertAuthResponseContract(
  body: unknown,
  requireTenant: boolean,
): void {
  expect(body).toBeDefined();
  expect(typeof body).toBe('object');
  expect(body).not.toBeNull();

  const value = body as Record<string, unknown>;

  expect(typeof value.token).toBe('string');
  expect(value.token).not.toBe('');
  expect(typeof value.expiresAt).toBe('string');

  assertIsoDateString(value.expiresAt);
  assertUserContract(value.user);

  if (requireTenant) {
    assertTenantContract(value.tenant);
    expect(Object.keys(value).sort()).toEqual([
      'expiresAt',
      'tenant',
      'token',
      'user',
    ]);
  } else {
    expect(Object.keys(value).sort()).toEqual([
      'expiresAt',
      'token',
      'user',
    ]);
  }
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

  const body = response.json() as {
    user: TestUser;
    token: string;
    expiresAt: string;
    tenant: TestTenant;
  };

  assertAuthResponseContract(body, true);

  return {
    user: body.user,
    token: body.token,
    tenant: body.tenant,
  };
}

describe('M28.4 API Response Contract & Schema Hardening', () => {
  beforeAll(async () => {
    app = buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/auth/register', () => {
    it('returns the complete registration response contract', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: uniqueTestEmail('register'),
          password: 'Password123!',
          displayName: 'M28.4 Register User',
        },
      });

      expect(response.statusCode).toBe(201);
      expect(response.headers['content-type']).toContain(
        'application/json',
      );

      const body = response.json();

      assertAuthResponseContract(body, true);
    });
  });

  describe('POST /api/auth/login', () => {
    it('returns the complete login response contract', async () => {
      const email = uniqueTestEmail('login');

      const registration = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email,
          password: 'Password123!',
          displayName: 'M28.4 Login User',
        },
      });

      expect(registration.statusCode).toBe(201);

      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email,
          password: 'Password123!',
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain(
        'application/json',
      );

      const body = response.json();

      assertAuthResponseContract(body, false);
    });
  });

  describe('GET /api/auth/me', () => {
    it('returns the user response contract', async () => {
      const session = await createSession('m28-4-me');

      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: authHeaders(session, false),
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain(
        'application/json',
      );

      const body = response.json() as {
        user?: unknown;
      };

      expect(Object.keys(body).sort()).toEqual(['user']);

      assertUserContract(body.user);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('returns the logout success contract', async () => {
      const session = await createSession('m28-4-logout');

      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/logout',
        headers: authHeaders(session, false),
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain(
        'application/json',
      );

      expect(response.json()).toEqual({
        success: true,
      });
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('returns the complete refresh response contract', async () => {
      const session = await createSession('m28-4-refresh');

      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/refresh',
        headers: {
          authorization: `Bearer ${session.token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain(
        'application/json',
      );

      const body = response.json();

      assertAuthResponseContract(body, false);
    });
  });

  describe('Authentication error response contracts', () => {
    it('returns the exact unauthorized contract for /me without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
      });

      expect(response.statusCode).toBe(401);

      expect(response.json()).toEqual({
        error: 'Unauthorized',
      });
    });

    it('returns the exact unauthorized contract for logout without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/logout',
      });

      expect(response.statusCode).toBe(401);

      expect(response.json()).toEqual({
        error: 'Unauthorized',
      });
    });

    it('returns the exact invalid-credentials contract for login failure', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: uniqueTestEmail('invalid-login'),
          password: 'WrongPassword123!',
        },
      });

      expect(response.statusCode).toBe(401);

      expect(response.json()).toEqual({
        error: 'Invalid credentials',
      });
    });
  });

  describe('GET /api/audit', () => {
    it('returns the collection response contract', async () => {
      const session = await createSession('m28-4-audit');

      const response = await app.inject({
        method: 'GET',
        url: '/api/audit',
        headers: authHeaders(session),
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain(
        'application/json',
      );

      const body = response.json() as {
        items?: unknown;
        pagination?: unknown;
      };

      expect(Object.keys(body).sort()).toEqual([
        'items',
        'pagination',
      ]);

      expect(Array.isArray(body.items)).toBe(true);

      expect(body.pagination).toBeDefined();
      expect(typeof body.pagination).toBe('object');

      const pagination =
        body.pagination as Record<string, unknown>;

      expect(Object.keys(pagination).sort()).toEqual([
        'limit',
        'offset',
      ]);

      expect(typeof pagination.limit).toBe('number');
      expect(typeof pagination.offset).toBe('number');

      expect(pagination.limit).toBeGreaterThanOrEqual(1);
      expect(pagination.limit).toBeLessThanOrEqual(100);
      expect(pagination.offset).toBeGreaterThanOrEqual(0);
    });

    it('returns audit events using the established event contract', async () => {
      const session = await createSession('m28-4-audit-event');

      const response = await app.inject({
        method: 'GET',
        url: '/api/audit',
        headers: authHeaders(session),
      });

      expect(response.statusCode).toBe(200);

      const body = response.json() as {
        items?: unknown[];
      };

      expect(Array.isArray(body.items)).toBe(true);

      for (const item of body.items ?? []) {
        expect(item).toBeDefined();
        expect(typeof item).toBe('object');
        expect(item).not.toBeNull();

        const event = item as Record<string, unknown>;

        expect(Object.keys(event).sort()).toEqual([
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

        expect(typeof event.id).toBe('string');
        expect(typeof event.tenant_id).toBe('string');

        expect(
          event.user_id === null ||
            typeof event.user_id === 'string',
        ).toBe(true);

        expect(
          event.project_id === null ||
            typeof event.project_id === 'string',
        ).toBe(true);

        expect(typeof event.action).toBe('string');

        expect(
          event.resource_type === null ||
            typeof event.resource_type === 'string',
        ).toBe(true);

        expect(
          event.resource_id === null ||
            typeof event.resource_id === 'string',
        ).toBe(true);

        expect(typeof event.metadata).toBe('object');
        expect(event.metadata).not.toBeNull();

        expect(typeof event.created_at).toBe('string');
        expect(
          Number.isNaN(Date.parse(event.created_at as string)),
        ).toBe(false);
      }
    });
  });

  describe('Health and readiness', () => {
    it('returns the exact /health response contract', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain(
        'application/json',
      );

      expect(response.json()).toEqual({
        status: 'ok',
      });
    });

    it('returns the exact /ready response contract', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/ready',
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain(
        'application/json',
      );

      expect(response.json()).toEqual({
        status: 'ready',
        database: 'ok',
      });
    });
  });
});