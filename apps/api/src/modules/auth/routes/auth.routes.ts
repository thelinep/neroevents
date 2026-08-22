import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { parseLoginBody, parseRegisterBody } from '../schemas/auth.schemas.js';
import { AuthRateLimiter } from '../services/rate-limiter.js';

function tokenFrom(request: FastifyRequest): string | null {
  const header = request.headers.authorization;
  return header?.startsWith('Bearer ') ? header.slice(7).trim() : null;
}

export async function authRoutes(app: FastifyInstance) {
  const limiter = new AuthRateLimiter(60_000, 10);
  const limited = (request: FastifyRequest, reply: FastifyReply): boolean => {
    const body = (request.body ?? {}) as { email?: string };
    const key = `${request.ip}:${String(body.email ?? '').toLowerCase()}`;
    if (!limiter.consume(key)) {
      reply.header('Retry-After', '60').status(429).send({ error: 'Too many authentication attempts' });
      return false;
    }
    return true;
  };

  app.post('/register', async (request, reply) => {
    if (!limited(request, reply)) return;
    try {
      const body = parseRegisterBody(request);
      const result = await app.authService.register(body.email, body.password, body.displayName);
      return reply.status(201).send({
        user: result.user,
        token: result.session.token,
        expiresAt: result.session.expiresAt.toISOString(),
        tenant: result.tenant,
      });
    } catch (error) {
      const err = error as { code?: string; message?: string };
      if (err.code === 'EMAIL_EXISTS') return reply.status(409).send({ error: 'Email already registered' });
      return reply.status(400).send({ error: err.message ?? 'Invalid registration data' });
    }
  });

  app.post('/login', async (request, reply) => {
    if (!limited(request, reply)) return;
    try {
      const body = parseLoginBody(request);
      const result = await app.authService.login(body.email, body.password);
      return reply.send({
        user: result.user,
        token: result.session.token,
        expiresAt: result.session.expiresAt.toISOString(),
      });
    } catch {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }
  });

app.get('/me', async (request, reply) => {
  const token = tokenFrom(request);

  if (!token) {
    return reply.status(401).send({
      error: 'Unauthorized',
    });
  }

  const user = await app.authService.authenticate(token);

  if (!user) {
    return reply.status(401).send({
      error: 'Unauthorized',
    });
  }

  return reply.send({
    user,
  });
});

app.post('/logout', async (request, reply) => {
  const token = tokenFrom(request);

  if (!token) {
    return reply.status(401).send({
      error: 'Unauthorized',
    });
  }

  await app.authService.logout(token);

  return reply.send({
    success: true,
  });
});

  app.post('/refresh', async (request, reply) => {
    const token = tokenFrom(request);
    if (!token) return reply.status(401).send({ error: 'Unauthorized' });
    try {
      const result = await app.authService.refresh(token);
      return reply.send({
        user: result.user,
        token: result.session.token,
        expiresAt: result.session.expiresAt.toISOString(),
      });
    } catch {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
  });
}
