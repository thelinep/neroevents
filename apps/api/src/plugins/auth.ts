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

  app.addHook('preHandler', async (request, reply) => {
    const publicPaths = [
      '/api/auth/login',
      '/api/auth/register',
      '/api/auth/refresh',
      '/health',
      '/ready',
    ];

    // Public API endpoints.
    if (
      publicPaths.some(
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
  });
});