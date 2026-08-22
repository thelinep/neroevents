import {
  existsSync,
  readFileSync,
} from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const CWD = process.cwd();
const PROJECT_ROOT = resolve(CWD, '../..');

const COMPOSE_PATH = resolve(
  PROJECT_ROOT,
  'docker-compose.yml',
);

const DR_README = resolve(
  PROJECT_ROOT,
  'infrastructure/disaster-recovery/README.md',
);

const BACKUP_README = resolve(
  PROJECT_ROOT,
  'infrastructure/backups/README.md',
);

const READY_SCRIPT = resolve(
  PROJECT_ROOT,
  'infrastructure/scripts/check-ready.sh',
);

const APP_PATH = resolve(
  PROJECT_ROOT,
  'apps/api/src/app.ts',
);

const AUTH_PLUGIN_PATH = resolve(
  PROJECT_ROOT,
  'apps/api/src/plugins/auth.ts',
);

function read(path: string): string {
  return existsSync(path)
    ? readFileSync(path, 'utf8')
    : '';
}

function serviceSection(
  compose: string,
  service: string,
): string {
  const marker = `  ${service}:`;
  const start = compose.indexOf(marker);

  if (start === -1) {
    return '';
  }

  const remainder = compose.slice(
    start + marker.length,
  );

  const nextService = remainder.search(
    /\n {2}[a-zA-Z0-9_-]+:\n/,
  );

  return nextService === -1
    ? remainder
    : remainder.slice(0, nextService);
}

const compose = read(COMPOSE_PATH);
const app = read(APP_PATH);
const authPlugin = read(AUTH_PLUGIN_PATH);
const drReadme = read(DR_README);
const backupReadme = read(BACKUP_README);
const readyScript = read(READY_SCRIPT);

const postgres = serviceSection(
  compose,
  'postgres',
);

const redis = serviceSection(
  compose,
  'redis',
);

const backend = serviceSection(
  compose,
  'backend',
);

const frontend = serviceSection(
  compose,
  'frontend',
);

describe(
  'M29.9 Production Health, Readiness & Disaster-Recovery Verification',
  () => {
    describe('Liveness contract', () => {
      it('defines GET /health', () => {
        expect(app).toMatch(
          /app\.get\(['"]\/health['"]/,
        );
      });

      it('returns status ok from /health', () => {
        expect(app).toMatch(
          /app\.get\(['"]\/health['"][\s\S]*?status:\s*['"]ok['"]/,
        );
      });

      it('does not query PostgreSQL in the /health handler', () => {
        const healthStart = app.indexOf(
          "app.get('/health'",
        );

        const readyStart = app.indexOf(
          "app.get('/ready'",
        );

        expect(healthStart).toBeGreaterThanOrEqual(0);
        expect(readyStart).toBeGreaterThan(healthStart);

        const healthHandler = app.slice(
          healthStart,
          readyStart,
        );

        expect(healthHandler).not.toContain(
          'pool.query',
        );

        expect(healthHandler).not.toContain(
          'SELECT 1',
        );
      });

      it('keeps /health outside protected API authentication', () => {
        expect(authPlugin).toContain(
          "'/health'",
        );
      });

      it('does not require a Bearer token for /health', () => {
        expect(authPlugin).toMatch(
          /(?:publicPaths|authManagedPaths)\s*=\s*\[[\s\S]*['"]\/health['"]/,
        );
      });

      it('documents /health as liveness', () => {
        expect(drReadme).toMatch(
          /`\/health` is the process liveness endpoint/i,
        );
      });
    });

    describe('Readiness contract', () => {
      it('defines GET /ready', () => {
        expect(app).toMatch(
          /app\.get\(['"]\/ready['"]/,
        );
      });

      it('checks PostgreSQL using SELECT 1', () => {
        const readyStart = app.indexOf(
          "app.get('/ready'",
        );

        expect(readyStart).toBeGreaterThanOrEqual(0);

        const readyHandler = app.slice(
          readyStart,
        );

        expect(readyHandler).toContain(
          "pool.query('SELECT 1')",
        );
      });

      it('returns 200-ready when PostgreSQL is available', () => {
        const readyStart = app.indexOf(
          "app.get('/ready'",
        );

        const readyHandler = app.slice(
          readyStart,
        );

        expect(readyHandler).toMatch(
          /status:\s*['"]ready['"]/,
        );

        expect(readyHandler).toMatch(
          /database:\s*['"]ok['"]/,
        );
      });

      it('returns 503 when PostgreSQL readiness fails', () => {
        const readyStart = app.indexOf(
          "app.get('/ready'",
        );

        const readyHandler = app.slice(
          readyStart,
        );

        expect(readyHandler).toContain(
          'reply.status(503)',
        );

        expect(readyHandler).toMatch(
          /status:\s*['"]not_ready['"]/,
        );

        expect(readyHandler).toMatch(
          /database:\s*['"]unavailable['"]/,
        );
      });

      it('keeps /ready outside protected API authentication', () => {
        expect(authPlugin).toContain(
          "'/ready'",
        );
      });

      it('does not require a Bearer token for /ready', () => {
        expect(authPlugin).toMatch(
          /(?:publicPaths|authManagedPaths)\s*=\s*\[[\s\S]*['"]\/ready['"]/,
        );
      });

      it('does not require Redis directly in the /ready handler', () => {
        const readyStart = app.indexOf(
          "app.get('/ready'",
        );

        const notFoundStart = app.indexOf(
          'app.setNotFoundHandler',
        );

        const readyHandler = app.slice(
          readyStart,
          notFoundStart === -1
            ? undefined
            : notFoundStart,
        );

        expect(readyHandler).not.toContain(
          'redis',
        );

        expect(readyHandler).not.toContain(
          'REDIS_URL',
        );
      });

      it('documents /ready as readiness rather than liveness', () => {
        expect(drReadme).toMatch(
          /`\/ready` is the production readiness endpoint/i,
        );
      });
    });

    describe('PostgreSQL healthcheck', () => {
      it('defines a PostgreSQL healthcheck', () => {
        expect(postgres).toContain(
          'healthcheck:',
        );
      });

      it('uses pg_isready', () => {
        expect(postgres).toContain(
          'pg_isready',
        );
      });

      it('checks the configured PostgreSQL user', () => {
        expect(postgres).toContain(
          '$${POSTGRES_USER}',
        );
      });

      it('checks the configured PostgreSQL database', () => {
        expect(postgres).toContain(
          '$${POSTGRES_DB}',
        );
      });

      it('defines PostgreSQL healthcheck retries', () => {
        expect(postgres).toMatch(
          /retries:\s*\d+/,
        );
      });
    });

    describe('Redis healthcheck', () => {
      it('defines a Redis healthcheck', () => {
        expect(redis).toContain(
          'healthcheck:',
        );
      });

      it('uses redis-cli', () => {
        expect(redis).toContain(
          'redis-cli',
        );
      });

      it('uses Redis PING', () => {
        expect(redis).toContain(
          'ping',
        );
      });

      it('defines Redis healthcheck retries', () => {
        expect(redis).toMatch(
          /retries:\s*\d+/,
        );
      });
    });

    describe('Backend readiness healthcheck', () => {
      it('defines a backend healthcheck', () => {
        expect(backend).toContain(
          'healthcheck:',
        );
      });

      it('uses /ready as the backend health signal', () => {
        expect(backend).toContain(
          '/ready',
        );
      });

      it('checks the backend locally on port 3000', () => {
        expect(backend).toContain(
          '127.0.0.1:3000',
        );
      });

      it('fails the container healthcheck when /ready fails', () => {
        expect(backend).toMatch(
          /process\.exit\(r\.ok \? 0 : 1\)/,
        );
      });

      it('allows sufficient backend healthcheck retries', () => {
        expect(backend).toMatch(
          /retries:\s*(?:1[0-9]|20|[2-9][0-9])/,
        );
      });
    });

    describe('Dependency startup ordering', () => {
      it('requires PostgreSQL health before backend startup', () => {
        expect(backend).toMatch(
          /postgres:[\s\S]*condition:\s*service_healthy/,
        );
      });

      it('requires Redis health before backend startup', () => {
        expect(backend).toMatch(
          /redis:[\s\S]*condition:\s*service_healthy/,
        );
      });

      it('requires backend health before frontend startup', () => {
        expect(frontend).toMatch(
          /backend:[\s\S]*condition:\s*service_healthy/,
        );
      });

      it('does not make frontend depend directly on PostgreSQL', () => {
        expect(frontend).not.toContain(
          'postgres:',
        );
      });

      it('does not make frontend depend directly on Redis', () => {
        expect(frontend).not.toContain(
          'redis:',
        );
      });
    });

    describe('Readiness helper', () => {
      it('defines the readiness helper', () => {
        expect(
          existsSync(READY_SCRIPT),
        ).toBe(true);
      });

      it('uses strict shell error handling', () => {
        expect(readyScript).toContain(
          'set -eu',
        );
      });

      it('defaults to the real /ready URL', () => {
        expect(readyScript).toContain(
          'url="${1:-http://localhost:3000/ready}"',
        );
      });

      it('uses curl for readiness verification', () => {
        expect(readyScript).toContain(
          'curl -fsS',
        );
      });

      it('supports configurable retry count', () => {
        expect(readyScript).toContain(
          'TRIES',
        );
      });

      it('fails after readiness retries are exhausted', () => {
        expect(readyScript).toContain(
          'exit 1',
        );
      });

      it('does not contain Markdown URL syntax', () => {
        expect(readyScript).not.toMatch(
          /\[[^\]]+\]\([^)]+\)/,
        );
      });
    });

    describe('Disaster recovery documentation', () => {
      it('defines the DR document', () => {
        expect(
          existsSync(DR_README),
        ).toBe(true);
      });

      it('documents PostgreSQL recovery', () => {
        expect(drReadme).toMatch(
          /PostgreSQL/i,
        );

        expect(drReadme).toMatch(
          /restore/i,
        );
      });

      it('documents backup recovery', () => {
        expect(drReadme).toMatch(
          /backup/i,
        );

        expect(backupReadme).toMatch(
          /pg_dump/i,
        );
      });

      it('documents readiness verification after recovery', () => {
        expect(drReadme).toContain(
          'Verify backend `/ready`.',
        );
      });

      it('documents liveness verification after recovery', () => {
        expect(drReadme).toContain(
          'Verify backend `/health`.',
        );
      });

      it('documents authentication verification', () => {
        expect(drReadme).toMatch(
          /authenticate/i,
        );
      });

      it('documents tenant verification', () => {
        expect(drReadme).toMatch(
          /tenant/i,
        );
      });

      it('documents representative application data verification', () => {
        expect(drReadme).toMatch(
          /representative application data/i,
        );
      });

      it('documents audit verification', () => {
        expect(drReadme).toMatch(
          /audit/i,
        );
      });

      it('documents RTO and RPO', () => {
        expect(drReadme).toContain(
          'RTO',
        );

        expect(drReadme).toContain(
          'RPO',
        );
      });
    });

    describe('M29.9 certification boundary', () => {
      it('contains a lightweight liveness contract', () => {
        expect(app).toMatch(
          /app\.get\(['"]\/health['"][\s\S]*?status:\s*['"]ok['"]/,
        );
      });

      it('contains dependency-backed readiness', () => {
        expect(app).toMatch(
          /app\.get\(['"]\/ready['"][\s\S]*?SELECT 1/,
        );
      });

      it('contains explicit readiness failure status', () => {
        expect(app).toMatch(
          /\/ready[\s\S]*reply\.status\(503\)/,
        );
      });

      it('contains PostgreSQL health monitoring', () => {
        expect(postgres).toContain(
          'pg_isready',
        );
      });

      it('contains Redis health monitoring', () => {
        expect(redis).toContain(
          'redis-cli',
        );
      });

      it('contains backend readiness monitoring', () => {
        expect(backend).toContain(
          '/ready',
        );
      });

      it('contains dependency health gating', () => {
        expect(backend).toMatch(
          /postgres:[\s\S]*service_healthy/,
        );

        expect(backend).toMatch(
          /redis:[\s\S]*service_healthy/,
        );

        expect(frontend).toMatch(
          /backend:[\s\S]*service_healthy/,
        );
      });

      it('preserves M29.8 backup/recovery infrastructure', () => {
        expect(
          existsSync(BACKUP_README),
        ).toBe(true);

        expect(backupReadme).toContain(
          'pg_dump',
        );

        expect(backupReadme).toContain(
          'pg_restore',
        );
      });

      it('defines DR verification documentation', () => {
        expect(drReadme).toContain(
          '/health',
        );

        expect(drReadme).toContain(
          '/ready',
        );

        expect(drReadme).toContain(
          'RTO',
        );

        expect(drReadme).toContain(
          'RPO',
        );
      });

      it('does not expose health endpoints behind API authentication', () => {
        expect(authPlugin).toContain(
          "'/health'",
        );

        expect(authPlugin).toContain(
          "'/ready'",
        );
      });

      it('defines the complete M29.9 operational boundary', () => {
        expect(
          existsSync(COMPOSE_PATH),
        ).toBe(true);

        expect(
          existsSync(DR_README),
        ).toBe(true);

        expect(
          existsSync(READY_SCRIPT),
        ).toBe(true);

        expect(
          app,
        ).toContain(
          "app.get('/health'",
        );

        expect(
          app,
        ).toContain(
          "app.get('/ready'",
        );

        expect(
          postgres,
        ).toContain(
          'pg_isready',
        );

        expect(
          redis,
        ).toContain(
          'redis-cli',
        );

        expect(
          backend,
        ).toContain(
          '/ready',
        );

        expect(
          frontend,
        ).toContain(
          'service_healthy',
        );
      });
    });
  },
);
