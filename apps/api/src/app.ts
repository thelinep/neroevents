import Fastify from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import multipart from '@fastify/multipart';
import { v4 as uuidv4 } from 'uuid';
import fastifyStatic from '@fastify/static';
import path from 'node:path';
import { orchestrator } from './orchestrator.js';
import { pool } from './db/client.js';
import authPlugin from './plugins/auth.js';
import authRoutes from './routes/auth.js';
import projectsRoutes from './routes/projects.js';
import agentsRoutes from './routes/agents.js';
import filesRoutes from './routes/files.js';

export function buildApp() {
  const app = Fastify({ logger: true });

 app.register(fastifyStatic, {
    root: path.resolve(process.cwd(), '../web/dist'),
    prefix: '/',
  });
  app.setErrorHandler((error, _request, reply) => {
    const details = error as {
      statusCode?: number;
      message?: string;
    };

    return reply
      .status(details.statusCode || 500)
      .send({
        error: details.message || 'Unexpected server error',
      });
  });

  app.register(fastifyWebsocket);

  app.register(async (fastify) => {
    fastify.get('/ws', { websocket: true }, (connection) => {
      const clientId = uuidv4();
      const ws = connection;

      orchestrator.addClient(clientId, ws);
      ws.on('close', () => {
        orchestrator.removeClient(clientId);
      });
    });
  });

  app.register(multipart, {
    limits: {
      fileSize: 25 * 1024 * 1024,
      files: 1,
    },
  });

  app.register(authPlugin);
  app.register(authRoutes, { prefix: '/api/auth' });
  app.register(projectsRoutes, { prefix: '/api/projects' });
  app.register(agentsRoutes, { prefix: '/api/agents' });
  app.register(filesRoutes, { prefix: '/api/files' });
// Error handler


// WebSocket


// File upload

// ---- Identity / Auth ----

// ---- Health check ----
  app.get('/health', async () => ({
    status: 'ok',
  }));

  app.get('/ready', async (_request, reply) => {
    try {
      await pool.query('SELECT 1');

      return {
        status: 'ready',
        database: 'ok',
      };
    } catch {
      return reply.status(503).send({
        status: 'not_ready',
        database: 'unavailable',
      });
    }
  });

  app.setNotFoundHandler((request, reply) => {
    if (
      request.method === 'GET' &&
      !request.url.startsWith('/api/') &&
      !request.url.startsWith('/ws') &&
      !request.url.startsWith('/health') &&
      !request.url.startsWith('/ready') &&
      !request.url.startsWith('/assets/')
    ) {
      return reply.sendFile('index.html');
    }

    return reply.status(404).send({
      error: 'Not found',
    });
  });

  return app;
}