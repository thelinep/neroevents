import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
} from 'vitest';

import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';





const PROJECT_ROOT = resolve(process.cwd(), '../..');

const COMPOSE_PATH = resolve(
  PROJECT_ROOT,
  'docker-compose.yml',
);

const BACKEND_DOCKERFILE = resolve(
  PROJECT_ROOT,
  'apps/api/Dockerfile',
);

const FRONTEND_DOCKERFILE = resolve(
  PROJECT_ROOT,
  'apps/web/Dockerfile',
);

const DOCKERIGNORE_PATH = resolve(
  PROJECT_ROOT,
  '.dockerignore',
);

let compose: string;
let backendDockerfile: string;
let frontendDockerfile: string;
let dockerignore: string;

console.log({
  cwd: process.cwd(),
  PROJECT_ROOT,
  COMPOSE_PATH,
  BACKEND_DOCKERFILE,
  FRONTEND_DOCKERFILE,
  composeExists: existsSync(COMPOSE_PATH),
  backendDockerfileExists: existsSync(BACKEND_DOCKERFILE),
  frontendDockerfileExists: existsSync(FRONTEND_DOCKERFILE),
});

beforeAll(async () => {
  expect(existsSync(COMPOSE_PATH)).toBe(true);
  expect(existsSync(BACKEND_DOCKERFILE)).toBe(true);
  expect(existsSync(FRONTEND_DOCKERFILE)).toBe(true);

  compose = await readFile(
    COMPOSE_PATH,
    'utf8',
  );

  backendDockerfile = await readFile(
    BACKEND_DOCKERFILE,
    'utf8',
  );

  frontendDockerfile = await readFile(
    FRONTEND_DOCKERFILE,
    'utf8',
  );

  dockerignore = existsSync(DOCKERIGNORE_PATH)
    ? await readFile(
        DOCKERIGNORE_PATH,
        'utf8',
      )
    : '';
});

afterAll(async () => {
  // This suite performs static security
  // certification only. No containers are
  // created or modified.
});

function section(
  source: string,
  serviceName: string,
): string {
  const servicePattern = new RegExp(
    `^  ${serviceName}:\\s*$`,
    'm',
  );

  const match = servicePattern.exec(source);

  if (!match) {
    return '';
  }

  const start = match.index;

  const nextService = source.slice(start + match[0].length).search(
    /^  [a-zA-Z0-9_-]+:\s*$/m,
  );

  if (nextService === -1) {
    return source.slice(start);
  }

  return source.slice(
    start,
    start + match[0].length + nextService,
  );
}

function hasLine(
  source: string,
  expression: RegExp,
): boolean {
  return expression.test(source);
}

function dockerignoreContains(
  entry: string,
): boolean {
  return dockerignore
    .split(/\r?\n/)
    .map((line) => line.trim())
    .some(
      (line) =>
        line === entry ||
        line === `/${entry}`,
    );
}

describe(
  'M29.5 Production Runtime Security & Least Privilege',
  () => {
    describe('Production Compose security baseline', () => {
      it('defines the required production services', () => {
        expect(compose).toMatch(
          /^\s*postgres:\s*$/m,
        );

        expect(compose).toMatch(
          /^\s*redis:\s*$/m,
        );

        expect(compose).toMatch(
          /^\s*backend:\s*$/m,
        );

        expect(compose).toMatch(
          /^\s*frontend:\s*$/m,
        );
      });

      it('does not enable privileged mode', () => {
        expect(compose).not.toMatch(
          /^\s*privileged:\s*true\s*$/im,
        );
      });

      it('does not configure host PID namespace', () => {
        expect(compose).not.toMatch(
          /^\s*pid:\s*host\s*$/im,
        );
      });

      it('does not configure host IPC namespace', () => {
        expect(compose).not.toMatch(
          /^\s*ipc:\s*host\s*$/im,
        );
      });

      it('does not configure host networking', () => {
        expect(compose).not.toMatch(
          /^\s*network_mode:\s*host\s*$/im,
        );
      });

      it('does not expose the Docker socket', () => {
        expect(compose).not.toContain(
          '/var/run/docker.sock',
        );
      });
    });

    describe('Backend runtime boundary', () => {
      it('uses the API Dockerfile', () => {
        const backend = section(
          compose,
          'backend',
        );

        expect(backend).toContain(
          'dockerfile: apps/api/Dockerfile',
        );
      });

      it('does not explicitly configure the backend as root', () => {
        const backend = section(
          compose,
          'backend',
        );

        expect(backend).not.toMatch(
          /^\s*user:\s*(root|0)\s*$/im,
        );
      });

      it('does not grant backend capabilities', () => {
        const backend = section(
          compose,
          'backend',
        );

        expect(backend).not.toMatch(
          /^\s*cap_add:/im,
        );
      });

      it('does not configure backend device mappings', () => {
        const backend = section(
          compose,
          'backend',
        );

        expect(backend).not.toMatch(
          /^\s*devices:/im,
        );
      });

      it('does not mount the host root filesystem', () => {
        const backend = section(
          compose,
          'backend',
        );

        expect(backend).not.toMatch(
  /^\s+-\s+\/:\/(?:[^:\n]+)$/m,
);

expect(backend).not.toMatch(
  /\/var\/run\/docker\.sock/,
);

expect(backend).not.toMatch(
  /\/proc:\/proc/,
);

expect(backend).not.toMatch(
  /\/sys:\/sys/,
);
      });

      it('does not mount the Docker socket', () => {
        const backend = section(
          compose,
          'backend',
        );

        expect(backend).not.toContain(
          '/var/run/docker.sock',
        );
      });
    });

    describe('Frontend runtime boundary', () => {
      it('uses the web Dockerfile', () => {
        const frontend = section(
          compose,
          'frontend',
        );

        expect(frontend).toContain(
          'dockerfile: apps/web/Dockerfile',
        );
      });

      it('does not explicitly configure the frontend as root', () => {
        const frontend = section(
          compose,
          'frontend',
        );

        expect(frontend).not.toMatch(
          /^\s*user:\s*(root|0)\s*$/im,
        );
      });

      it('does not grant frontend capabilities', () => {
        const frontend = section(
          compose,
          'frontend',
        );

        expect(frontend).not.toMatch(
          /^\s*cap_add:/im,
        );
      });

      it('does not configure frontend device mappings', () => {
        const frontend = section(
          compose,
          'frontend',
        );

        expect(frontend).not.toMatch(
          /^\s*devices:/im,
        );
      });

      it('does not mount the Docker socket', () => {
        const frontend = section(
          compose,
          'frontend',
        );

        expect(frontend).not.toContain(
          '/var/run/docker.sock',
        );
      });
    });

    describe('Privilege escalation controls', () => {
      it('does not configure privileged containers anywhere', () => {
        expect(compose).not.toMatch(
          /^\s*privileged:\s*true\s*$/im,
        );
      });

      it('does not disable seccomp', () => {
        expect(compose).not.toContain(
          'seccomp=unconfined',
        );
      });

      it('does not disable AppArmor', () => {
        expect(compose).not.toContain(
          'apparmor=unconfined',
        );
      });

      it('does not add unrestricted Linux capabilities', () => {
        expect(compose).not.toMatch(
          /^\s*cap_add:\s*$/im,
        );
      });
    });

    describe('Filesystem isolation', () => {
      it('does not mount host root into the backend', () => {
        const backend = section(
          compose,
          'backend',
        );

        expect(backend).not.toMatch(
          /(^|\s)\/:\S*/m,
        );
      });

      it('does not mount host root into the frontend', () => {
        const frontend = section(
          compose,
          'frontend',
        );

        expect(frontend).not.toMatch(
          /(^|\s)\/:\S*/m,
        );
      });

      it('does not expose Docker runtime state', () => {
        expect(compose).not.toContain(
          '/var/lib/docker',
        );

        expect(compose).not.toContain(
          '/var/run/docker.sock',
        );
      });
    });

    describe('Secret isolation', () => {
      it('excludes .env from the Docker build context', () => {
        expect(
          dockerignoreContains('.env'),
        ).toBe(true);
      });

      it('excludes environment variants from the Docker build context', () => {
        expect(
          dockerignoreContains('.env.*'),
        ).toBe(true);
      });

      it('does not embed JWT_SECRET in the backend image definition', () => {
        expect(
          backendDockerfile,
        ).not.toMatch(
          /^\s*(ARG|ENV)\s+JWT_SECRET\s*=\s*[^$]/im,
        );
      });

      it('does not embed session secrets in the backend image definition', () => {
        expect(
          backendDockerfile,
        ).not.toMatch(
          /^\s*(ARG|ENV)\s+(SESSION_SECRET|AUTH_SECRET)\s*=\s*[^$]/im,
        );
      });

      it('does not embed database passwords in the backend image definition', () => {
        expect(
          backendDockerfile,
        ).not.toMatch(
          /^\s*(ARG|ENV)\s+\w*PASSWORD\w*\s*=\s*[^$]/im,
        );
      });

      it('does not embed JWT secrets in the frontend image definition', () => {
        expect(
          frontendDockerfile,
        ).not.toMatch(
          /^\s*(ARG|ENV)\s+JWT_SECRET\s*=\s*[^$]/im,
        );
      });
    });

    describe('Production image boundary', () => {
      it('does not run the backend with a development watcher', () => {
        expect(
          backendDockerfile,
        ).not.toMatch(
          /\b(tsx\s+watch|nodemon|npm\s+run\s+dev|pnpm\s+dev)\b/i,
        );
      });

      it('does not run the frontend with a development server', () => {
        expect(
          frontendDockerfile,
        ).not.toMatch(
          /\b(npm\s+run\s+dev|pnpm\s+dev|next\s+dev|vite)\b/i,
        );
      });

      it('does not use npm install in the backend runtime stage', () => {
        const runtimeStage =
          backendDockerfile.split(
            /^FROM\s+/im,
          ).slice(-1)[0] ?? '';

        expect(runtimeStage).not.toMatch(
          /\bnpm\s+install\b/i,
        );
      });

      it('does not use pnpm install in the backend runtime stage', () => {
        const runtimeStage =
          backendDockerfile.split(
            /^FROM\s+/im,
          ).slice(-1)[0] ?? '';

        expect(runtimeStage).not.toMatch(
          /\bpnpm\s+install\b/i,
        );
      });
    });

    describe('Database and Redis isolation', () => {
      it('does not publish PostgreSQL port to the host', () => {
        const postgres = section(
          compose,
          'postgres',
        );

        expect(postgres).not.toMatch(
          /^\s*-\s*["']?5432:5432["']?\s*$/m,
        );
      });

      it('does not publish Redis port to the host', () => {
        const redis = section(
          compose,
          'redis',
        );

        expect(redis).not.toMatch(
          /^\s*-\s*["']?6379:6379["']?\s*$/m,
        );
      });

      it('does not use host networking for PostgreSQL', () => {
        const postgres = section(
          compose,
          'postgres',
        );

        expect(postgres).not.toContain(
          'network_mode: host',
        );
      });

      it('does not use host networking for Redis', () => {
        const redis = section(
          compose,
          'redis',
        );

        expect(redis).not.toContain(
          'network_mode: host',
        );
      });
    });

    describe('M29.5 certification boundary', () => {
      it('contains no privileged application service', () => {
        expect(compose).not.toMatch(
          /^\s*privileged:\s*true\s*$/im,
        );
      });

      it('contains no host namespace sharing', () => {
        expect(compose).not.toMatch(
          /^\s*(pid|ipc|network_mode):\s*host\s*$/im,
        );
      });

      it('contains no Docker socket exposure', () => {
        expect(compose).not.toContain(
          '/var/run/docker.sock',
        );
      });

      it('contains no host root filesystem exposure', () => {
        expect(compose).not.toMatch(
          /^\s*-\s*\/:\s*\/.*$/m,
        );
      });

      it('contains no development server in production images', () => {
        expect(
          backendDockerfile,
        ).not.toMatch(
          /\b(tsx\s+watch|nodemon|npm\s+run\s+dev|pnpm\s+dev)\b/i,
        );

        expect(
          frontendDockerfile,
        ).not.toMatch(
          /\b(npm\s+run\s+dev|pnpm\s+dev|next\s+dev|vite)\b/i,
        );
      });

      it('contains no embedded application secrets', () => {
        const source = [
          backendDockerfile,
          frontendDockerfile,
        ].join('\n');

        expect(source).not.toMatch(
          /^\s*(ARG|ENV)\s+(JWT_SECRET|SESSION_SECRET|AUTH_SECRET)\s*=\s*[^$]/im,
        );
      });

      it('preserves the production build boundary established by M29.4', () => {
        expect(
          backendDockerfile,
        ).toMatch(
          /^FROM\s+/im,
        );

        expect(
          frontendDockerfile,
        ).toMatch(
          /^FROM\s+/im,
        );
      });
    });
  },
);