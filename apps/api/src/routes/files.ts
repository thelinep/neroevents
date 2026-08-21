import type {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
} from 'fastify';
import fs from 'fs-extra';
import path from 'node:path';

interface ListQuery {
  dir?: string;
}

interface FileQuery {
  file?: string;
}



function workspaceRoot(): string {
  return path.resolve(
    process.env.NEVO_WORKSPACE_ROOT || process.cwd(),
  );
}

function tenantRoot(tenantId: string): string {
  return path.resolve(
    workspaceRoot(),
    tenantId,
  );
}

function resolveSafePath(
  relativePath: string,
  root: string,
): string {
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(
    resolvedRoot,
    relativePath,
  );

  if (
    resolved !== resolvedRoot &&
    !resolved.startsWith(`${resolvedRoot}${path.sep}`)
  ) {
    throw new Error('Invalid path');
  }

  return resolved;
}

export default async function filesRoutes(
  fastify: FastifyInstance,
) {
  /**
   * GET /api/files/list?dir=
   */
  fastify.get(
    '/list',
    async (
      request: FastifyRequest<{ Querystring: ListQuery }>,
      reply: FastifyReply,
    ) => {
      try {
       const tenantId = request.tenant?.id;

if (!tenantId) {
  return reply.status(400).send({
    error: 'Tenant selection required',
  });
}

const dir = request.query.dir || '';
const directory = resolveSafePath(
  dir,
  tenantRoot(tenantId),
);
        const stat = await fs.stat(directory);

        if (!stat.isDirectory()) {
          return reply.status(400).send({
            error: 'Path is not a directory',
          });
        }

        const entries = await fs.readdir(directory, {
          withFileTypes: true,
        });

        const items = await Promise.all(
          entries
            .filter(
              (entry) =>
                entry.name !== 'node_modules' &&
                entry.name !== '.git',
            )
            .map(async (entry) => {
              const fullPath = path.join(
                directory,
                entry.name,
              );

              const entryStat = await fs.stat(fullPath);

              return {
                name: entry.name,
                isDirectory: entry.isDirectory(),
                size: entry.isDirectory()
                  ? 0
                  : entryStat.size,
                modified: entryStat.mtime.toISOString(),
              };
            }),
        );

        items.sort((a, b) => {
          if (a.isDirectory !== b.isDirectory) {
            return a.isDirectory ? -1 : 1;
          }

          return a.name.localeCompare(b.name);
        });

        return {
          items,
          currentPath: dir,
        };
      } catch (error) {
        request.log.error(error);

        return reply.status(400).send({
          error:
            error instanceof Error
              ? error.message
              : 'Unable to read directory',
        });
      }
    },
  );

  /**
   * GET /api/files/file?file=
   */
  fastify.get(
    '/file',
    async (
      request: FastifyRequest<{ Querystring: FileQuery }>,
      reply: FastifyReply,
    ) => {
      try {
        const file = request.query.file;

        if (!file) {
          return reply.status(400).send({
            error: 'File path is required',
          });
        }
const tenantId = request.tenant?.id;

if (!tenantId) {
  return reply.status(400).send({
    error: 'Tenant selection required',
  });
}
        const filePath = resolveSafePath(
  file,
  tenantRoot(tenantId),
);
        const stat = await fs.stat(filePath);

        if (!stat.isFile()) {
          return reply.status(400).send({
            error: 'Path is not a file',
          });
        }

        const content = await fs.readFile(
          filePath,
          'utf8',
        );

        return {
          file,
          content,
        };
      } catch (error) {
        request.log.error(error);

        return reply.status(404).send({
          error:
            error instanceof Error
              ? error.message
              : 'Unable to read file',
        });
      }
    },
  );
}