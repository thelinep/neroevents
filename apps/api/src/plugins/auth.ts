import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';

import { AuthService } from '../modules/auth/services/auth.service.js';
import { pool } from '../db/client.js';
import { config } from '../config.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string;
      email: string;
      displayName: string | null;
    };

    tenant?: {
      id: string;
      name: string;
      slug: string;
      role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
    };
  }

  interface FastifyInstance {
    authService: AuthService;
  }
}

export default fp(async (app: FastifyInstance) => {
  const service = new AuthService(
    pool,
    config.sessionExpiryDays,
  );

  app.decorate('authService', service);
  app.decorateRequest('user');
app.decorateRequest('tenant');

  app.addHook('preHandler', async (request, reply) => {
    const authManagedPaths = [
     '/api/auth/login',
    '/api/auth/register',
    '/api/auth/refresh',
    '/api/auth/me',
    '/api/auth/logout',
    '/health',
    '/ready',
    ];

    // Public API endpoints.
    if (
      authManagedPaths.some(
        (path) =>
          request.url === path ||
          request.url.startsWith(`${path}?`),
      )
    ) {
      return;
    }

    // WebSocket handles its own connection lifecycle.
    if (request.url === '/ws') {
      return;
    }

    // Public React SPA and static assets.
    //
    // API routes remain protected below.
    const isFrontendRequest =
      (request.method === 'GET'|| request.method === 'HEAD') &&
      !request.url.startsWith('/api/') &&
      !request.url.startsWith('/ws');

    if (isFrontendRequest) {
      return;
    }

    // Protected API requests require a Bearer token.
    const header = request.headers.authorization;

    if (!header?.startsWith('Bearer ')) {
      return reply
        .status(401)
        .send({ error: 'Unauthorized' });
    }

    const user = await service.authenticate(
      header.slice(7).trim(),
    );

    if (!user) {
      return reply
        .status(401)
        .send({ error: 'Unauthorized' });
    }

    request.user = user;
const tenantId = request.headers['x-tenant-id'];

if (typeof tenantId !== 'string' || !tenantId.trim()) {
  return reply.status(400).send({
    error: 'Tenant selection required',
  });
}

const tenantResult = await pool.query(
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
    LIMIT 1
  `,
  [user.id, tenantId.trim()],
);

if (tenantResult.rows.length === 0) {
  return reply.status(403).send({
    error: 'Tenant membership required',
  });
}

const tenant = tenantResult.rows[0];

request.tenant = {
  id: tenant.id,
  name: tenant.name,
  slug: tenant.slug,
  role: tenant.role,
};
  });
});