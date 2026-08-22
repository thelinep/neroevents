import {
  existsSync,
  readFileSync,
  statSync,
} from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const CWD = process.cwd();

const PROJECT_ROOT = resolve(CWD, '../..');

const COMPOSE_PATH = resolve(
  PROJECT_ROOT,
  'docker-compose.yml',
);

const BACKUP_SCRIPT = resolve(
  PROJECT_ROOT,
  'infrastructure/scripts/backup-postgres.sh',
);

const RESTORE_SCRIPT = resolve(
  PROJECT_ROOT,
  'infrastructure/scripts/restore-postgres.sh',
);

const BACKUP_README = resolve(
  PROJECT_ROOT,
  'infrastructure/backups/README.md',
);

const GITIGNORE_PATH = resolve(
  PROJECT_ROOT,
  '.gitignore',
);

const API_DOCKERFILE = resolve(
  PROJECT_ROOT,
  'apps/api/Dockerfile',
);

const WEB_DOCKERFILE = resolve(
  PROJECT_ROOT,
  'apps/web/Dockerfile',
);

function readFileIfExists(path: string): string {
  return existsSync(path)
    ? readFileSync(path, 'utf8')
    : '';
}

function section(
  source: string,
  name: string,
): string {
  const marker = `${name}:`;

  const start = source.indexOf(marker);

  if (start === -1) {
    return '';
  }

  const remainder = source.slice(start + marker.length);

  const nextService = remainder.search(
    /\n {2}[a-zA-Z0-9_-]+:\n/,
  );

  return nextService === -1
    ? remainder
    : remainder.slice(0, nextService);
}

function hasExecutableShebang(source: string): boolean {
  return /^#!\/usr\/bin\/env bash/m.test(source);
}

function containsAny(
  source: string,
  patterns: RegExp[],
): boolean {
  return patterns.some((pattern) => pattern.test(source));
}

const compose = readFileIfExists(COMPOSE_PATH);
const backupScript = readFileIfExists(BACKUP_SCRIPT);
const restoreScript = readFileIfExists(RESTORE_SCRIPT);
const backupReadme = readFileIfExists(BACKUP_README);
const gitignore = readFileIfExists(GITIGNORE_PATH);
const apiDockerfile = readFileIfExists(API_DOCKERFILE);
const webDockerfile = readFileIfExists(WEB_DOCKERFILE);

const postgresService = section(
  compose,
  'postgres',
);

const backendService = section(
  compose,
  'backend',
);

describe(
  'M29.8 Production Data, Persistence & Backup/Recovery Hardening',
  () => {
    describe('Production persistence boundary', () => {
      it('defines the required production services', () => {
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

      it('defines persistent PostgreSQL storage', () => {
        expect(compose).toContain(
          'pgdata:',
        );

        expect(postgresService).toContain(
          'pgdata:/var/lib/postgresql/data',
        );
      });

      it('mounts PostgreSQL data at the PostgreSQL data directory', () => {
        expect(postgresService).toContain(
          '/var/lib/postgresql/data',
        );
      });

      it('uses a named Docker volume for PostgreSQL persistence', () => {
        expect(postgresService).toMatch(
          /-\s*pgdata:\/var\/lib\/postgresql\/data/,
        );

        expect(compose).toMatch(
          /\nvolumes:\s*\n\s+pgdata:/,
        );
      });

      it('does not use an anonymous PostgreSQL volume', () => {
        expect(postgresService).not.toMatch(
          /-\s*\/var\/lib\/postgresql\/data\s*$/,
        );
      });

      it('does not use a host-root PostgreSQL filesystem mount', () => {
        expect(postgresService).not.toMatch(
          /-\s*\/(?:Users|home|root|var|etc|mnt|opt)\//,
        );
      });

      it('does not mount the repository into PostgreSQL', () => {
        expect(postgresService).not.toContain(
          '.:/var/lib/postgresql/data',
        );

        expect(postgresService).not.toContain(
          '../:/var/lib/postgresql/data',
        );
      });

      it('does not place database persistence inside the backend container', () => {
        expect(backendService).not.toContain(
          '/var/lib/postgresql/data',
        );

        expect(backendService).not.toContain(
          'pgdata:',
        );
      });

      it('does not place database persistence inside the frontend container', () => {
        const frontendService = section(
          compose,
          'frontend',
        );

        expect(frontendService).not.toContain(
          '/var/lib/postgresql/data',
        );

        expect(frontendService).not.toContain(
          'pgdata:',
        );
      });

      it('does not define PostgreSQL storage as a tmpfs filesystem', () => {
        expect(postgresService).not.toMatch(
          /tmpfs:/i,
        );
      });

      it('does not configure PostgreSQL with a read-only data directory', () => {
        expect(postgresService).not.toMatch(
          /\/var\/lib\/postgresql\/data:ro/,
        );
      });
    });

    describe('Database credential boundary', () => {
      it('keeps DATABASE_URL externally provisioned', () => {
        expect(backendService).toContain(
          'DATABASE_URL: ${DATABASE_URL:?DATABASE_URL must be provided}',
        );
      });

      it('does not embed a PostgreSQL password in DATABASE_URL', () => {
        expect(backendService).not.toMatch(
          /DATABASE_URL:.*postgres(?:ql)?:\/\/[^ \n]*:[^@\s]+@/i,
        );
      });

      it('requires PostgreSQL credentials externally', () => {
        expect(postgresService).toContain(
          'POSTGRES_USER: ${POSTGRES_USER:?POSTGRES_USER must be provided}',
        );

        expect(postgresService).toContain(
          'POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?POSTGRES_PASSWORD must be provided}',
        );
      });

      it('does not hard-code the PostgreSQL password', () => {
        expect(postgresService).not.toMatch(
          /POSTGRES_PASSWORD:\s*(postgres|password|admin|root)\s*$/im,
        );
      });

      it('does not hard-code the PostgreSQL username as the secret boundary', () => {
        expect(postgresService).not.toMatch(
          /POSTGRES_USER:\s*postgres\s*$/im,
        );
      });

      it('keeps the PostgreSQL database name configurable', () => {
        expect(postgresService).toContain(
          'POSTGRES_DB: ${POSTGRES_DB:-postgres}',
        );
      });
    });

    describe('Backup infrastructure', () => {
      it('defines a PostgreSQL backup script', () => {
        expect(existsSync(BACKUP_SCRIPT)).toBe(true);
      });

      it('defines an executable-style backup script', () => {
        expect(hasExecutableShebang(backupScript)).toBe(true);
      });

      it('uses strict shell error handling for backups', () => {
        expect(backupScript).toContain(
          'set -euo pipefail',
        );
      });

      it('uses pg_dump for PostgreSQL backups', () => {
        expect(backupScript).toMatch(
          /\bpg_dump\b/,
        );
      });

      it('uses PostgreSQL custom dump format', () => {
        expect(backupScript).toContain(
          '-Fc',
        );
      });

      it('does not use pg_dumpall as the primary backup mechanism', () => {
        expect(backupScript).not.toMatch(
          /\bpg_dumpall\b/,
        );
      });

      it('reads the PostgreSQL user from the environment', () => {
        expect(backupScript).toContain(
          'POSTGRES_USER',
        );
      });

      it('reads the PostgreSQL database from the environment', () => {
        expect(backupScript).toContain(
          'POSTGRES_DB',
        );
      });

      it('does not hard-code a PostgreSQL password in the backup script', () => {
        expect(backupScript).not.toMatch(
          /postgres(?:ql)?:\/\/[^ \n]*:[^@\s]+@/i,
        );

        expect(backupScript).not.toMatch(
          /POSTGRES_PASSWORD\s*=\s*(postgres|password|admin|root)/i,
        );
      });

      it('does not embed a production database credential in the backup script', () => {
        expect(backupScript).not.toMatch(
          /DATABASE_URL\s*=\s*["'][^"']*:[^"']+@/i,
        );
      });

      it('creates a configurable backup destination', () => {
        expect(backupScript).toContain(
          'BACKUP_DIR',
        );
      });

      it('creates timestamped backup artifacts', () => {
        expect(backupScript).toContain(
          'TIMESTAMP',
        );

        expect(backupScript).toContain(
          '.dump',
        );
      });

      it('streams the PostgreSQL dump out of the database container', () => {
        expect(backupScript).toMatch(
          /docker compose exec -T postgres/,
        );

        expect(backupScript).toMatch(
          /pg_dump[\s\S]*>\s*"\$\{OUTPUT\}"/,
        );
      });

      it('does not write backups into the PostgreSQL data directory', () => {
        expect(backupScript).not.toContain(
          '/var/lib/postgresql/data',
        );
      });

      it('fails when POSTGRES_USER is unavailable', () => {
        expect(backupScript).toContain(
          'POSTGRES_USER:?POSTGRES_USER must be provided',
        );
      });
    });

    describe('Restore infrastructure', () => {
      it('defines a PostgreSQL restore script', () => {
        expect(existsSync(RESTORE_SCRIPT)).toBe(true);
      });

      it('defines an executable-style restore script', () => {
        expect(hasExecutableShebang(restoreScript)).toBe(true);
      });

      it('uses strict shell error handling for restores', () => {
        expect(restoreScript).toContain(
          'set -euo pipefail',
        );
      });

      it('requires an explicit backup artifact', () => {
        expect(restoreScript).toContain(
          'BACKUP_FILE="${1:?Usage: restore-postgres.sh <backup.dump>}"',
        );
      });

      it('validates that the backup file exists', () => {
        expect(restoreScript).toContain(
          'test -f "${BACKUP_FILE}"',
        );
      });

      it('uses pg_restore for custom-format PostgreSQL backups', () => {
        expect(restoreScript).toMatch(
          /\bpg_restore\b/,
        );
      });

      it('reads PostgreSQL credentials from the environment', () => {
        expect(restoreScript).toContain(
          'POSTGRES_USER',
        );

        expect(restoreScript).toContain(
          'POSTGRES_DB',
        );
      });

      it('does not hard-code a PostgreSQL password in the restore script', () => {
        expect(restoreScript).not.toMatch(
          /postgres(?:ql)?:\/\/[^ \n]*:[^@\s]+@/i,
        );

        expect(restoreScript).not.toMatch(
          /POSTGRES_PASSWORD\s*=\s*(postgres|password|admin|root)/i,
        );
      });

      it('supports clean replacement during restore', () => {
        expect(restoreScript).toContain(
          '--clean',
        );

        expect(restoreScript).toContain(
          '--if-exists',
        );
      });

      it('does not require the backend application container for restore', () => {
        expect(restoreScript).not.toMatch(
          /docker compose exec\s+backend/i,
        );
      });

      it('does not require the frontend application container for restore', () => {
        expect(restoreScript).not.toMatch(
          /docker compose exec\s+frontend/i,
        );
      });
    });

    describe('Backup and recovery documentation', () => {
      it('defines backup and recovery documentation', () => {
        expect(existsSync(BACKUP_README)).toBe(true);
      });

      it('documents the PostgreSQL backup procedure', () => {
        expect(backupReadme).toMatch(
          /backup/i,
        );

        expect(backupReadme).toMatch(
          /pg_dump/i,
        );
      });

      it('documents the restore procedure', () => {
        expect(backupReadme).toMatch(
          /restore/i,
        );

        expect(backupReadme).toMatch(
          /pg_restore/i,
        );
      });

      it('documents that production credentials are externally supplied', () => {
        expect(backupReadme).toMatch(
          /credentials/i,
        );

        expect(backupReadme).toMatch(
          /extern/i,
        );
      });

      it('documents that backup artifacts must not be committed', () => {
        expect(backupReadme).toMatch(
          /not be committed|must not be committed|not.*commit/i,
        );
      });

      it('documents the disposable-application / persistent-data principle', () => {
        expect(backupReadme).toMatch(
          /application containers are disposable/i,
        );

        expect(backupReadme).toMatch(
          /PostgreSQL data and backups are not/i,
        );
      });
    });

    describe('Backup artifact isolation', () => {
      it('ignores the backup directory in Git', () => {
        expect(gitignore).toMatch(
          /\/backups\//,
        );
      });

      it('ignores PostgreSQL dump artifacts', () => {
        expect(gitignore).toMatch(
          /(?:\.dump|\.sql)/,
        );
      });

      it('does not store a production backup in infrastructure source', () => {
        const backupDirectory = resolve(
          PROJECT_ROOT,
          'infrastructure/backups',
        );

        if (!existsSync(backupDirectory)) {
          return;
        }

        const entries = readFileIfExists(
          resolve(
            backupDirectory,
            '.gitkeep',
          ),
        );

        expect(entries).not.toMatch(
          /postgres|production/i,
        );
      });

      it('does not include backup artifacts in the API image definition', () => {
        expect(apiDockerfile).not.toMatch(
          /COPY\s+.*(?:backups|\.dump|\.sql)/i,
        );
      });

      it('does not include backup artifacts in the frontend image definition', () => {
        expect(webDockerfile).not.toMatch(
          /COPY\s+.*(?:backups|\.dump|\.sql)/i,
        );
      });
    });

    describe('Database network and lifecycle isolation', () => {
      it('does not publish PostgreSQL to the host', () => {
        expect(postgresService).not.toMatch(
          /ports:\s*[\s\S]*?["']?\d+:5432/,
        );
      });

      it('does not publish Redis to the host', () => {
        const redisService = section(
          compose,
          'redis',
        );

        expect(redisService).not.toMatch(
          /ports:/,
        );
      });

      it('does not use host networking for PostgreSQL', () => {
        expect(postgresService).not.toMatch(
          /network_mode:\s*host/i,
        );
      });

      it('does not use host networking for Redis', () => {
        const redisService = section(
          compose,
          'redis',
        );

        expect(redisService).not.toMatch(
          /network_mode:\s*host/i,
        );
      });

      it('keeps PostgreSQL behind the application network boundary', () => {
        expect(postgresService).toMatch(
          /networks:\s*[\s\S]*internal/,
        );
      });

      it('does not connect PostgreSQL directly to the public edge network', () => {
        expect(postgresService).not.toMatch(
          /networks:\s*[\s\S]*edge/,
        );
      });

      it('does not expose the PostgreSQL Docker socket', () => {
        expect(postgresService).not.toMatch(
          /docker\.sock/,
        );
      });
    });

    describe('Production data safety', () => {
      it('does not store database data in the API image', () => {
        expect(apiDockerfile).not.toMatch(
          /COPY\s+.*(?:postgres|database-data|pgdata)/i,
        );
      });

      it('does not store database data in the frontend image', () => {
        expect(webDockerfile).not.toMatch(
          /COPY\s+.*(?:postgres|database-data|pgdata)/i,
        );
      });

      it('does not embed database dumps in the API image', () => {
        expect(apiDockerfile).not.toMatch(
          /\.(?:dump|sql)\b/i,
        );
      });

      it('does not embed database dumps in the frontend image', () => {
        expect(webDockerfile).not.toMatch(
          /\.(?:dump|sql)\b/i,
        );
      });

      it('does not expose PostgreSQL credentials through backup documentation', () => {
        expect(backupReadme).not.toMatch(
          /postgres(?:ql)?:\/\/[^ \n]*:[^@\s]+@/i,
        );
      });

      it('does not expose PostgreSQL credentials through backup scripts', () => {
        expect(
          `${backupScript}\n${restoreScript}`,
        ).not.toMatch(
          /postgres(?:ql)?:\/\/[^ \n]*:[^@\s]+@/i,
        );
      });

      it('does not contain conventional production passwords in infrastructure files', () => {
        expect(
          `${backupScript}\n${restoreScript}\n${backupReadme}`,
        ).not.toMatch(
          /(?:password|passwd|secret)\s*[:=]\s*(?:postgres|password|admin|root|changeme|change-me)/i,
        );
      });
    });

    describe('M29.8 certification boundary', () => {
      it('contains persistent PostgreSQL storage', () => {
        expect(compose).toContain(
          'pgdata:/var/lib/postgresql/data',
        );
      });

      it('contains external database credential provisioning', () => {
        expect(compose).toContain(
          'DATABASE_URL: ${DATABASE_URL:?DATABASE_URL must be provided}',
        );

        expect(compose).toContain(
          'POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?POSTGRES_PASSWORD must be provided}',
        );
      });

      it('contains a production backup procedure', () => {
        expect(existsSync(BACKUP_SCRIPT)).toBe(true);
        expect(backupScript).toMatch(
          /\bpg_dump\b/,
        );
      });

      it('contains a production restore procedure', () => {
        expect(existsSync(RESTORE_SCRIPT)).toBe(true);
        expect(restoreScript).toMatch(
          /\bpg_restore\b/,
        );
      });

      it('contains backup artifact Git exclusion', () => {
        expect(gitignore).toMatch(
          /\/backups\//,
        );
      });

      it('contains recovery documentation', () => {
        expect(backupReadme).toMatch(
          /backup/i,
        );

        expect(backupReadme).toMatch(
          /restore/i,
        );

        expect(backupReadme).toMatch(
          /recovery/i,
        );
      });

      it('does not require application containers for database recovery', () => {
        expect(restoreScript).not.toMatch(
          /docker compose exec\s+(backend|frontend)/i,
        );
      });

      it('preserves the disposable-application / persistent-database boundary', () => {
        expect(postgresService).toContain(
          'pgdata:/var/lib/postgresql/data',
        );

        expect(apiDockerfile).not.toMatch(
          /COPY\s+.*(?:postgres|pgdata|database-data)/i,
        );

        expect(webDockerfile).not.toMatch(
          /COPY\s+.*(?:postgres|pgdata|database-data)/i,
        );
      });

      it('defines the complete M29.8 operational boundary', () => {
        expect(
          existsSync(COMPOSE_PATH),
        ).toBe(true);

        expect(
          existsSync(BACKUP_SCRIPT),
        ).toBe(true);

        expect(
          existsSync(RESTORE_SCRIPT),
        ).toBe(true);

        expect(
          existsSync(BACKUP_README),
        ).toBe(true);

        expect(
          existsSync(GITIGNORE_PATH),
        ).toBe(true);

        expect(
          compose,
        ).toContain(
          'pgdata:/var/lib/postgresql/data',
        );

        expect(
          backupScript,
        ).toMatch(
          /\bpg_dump\b/,
        );

        expect(
          restoreScript,
        ).toMatch(
          /\bpg_restore\b/,
        );

        expect(
          gitignore,
        ).toMatch(
          /\/backups\//,
        );
      });
    });
  },
);