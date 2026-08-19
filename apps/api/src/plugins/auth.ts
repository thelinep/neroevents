import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyRequest } from 'fastify';
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
  interface FastifyInstance { authService: AuthService; }
}

export default fp(async (app: FastifyInstance) => {
  const service = new AuthService(
    pool,
    config.sessionExpiryDays
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

    if (
      publicPaths.some(
        (path) =>
          request.url === path ||
          request.url.startsWith(`${path}?`)
      )
    ) {
      return;
    }

    if (request.url === '/ws') {
      return;
    }

    const header = request.headers.authorization;

    if (!header?.startsWith('Bearer ')) {
      return reply
        .status(401)
        .send({ error: 'Unauthorized' });
    }

    const user = await service.authenticate(
      header.slice(7).trim()
    );

    if (!user) {
      return reply
        .status(401)
        .send({ error: 'Unauthorized' });
    }

    request.user = user;
  });
});
