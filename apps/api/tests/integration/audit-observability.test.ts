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
import { Writable } from 'node:stream';

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

interface LogRecord {
  level?: number;
  msg?: string;
  operation?: string;
  requestId?: string;
  tenantId?: string;
  eventId?: string;
  statusCode?: number;
  durationMs?: number;
  [key: string]: unknown;
}

const TEST_RUN_ID = `${Date.now()}-${Math.random()
  .toString(36)
  .slice(2, 10)}`;

function uniqueEmail(label: string): string {
  return `${label}-${TEST_RUN_ID}-${Math.random()
    .toString(36)
    .slice(2, 8)}@m27-4.test`;
}

const capturedLogs: LogRecord[] = [];
interface TestLogger {
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  debug: (...args: unknown[]) => void;
  trace: (...args: unknown[]) => void;
  fatal: (...args: unknown[]) => void;
  child: (...args: unknown[]) => TestLogger;
}

const testLogger: TestLogger = {
  info: (value?: unknown) => {
    if (
      value &&
      typeof value === 'object'
    ) {
      capturedLogs.push(
        value as LogRecord,
      );
    }
  },

  warn: () => {},
  error: (value?: unknown) => {
    if (
      value &&
      typeof value === 'object'
    ) {
      capturedLogs.push(
        value as LogRecord,
      );
    }
  },
  debug: () => {},
  trace: () => {},
  fatal: () => {},

  child: () => testLogger,
};



const logStream = new Writable({
  write(
    chunk,
    _encoding,
    callback,
  ) {
    const line = chunk.toString();

    try {
      capturedLogs.push(
        JSON.parse(line) as LogRecord,
      );
    } catch {
      // Ignore non-JSON output.
    }

    callback();
  },
});

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

async function seedAuditEvent(
  session: TestSession,
): Promise<AuditEvent> {
  const result = await pool.query<AuditEvent>(
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
      'observability:test',
      'test',
      `m27-4-${TEST_RUN_ID}`,
      JSON.stringify({
        secret: 'must-not-be-logged',
        milestone: 'M27.4',
      }),
    ],
  );

  expect(result.rows).toHaveLength(1);

  return result.rows[0];
}



function clearCapturedLogs(): void {
  capturedLogs.length = 0;
}

function getCapturedLogs(): LogRecord[] {
  return capturedLogs;
}

function findLog(
  operation: string,
): LogRecord | undefined {
  return capturedLogs.find(
    (entry) => entry.operation === operation,
  );
}



function serializeLogs(): string {
  return JSON.stringify(getCapturedLogs());
}

describe('M27.4 audit observability', () => {
  beforeAll(async () => {
    app = buildApp({
  logger: {
    stream: logStream,
  },
});
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('logs audit collection operation', async () => {
    clearCapturedLogs();

    const session = await createSession(
      'audit-observability-list',
    );

    const response = await app.inject({
      method: 'GET',
      url: '/api/audit',
      headers: authHeaders(session),
    });

    expect(response.statusCode).toBe(200);

    const log = findLog('audit.read.list');

    expect(log).toBeDefined();
    expect(log?.operation).toBe(
      'audit.read.list',
    );
  });

  it('logs audit detail operation', async () => {
    clearCapturedLogs();

    const session = await createSession(
      'audit-observability-detail',
    );

    const event = await seedAuditEvent(session);

    const response = await app.inject({
      method: 'GET',
      url: `/api/audit/${event.id}`,
      headers: authHeaders(session),
    });

    expect(response.statusCode).toBe(200);

    const log = findLog('audit.read.detail');

    expect(log).toBeDefined();
    expect(log?.operation).toBe(
      'audit.read.detail',
    );
  });

  it('includes request/correlation ID', async () => {
    clearCapturedLogs();

    const session = await createSession(
      'audit-observability-request-id',
    );

    const response = await app.inject({
      method: 'GET',
      url: '/api/audit',
      headers: authHeaders(session),
    });

    expect(response.statusCode).toBe(200);

    const log = findLog('audit.read.list');

    expect(log).toBeDefined();
    expect(log?.requestId).toEqual(
      expect.any(String),
    );
  });

  it('records response status', async () => {
    clearCapturedLogs();

    const session = await createSession(
      'audit-observability-status',
    );

    const response = await app.inject({
      method: 'GET',
      url: '/api/audit',
      headers: authHeaders(session),
    });

    expect(response.statusCode).toBe(200);

    const log = findLog('audit.read.list');

    expect(log).toBeDefined();
    expect(log?.statusCode).toBe(200);
  });

  it('records request duration', async () => {
    clearCapturedLogs();

    const session = await createSession(
      'audit-observability-duration',
    );

    const response = await app.inject({
      method: 'GET',
      url: '/api/audit',
      headers: authHeaders(session),
    });

    expect(response.statusCode).toBe(200);

    const log = findLog('audit.read.list');

    expect(log).toBeDefined();
    expect(log?.durationMs).toEqual(
      expect.any(Number),
    );
    expect(log?.durationMs).toBeGreaterThanOrEqual(
      0,
    );
  });

  it('records tenant context', async () => {
    clearCapturedLogs();

    const session = await createSession(
      'audit-observability-tenant',
    );

    const response = await app.inject({
      method: 'GET',
      url: '/api/audit',
      headers: authHeaders(session),
    });

    expect(response.statusCode).toBe(200);

    const log = findLog('audit.read.list');

    expect(log).toBeDefined();
    expect(log?.tenantId).toBe(
      session.tenant.id,
    );
  });

  it('records event ID for detail requests', async () => {
    clearCapturedLogs();

    const session = await createSession(
      'audit-observability-event',
    );

    const event = await seedAuditEvent(session);

    const response = await app.inject({
      method: 'GET',
      url: `/api/audit/${event.id}`,
      headers: authHeaders(session),
    });

    expect(response.statusCode).toBe(200);

    const log = findLog('audit.read.detail');

    expect(log).toBeDefined();
    expect(log?.eventId).toBe(event.id);
    expect(log?.tenantId).toBe(
      session.tenant.id,
    );
  });

  it('logs authorization denial', async () => {
    clearCapturedLogs();

    const session = await createSession(
      'audit-observability-denied',
    );

    await pool.query(
      `
        UPDATE tenant_memberships
        SET role = 'MEMBER'
        WHERE tenant_id = $1
          AND user_id = $2
      `,
      [
        session.tenant.id,
        session.user.id,
      ],
    );

    const response = await app.inject({
      method: 'GET',
      url: '/api/audit',
      headers: authHeaders(session),
    });

    expect(response.statusCode).toBe(403);

    const log = findLog(
      'audit.authorization.denied',
    );

    expect(log).toBeDefined();
    expect(log?.operation).toBe(
      'audit.authorization.denied',
    );
    expect(log?.statusCode).toBe(403);
    expect(log?.tenantId).toBe(
      session.tenant.id,
    );
    expect(log?.requestId).toEqual(
      expect.any(String),
    );
    expect(log?.durationMs).toEqual(
      expect.any(Number),
    );
  });

  it('logs database failures', async () => {
    clearCapturedLogs();

    const session = await createSession(
      'audit-observability-db-error',
    );

    const originalQuery = pool.query;

    pool.query = (async (...args: Parameters<typeof pool.query>) => {
      const sql = String(args[0]);

      if (
        sql.includes('FROM audit_events') &&
        sql.includes('ORDER BY created_at')
      ) {
        throw new Error(
          'M27.4 test database failure',
        );
      }

      return originalQuery.apply(pool, args);
    }) as typeof pool.query;

    try {
      const response = await app.inject({
        method: 'GET',
        url: '/api/audit',
        headers: authHeaders(session),
      });

      expect(response.statusCode).toBe(500);

      const log = findLog(
        'audit.read.error',
      );

      expect(log).toBeDefined();
      expect(log?.operation).toBe(
        'audit.read.error',
      );
      expect(log?.statusCode).toBe(500);
      expect(log?.tenantId).toBe(
        session.tenant.id,
      );
      expect(log?.requestId).toEqual(
        expect.any(String),
      );
      expect(log?.durationMs).toEqual(
        expect.any(Number),
      );
    } finally {
      pool.query = originalQuery;
    }
  });

  it('does not log audit metadata', async () => {
    clearCapturedLogs();

    const session = await createSession(
      'audit-observability-no-metadata',
    );

    const event = await seedAuditEvent(session);

    const response = await app.inject({
      method: 'GET',
      url: `/api/audit/${event.id}`,
      headers: authHeaders(session),
    });

    expect(response.statusCode).toBe(200);

    const serialized = serializeLogs();

    expect(serialized).not.toContain(
      'must-not-be-logged',
    );

    expect(serialized).not.toContain(
      '"metadata"',
    );
  });

  it('does not log authorization token', async () => {
    clearCapturedLogs();

    const session = await createSession(
      'audit-observability-no-token',
    );

    const response = await app.inject({
      method: 'GET',
      url: '/api/audit',
      headers: authHeaders(session),
    });

    expect(response.statusCode).toBe(200);

    const serialized = serializeLogs();

    expect(serialized).not.toContain(
      session.token,
    );

    expect(serialized).not.toContain(
      'authorization',
    );

    expect(serialized).not.toContain(
      'Bearer ',
    );
  });

  it('preserves existing audit behavior', async () => {
    clearCapturedLogs();

    const session = await createSession(
      'audit-observability-behavior',
    );

    const event = await seedAuditEvent(session);

    const detailResponse = await app.inject({
      method: 'GET',
      url: `/api/audit/${event.id}`,
      headers: authHeaders(session),
    });

    expect(detailResponse.statusCode).toBe(
      200,
    );

    const detail =
      detailResponse.json<AuditEvent>();

    expect(detail).toMatchObject({
      id: event.id,
      tenant_id: session.tenant.id,
      user_id: session.user.id,
      action: 'observability:test',
      resource_type: 'test',
      resource_id: `m27-4-${TEST_RUN_ID}`,
      metadata: {
        secret: 'must-not-be-logged',
        milestone: 'M27.4',
      },
    });

    const listResponse = await app.inject({
      method: 'GET',
      url: '/api/audit',
      headers: authHeaders(session),
    });

    expect(listResponse.statusCode).toBe(200);

    const list =
      listResponse.json<{
        items: AuditEvent[];
        pagination: {
          limit: number;
          offset: number;
        };
      }>();

    const listed = list.items.find(
      (item) => item.id === event.id,
    );

    expect(listed).toBeDefined();
    expect(listed).toEqual(detail);

    expect(list.pagination).toEqual({
      limit: 50,
      offset: 0,
    });
  });
});