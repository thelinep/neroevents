import type {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
} from 'fastify';

import { AuditService } from '../audit/audit.service.js';
import { pool } from '../db/client.js';
import { requirePermission } from '../authorization/require-permission.js';
import type { AuditEventQuery } from '../audit/audit.types.js';
import {
  logAuditOperation,
} from '../audit/audit.observability.js';

interface AuditQuerystring {
  limit?: number;
  offset?: number;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  userId?: string;
}

interface AuditParams {
  id: string;
}

const AUDIT_QUERY_KEYS = new Set([
  'limit',
  'offset',
  'action',
  'resourceType',
  'resourceId',
  'userId',
]);

const startedAt = performance.now();

function validateAuditQueryKeys(url: string): string | null {
  const queryIndex = url.indexOf('?');

  if (queryIndex === -1) {
    return null;
  }

  const searchParams = new URLSearchParams(
    url.slice(queryIndex + 1),
  );

  for (const key of searchParams.keys()) {
    if (!AUDIT_QUERY_KEYS.has(key)) {
      return `Unknown query parameter: ${key}`;
    }
  }

  return null;
}

export default async function auditRoutes(
  app: FastifyInstance,
): Promise<void> {
  const auditService = new AuditService(pool);

  const startedAt = performance.now();

  app.get<{
  Params: AuditParams;
}>(
  '/:id',
  {
    schema: {
      params: {
        type: 'object',
        additionalProperties: false,
        required: ['id'],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
          },
        },
      },

      response: {
        200: {
          type: 'object',
          additionalProperties: false,
          required: [
            'id',
            'tenant_id',
            'user_id',
            'project_id',
            'action',
            'resource_type',
            'resource_id',
            'metadata',
            'created_at',
          ],
          properties: {
            id: { type: 'string', format: 'uuid' },
            tenant_id: { type: 'string', format: 'uuid' },
            user_id: { type: ['string', 'null'], format: 'uuid' },
            project_id: { type: ['string', 'null'], format: 'uuid' },
            action: { type: 'string' },
            resource_type: { type: ['string', 'null'] },
            resource_id: { type: ['string', 'null'] },
            metadata: { type: 'object', additionalProperties: true },
            created_at: { type: 'string' },
          },
        },
      },
    },
  },
  async (
    req: FastifyRequest<{
      Params: AuditParams;
    }>,
    reply: FastifyReply,
  ) => {
if (!requirePermission(req, reply, 'audit:read')) {
  logAuditOperation(req, {
    operation: 'audit.authorization.denied',
    tenantId: req.tenant?.id,
    statusCode: 403,
    durationMs: performance.now() - startedAt,
  });

  return;
}




    const event = await auditService.getById(
      req.tenant!.id,
      req.params.id,
    );

    try{


  if (!event) {
  logAuditOperation(req, {
    operation: 'audit.read.detail',
    tenantId: req.tenant!.id,
    eventId: req.params.id,
    statusCode: 404,
    durationMs: performance.now() - startedAt,
  });

  return reply.status(404).send({
    error: 'Audit event not found',
  });
}

    logAuditOperation(req, {
  operation: 'audit.read.detail',
  tenantId: req.tenant!.id,
  eventId: req.params.id,
  statusCode: 200,
  durationMs: performance.now() - startedAt,
});

return reply.status(200).send(event);

    }catch (error) {
     logAuditOperation(req, {
  operation: 'audit.read.error',
  tenantId: req.tenant?.id,
  eventId: req.params.id,
  statusCode: 500,
  durationMs: performance.now() - startedAt,
});
      return reply.status(500).send({
        error: 'Failed to fetch audit event',
      });
    }

  },
);



  app.get<{
    Querystring: AuditQuerystring;
  }>(
    '/',
    {
      schema: {
        querystring: {
          type: 'object',
          additionalProperties: false,
          properties: {
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
            },
            offset: {
              type: 'integer',
              minimum: 0,
            },
            action: {
              type: 'string',
              minLength: 1,
            },
            resourceType: {
              type: 'string',
              minLength: 1,
            },
            resourceId: {
              type: 'string',
              minLength: 1,
            },
            userId: {
              type: 'string',
              minLength: 1,
            },
          },
        },

        response: {
          200: {
            type: 'object',
            additionalProperties: false,
            required: ['items', 'pagination'],
            properties: {
              items: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  required: [
                    'id',
                    'tenant_id',
                    'user_id',
                    'project_id',
                    'action',
                    'resource_type',
                    'resource_id',
                    'metadata',
                    'created_at',
                  ],
                  properties: {
                    id: {
                      type: 'string',
                    },
                    tenant_id: {
                      type: 'string',
                    },
                    user_id: {
                      type: ['string', 'null'],
                    },
                    project_id: {
                      type: ['string', 'null'],
                    },
                    action: {
                      type: 'string',
                    },
                    resource_type: {
                      type: ['string', 'null'],
                    },
                    resource_id: {
                      type: ['string', 'null'],
                    },
                    metadata: {
                      type: 'object',
                        additionalProperties: true,
                    },
                    created_at: {
                      type: 'string',
                    },
                  },
                },
              },
              pagination: {
                type: 'object',
                additionalProperties: false,
                required: ['limit', 'offset'],
                properties: {
                  limit: {
                    type: 'integer',
                    minimum: 1,
                    maximum: 100,
                  },
                  offset: {
                    type: 'integer',
                    minimum: 0,
                  },
                },
              },
            },
          },
        },
      },
    },
async (
  req: FastifyRequest<{
    Querystring: AuditQuerystring;
  }>,
  reply: FastifyReply,
) => {
  const queryError = validateAuditQueryKeys(req.url);

  if (queryError) {
    return reply.status(400).send({
      error: queryError,
    });
  }

if (!requirePermission(req, reply, 'audit:read')) {
  logAuditOperation(req, {
    operation: 'audit.authorization.denied',
    tenantId: req.tenant?.id,
    statusCode: 403,
    durationMs: performance.now() - startedAt,
  });

  return;
}

  const query = req.query;

  const input: AuditEventQuery = {
    tenantId: req.tenant!.id,
    limit: query.limit ?? 50,
    offset: query.offset ?? 0,
    action: query.action,
    resourceType: query.resourceType,
    resourceId: query.resourceId,
    userId: query.userId,
  };

  try {
    const events = await auditService.list(input);
    logAuditOperation(req, {
  operation: 'audit.read.list',
  tenantId: req.tenant!.id,
  statusCode: 200,
  durationMs: performance.now() - startedAt,
});
    return reply.status(200).send(events);
  } catch (error) {
  logAuditOperation(req, {
    operation: 'audit.read.error',
    tenantId: req.tenant?.id,
    statusCode: 500,
    durationMs: performance.now() - startedAt,
  });

  req.log.error(
    {
      operation: 'audit.read.error',
      requestId: req.id,
      tenantId: req.tenant?.id,
    },
    'Failed to fetch audit events',
  );

  return reply.status(500).send({
    error: 'Failed to fetch audit events',
  });
  }
},)

app.get<{
  Querystring: AuditQuerystring;
}>(
  '/export',
  {
    schema: {
      querystring: {
        type: 'object',
        additionalProperties: false,
        properties: {
          limit: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
          },
          offset: {
            type: 'integer',
            minimum: 0,
          },
          action: {
            type: 'string',
            minLength: 1,
          },
          resourceType: {
            type: 'string',
            minLength: 1,
          },
          resourceId: {
            type: 'string',
            minLength: 1,
          },
          userId: {
            type: 'string',
            minLength: 1,
          },
        },
      },
    },
  },
  async (
    req: FastifyRequest<{
      Querystring: AuditQuerystring;
    }>,
    reply: FastifyReply,
  ) => {
    const queryError = validateAuditQueryKeys(req.url);

    if (queryError) {
      return reply.status(400).send({
        error: queryError,
      });
    }

    if (!requirePermission(req, reply, 'audit:export')) {
      return;
    }

    const query = req.query;

    const input: AuditEventQuery = {
      tenantId: req.tenant!.id,
      limit: query.limit ?? 50,
      offset: query.offset ?? 0,
      action: query.action,
      resourceType: query.resourceType,
      resourceId: query.resourceId,
      userId: query.userId,
    };

    try {
      const events = await auditService.export(input);

      logAuditOperation(req, {
        operation: 'audit.export',
        tenantId: req.tenant!.id,
        statusCode: 200,
        durationMs: performance.now() - startedAt,
      });

      return reply.status(200).send(events);
    } catch (error) {
      logAuditOperation(req, {
        operation: 'audit.export.error',
        tenantId: req.tenant?.id,
        statusCode: 500,
        durationMs: performance.now() - startedAt,
      });

      req.log.error(error, 'Failed to export audit events');

      return reply.status(500).send({
        error: 'Failed to export audit events',
      });
    }
  },
);
}