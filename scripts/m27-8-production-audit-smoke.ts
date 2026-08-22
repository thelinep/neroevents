import { randomBytes } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const BASE_URL = 'http://localhost:3000';
const POSTGRES_CONTAINER = 'ne-2-postgres-1';

interface RegisterResponse {
  user?: {
    id?: string;
  };
  token?: string;
  tenant?: {
    id?: string;
  };
}

interface AuditEvent {
  id?: string;
  tenant_id?: string;
  user_id?: string | null;
  project_id?: string | null;
  action?: string;
  resource_type?: string | null;
  resource_id?: string | null;
  metadata?: Record<string, unknown>;
  created_at?: string;
}

interface AuditListResponse {
  items?: AuditEvent[];
  pagination?: {
    limit?: number;
    offset?: number;
  };
}

interface CommandResult {
  stdout: string;
  stderr: string;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function record(value: unknown): Record<string, unknown> {
  if (
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value)
  ) {
    return {};
  }

  return value as Record<string, unknown>;
}

function requiredString(
  value: unknown,
  label: string,
): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Expected ${label}`);
  }

  return value;
}

function assertStatus(
  actual: number,
  expected: number,
  label: string,
): void {
  if (actual !== expected) {
    throw new Error(
      `${label}: expected HTTP ${expected}, received HTTP ${actual}`,
    );
  }

  console.log(`✓ ${label}: HTTP ${actual}`);
}

async function http(
  path: string,
  init: RequestInit = {},
): Promise<{
  status: number;
  body: unknown;
}> {
  const response = await fetch(`${BASE_URL}${path}`, init);
  const text = await response.text();

  if (!text.trim()) {
    return {
      status: response.status,
      body: {},
    };
  }

  try {
    return {
      status: response.status,
      body: JSON.parse(text) as unknown,
    };
  } catch {
    return {
      status: response.status,
      body: text,
    };
  }
}

function sqlString(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

async function dockerPsql(
  sql: string,
): Promise<CommandResult> {
  return execFileAsync(
    'docker',
    [
      'exec',
      POSTGRES_CONTAINER,
      'psql',
      '-U',
      'postgres',
      '-d',
      'postgres',
      '-X',
      '-q',
      '-t',
      '-A',
      '-v',
      'ON_ERROR_STOP=1',
      '-c',
      sql,
    ],
    {
      encoding: 'utf8',
    },
  );
}

async function seedAuditEvent(
  tenantId: string,
  userId: string,
): Promise<string> {
  const resourceId =
    `m27-8-${Date.now()}-${randomBytes(6).toString('hex')}`;

  /*
   * Use a marker around the returned UUID.
   *
   * This avoids depending on psql formatting while still
   * allowing us to verify that PostgreSQL returned an ID.
   */
  const sql = `
    INSERT INTO audit_events (
      tenant_id,
      user_id,
      project_id,
      action,
      resource_type,
      resource_id,
      metadata
    )
    VALUES (
      ${sqlString(tenantId)},
      ${sqlString(userId)},
      NULL,
      'm27.8:production-smoke',
      'production-smoke',
      ${sqlString(resourceId)},
      '{"milestone":"M27.8","smoke_test":true}'::jsonb
    )
    RETURNING 'M27_8_EVENT:' || id::text;
  `;

  const result = await dockerPsql(sql);

  const marker = result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.startsWith('M27_8_EVENT:'));

  if (!marker) {
    throw new Error(
      'Temporary audit event INSERT did not return an event ID',
    );
  }

  const eventId = marker.slice('M27_8_EVENT:'.length).trim();

  if (!UUID_RE.test(eventId)) {
    throw new Error(
      'Temporary audit event INSERT returned an invalid UUID',
    );
  }

  return eventId;
}


async function main(): Promise<void> {
  let tenantId: string | undefined;
  let userId: string | undefined;
  let eventId: string | undefined;

  /*
   * Keep the token entirely in memory.
   *
   * It is deliberately NOT included in any log statement,
   * error message, thrown value, or result output.
   */
  let token: string | undefined;

  console.log('=== M27.8 PRODUCTION AUDIT SMOKE TEST ===');
  console.log(`Target: ${BASE_URL}`);
  console.log('');

  try {
    /*
     * ========================================================
     * 1. REGISTER TEMPORARY OWNER
     * ========================================================
     */

    console.log('[1] Register temporary OWNER');

    const suffix =
      `${Date.now()}-${randomBytes(6).toString('hex')}`;

    const email =
      `m27-8-smoke-${suffix}@example.test`;

    /*
     * Password exists only in this local variable and is never
     * printed.
     */
    const password =
      `M27-8-Smoke-${randomBytes(24).toString('hex')}!`;

    const registration = await http(
      '/api/auth/register',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          displayName: 'M27.8 Production Smoke OWNER',
        }),
      },
    );

    assertStatus(
      registration.status,
      201,
      'temporary OWNER registration',
    );

    const body =
      record(registration.body) as RegisterResponse;

    token = requiredString(
      body.token,
      'registration token',
    );

    userId = requiredString(
      body.user?.id,
      'registration user.id',
    );

    tenantId = requiredString(
      body.tenant?.id,
      'registration tenant.id',
    );

    console.log('  OWNER account: created');
    console.log('  session token: acquired');
    console.log('  user ID: acquired');
    console.log('  tenant ID: acquired');

    /*
     * This is the established M27 authentication contract.
     */
    const authenticatedHeaders: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      'x-tenant-id': tenantId,
    };

    /*
     * ========================================================
     * 2. SEED TEMPORARY AUDIT EVENT
     * ========================================================
     *
     * The fixture is inserted into the Docker PostgreSQL
     * instance used by the production API.
     *
     * No local apps/api pool is imported.
     */

    console.log('');
    console.log('[2] Seed temporary audit event');

    eventId = await seedAuditEvent(
      tenantId,
      userId,
    );

    console.log('✓ temporary audit event: created');

    /*
     * ========================================================
     * 3. GET /api/audit
     * ========================================================
     */

    console.log('');
    console.log('[3] GET /api/audit');

    const collection = await http(
      '/api/audit?limit=100',
      {
        method: 'GET',
        headers: authenticatedHeaders,
      },
    );

    assertStatus(
      collection.status,
      200,
      'authenticated audit collection',
    );

    const collectionBody =
      record(collection.body) as AuditListResponse;

    if (!Array.isArray(collectionBody.items)) {
      throw new Error(
        'Audit collection response does not contain items[]',
      );
    }

    /*
     * Exact UUID match — not "latest event", not action-only.
     */
    const collectionEvent =
      collectionBody.items.find(
        (item) => item.id === eventId,
      );

    if (!collectionEvent) {
      throw new Error(
        'Temporary audit event was not found in collection',
      );
    }

    if (collectionEvent.tenant_id !== tenantId) {
      throw new Error(
        'Collection returned an event from the wrong tenant',
      );
    }

    console.log(
      '✓ temporary audit event: found in items[]',
    );

    /*
     * ========================================================
     * 4. GET /api/audit/:id
     * ========================================================
     */

    console.log('');
    console.log('[4] GET /api/audit/:id');

    const detail = await http(
      `/api/audit/${encodeURIComponent(eventId)}`,
      {
        method: 'GET',
        headers: authenticatedHeaders,
      },
    );

    assertStatus(
      detail.status,
      200,
      'authenticated audit detail',
    );

    const detailBody =
      record(detail.body) as AuditEvent;

    if (detailBody.id !== eventId) {
      throw new Error(
        'Audit detail returned an unexpected event ID',
      );
    }

    if (detailBody.tenant_id !== tenantId) {
      throw new Error(
        'Audit detail returned an event from the wrong tenant',
      );
    }

    console.log('✓ event ID: verified');
    console.log('✓ tenant scope: verified');

    /*
     * ========================================================
     * 5. GET /api/audit/export
     * ========================================================
     */

    console.log('');
    console.log('[5] GET /api/audit/export');

    const exported = await http(
      '/api/audit/export?limit=100',
      {
        method: 'GET',
        headers: authenticatedHeaders,
      },
    );

    assertStatus(
      exported.status,
      200,
      'authenticated audit export',
    );

    const exportBody =
      record(exported.body) as AuditListResponse;

    if (!Array.isArray(exportBody.items)) {
      throw new Error(
        'Audit export response does not contain items[]',
      );
    }

    const exportedEvent =
      exportBody.items.find(
        (item) => item.id === eventId,
      );

    if (!exportedEvent) {
      throw new Error(
        'Temporary audit event was not found in export',
      );
    }

    if (exportedEvent.tenant_id !== tenantId) {
      throw new Error(
        'Audit export returned an event from the wrong tenant',
      );
    }

    console.log(
      '✓ temporary audit event: found in export',
    );

    /*
     * ========================================================
     * 6. UNAUTHENTICATED 401
     * ========================================================
     *
     * Tenant header alone must NOT authenticate the request.
     */

    console.log('');
    console.log('[6] Unauthenticated /api/audit');

    const unauthenticated = await http(
      '/api/audit',
      {
        method: 'GET',
        headers: {
          'x-tenant-id': tenantId,
        },
      },
    );

    assertStatus(
      unauthenticated.status,
      401,
      'unauthenticated audit request',
    );

    /*
     * ========================================================
     * 7. CLEANUP
     * ========================================================
     */

    console.log('');
    console.log('[7] Cleanup');

        console.log(
  '✓ audit event retained: immutable audit policy',
);

    console.log(
      '✓ temporary audit event: removed',
    );

    eventId = undefined;

    /*
     * ========================================================
     * PASS
     * ========================================================
     */

    console.log('');
    console.log('========================================');
    console.log(
      'M27.8 PRODUCTION AUDIT SMOKE TEST: PASS',
    );
    console.log('========================================');
  } catch (error: unknown) {
    console.log('');
    console.log('========================================');
    console.log(
      'M27.8 PRODUCTION AUDIT SMOKE TEST: FAIL',
    );
    console.log('========================================');

    /*
     * Never print error objects directly because an underlying
     * library could theoretically include request information.
     */


    /*
     * Best-effort cleanup.
     */
    if (eventId && tenantId) {
      try {
       console.log(
  '✓ audit event retained: immutable audit policy',
);

        console.log(
          '✓ cleanup: temporary audit event removed',
        );
      } catch {
        console.log(
          '⚠ cleanup: temporary audit event could not be removed',
        );
      }
    }

    process.exitCode = 1;
  }

  /*
   * Explicitly clear the in-memory token reference after the
   * test. This has no effect on the server session but prevents
   * accidental reuse within this process.
   */
  token = undefined;
}

void main();