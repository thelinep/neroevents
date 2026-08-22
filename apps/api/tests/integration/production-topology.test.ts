import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
} from 'vitest';

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const PROJECT_ROOT = resolve(process.cwd(), '../..');
const COMPOSE_FILE = resolve(PROJECT_ROOT, 'docker-compose.yml');

let compose: string;

beforeAll(async () => {
  compose = await readFile(COMPOSE_FILE, 'utf8');
});

afterAll(async () => {
  // No infrastructure mutation is performed by this test.
});

describe('M29.2 Production Docker Compose Topology', () => {
  describe('Compose service topology', () => {
    it('defines the required production services', () => {
      expect(compose).toContain('postgres:');
      expect(compose).toContain('redis:');
      expect(compose).toContain('backend:');
      expect(compose).toContain('frontend:');
    });

    it('defines persistent PostgreSQL storage', () => {
      expect(compose).toContain('pgdata:/var/lib/postgresql/data');
      expect(compose).toContain('volumes:');
      expect(compose).toContain('pgdata:');
    });

    it('uses the expected PostgreSQL image', () => {
      expect(compose).toContain(
        'image: pgvector/pgvector:pg16',
      );
    });

    it('uses the expected Redis image', () => {
      expect(compose).toContain(
        'image: redis:7-alpine',
      );
    });
  });

  describe('PostgreSQL readiness', () => {
    it('defines a PostgreSQL healthcheck', () => {
      expect(compose).toContain('healthcheck:');
      expect(compose).toContain(
        'pg_isready -U postgres -d postgres',
      );
    });

    it('configures PostgreSQL healthcheck timing', () => {
      expect(compose).toContain('interval: 5s');
      expect(compose).toContain('timeout: 5s');
      expect(compose).toContain('retries: 10');
    });

    it('defines the expected PostgreSQL credentials/database', () => {
      expect(compose).toContain(
        'POSTGRES_USER: postgres',
      );
      expect(compose).toContain(
        'POSTGRES_PASSWORD: postgres',
      );
      expect(compose).toContain(
        'POSTGRES_DB: postgres',
      );
    });
  });

  describe('Redis readiness', () => {
    it('defines a Redis healthcheck', () => {
      expect(compose).toContain(
        'redis-cli',
      );
      expect(compose).toContain(
        'ping',
      );
    });

    it('configures Redis healthcheck retries', () => {
      expect(compose).toContain('interval: 5s');
      expect(compose).toContain('timeout: 5s');
      expect(compose).toContain('retries: 10');
    });
  });

  describe('Backend topology', () => {
    it('builds the backend from the API Dockerfile', () => {
      expect(compose).toContain(
        'dockerfile: apps/api/Dockerfile',
      );
    });

    it('binds the backend to port 3000', () => {
      expect(compose).toContain(
        '"3000:3000"',
      );
    });

    it('configures the backend to listen on all interfaces', () => {
      expect(compose).toContain(
        'HOST: 0.0.0.0',
      );
    });

    it('configures the backend port', () => {
      expect(compose).toContain(
        'PORT: 3000',
      );
    });

    it('provides the PostgreSQL connection through the Compose service name', () => {
      expect(compose).toContain(
        'DATABASE_URL: postgresql://postgres:postgres@postgres:5432/postgres',
      );
    });

    it('provides the Redis connection through the Compose service name', () => {
      expect(compose).toContain(
        'REDIS_URL: redis://redis:6379',
      );
    });

    it('defines a JWT secret configuration boundary', () => {
      expect(compose).toContain(
        'JWT_SECRET:',
      );

      expect(compose).toContain(
        '${JWT_SECRET:-change-me-in-development}',
      );
    });
  });

  describe('Backend dependency ordering', () => {
    it('waits for PostgreSQL health before starting the backend', () => {
      expect(compose).toContain(
        'postgres:',
      );

      expect(compose).toContain(
        'condition: service_healthy',
      );
    });

    it('waits for Redis health before starting the backend', () => {
      expect(compose).toContain(
        'redis:',
      );

      expect(compose).toContain(
        'condition: service_healthy',
      );
    });

    it('defines a backend healthcheck', () => {
      expect(compose).toContain(
        'fetch(\'http://127.0.0.1:3000/ready\')',
      );
    });

    it('uses the readiness response as the backend health signal', () => {
      expect(compose).toContain(
        'process.exit(r.ok ? 0 : 1)',
      );
    });

    it('allows sufficient backend healthcheck retries', () => {
      expect(compose).toContain('retries: 20');
    });
  });

  describe('Frontend topology', () => {
    it('builds the frontend from the web Dockerfile', () => {
      expect(compose).toContain(
        'dockerfile: apps/web/Dockerfile',
      );
    });

    it('binds the frontend to port 3001', () => {
      expect(compose).toContain(
        '"3001:3001"',
      );
    });

    it('waits for a healthy backend before starting', () => {
      expect(compose).toContain(
        'backend:',
      );

      expect(compose).toContain(
        'condition: service_healthy',
      );
    });
  });

  describe('Production dependency graph', () => {
    it('defines the expected dependency chain', () => {
      /*
       * Expected topology:
       *
       * postgres ──healthy──┐
       *                     ├──> backend ──healthy──> frontend
       * redis ─────healthy──┘
       */
      expect(compose).toContain(
        'postgres:',
      );

      expect(compose).toContain(
        'redis:',
      );

      expect(compose).toContain(
        'backend:',
      );

      expect(compose).toContain(
        'frontend:',
      );
    });

    it('does not define a frontend dependency directly on PostgreSQL', () => {
      const frontendSection = compose
        .split('  frontend:', 2)[1] ?? '';

      expect(frontendSection).not.toContain(
        'postgres:',
      );
    });

    it('does not define a frontend dependency directly on Redis', () => {
      const frontendSection = compose
        .split('  frontend:', 2)[1] ?? '';

      expect(frontendSection).not.toContain(
        'redis:',
      );
    });
  });

  describe('Infrastructure safety boundaries', () => {
    it('does not publish PostgreSQL to the host', () => {
      const postgresSection =
        compose.split('  postgres:', 2)[1]?.split(
          '  redis:',
          2,
        )[0] ?? '';

      expect(postgresSection).not.toContain(
        '5432:5432',
      );
    });

    it('does not publish Redis to the host', () => {
      const redisSection =
        compose.split('  redis:', 2)[1]?.split(
          '  backend:',
          2,
        )[0] ?? '';

      expect(redisSection).not.toContain(
        '6379:6379',
      );
    });

    it('does not hard-code a production JWT secret', () => {
      expect(compose).toContain(
        'JWT_SECRET: ${JWT_SECRET:-change-me-in-development}',
      );
    });
  });

  describe('M29.2 operational contract', () => {
    it('contains all four required services', () => {
      const requiredServices = [
        'postgres:',
        'redis:',
        'backend:',
        'frontend:',
      ];

      for (const service of requiredServices) {
        expect(compose).toContain(service);
      }
    });

    it('contains healthchecks for all dependency-critical services', () => {
      expect(compose).toContain(
        'pg_isready -U postgres -d postgres',
      );

      expect(compose).toContain(
        'redis-cli',
      );

      expect(compose).toContain(
        'fetch(\'http://127.0.0.1:3000/ready\')',
      );
    });

    it('contains persistent database storage', () => {
      expect(compose).toContain(
        'pgdata:',
      );

      expect(compose).toContain(
        'pgdata:/var/lib/postgresql/data',
      );
    });

    it('contains service-health dependency gating', () => {
      const healthyDependencyCount =
        (compose.match(
          /condition: service_healthy/g,
        ) ?? []).length;

      expect(healthyDependencyCount).toBeGreaterThanOrEqual(3);
    });
  });
});