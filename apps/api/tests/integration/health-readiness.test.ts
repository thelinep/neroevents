import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
} from 'vitest';

import { buildApp } from '../../src/app.js';
import { pool } from '../../src/db/client.js';

describe('M28.1 Health & Readiness', () => {
  const app = buildApp();

  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await pool.end();
  });

  describe('GET /health', () => {
    it('returns HTTP 200', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
    });

    it('returns the healthy status contract', async () => {
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

    it('does not require authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).not.toBe(401);
      expect(response.statusCode).not.toBe(403);
    });
  });

  describe('GET /ready', () => {
    it('returns HTTP 200 when the database is ready', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/ready',
      });

      expect(response.statusCode).toBe(200);
    });

    it('returns the ready status contract', async () => {
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

    it('reports database readiness explicitly', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/ready',
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.payload) as {
        status?: string;
        database?: string;
      };

      expect(body.status).toBe('ready');
      expect(body.database).toBe('ok');
    });

    it('does not require authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/ready',
      });

      expect(response.statusCode).not.toBe(401);
      expect(response.statusCode).not.toBe(403);
    });
  });

  describe('health/readiness endpoint isolation', () => {
    it('does not expose an authentication token requirement', async () => {
      const health = await app.inject({
        method: 'GET',
        url: '/health',
      });

      const ready = await app.inject({
        method: 'GET',
        url: '/ready',
      });

      expect(health.statusCode).toBe(200);
      expect(ready.statusCode).toBe(200);
    });

    it('does not return an error response while the database is available', async () => {
      await pool.query('SELECT 1');

      const response = await app.inject({
        method: 'GET',
        url: '/ready',
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.payload) as {
        status?: string;
        database?: string;
      };

      expect(body.status).toBe('ready');
      expect(body.database).toBe('ok');
    });
  });
});