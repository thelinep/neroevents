import type {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
} from 'fastify';

import { AuditService } from '../audit/audit.service.js';
import { pool } from '../db/client.js';
import {
  requirePermission,
} from '../authorization/require-permission.js';
import type {
  AuditEventQuery,
} from '../audit/audit.types.js';

interface AuditRouteQuery {
  limit?: string;
  offset?: string;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  userId?: string;
  tenantId?: string;
}

export default function auditRoutes(
  app: FastifyInstance,
) {
  const auditService = new AuditService(pool);

  app.get(
    '/',
    async (
      req: FastifyRequest,
      reply: FastifyReply,
    ) => {
      if (
        !requirePermission(
          req,
          reply,
          'audit:read',
        )
      ) {
        return;
      }

      const query =
        req.query as AuditRouteQuery;

      const auditQuery: AuditEventQuery = {
        tenantId: req.tenant!.id,
        limit:
          query.limit === undefined
            ? undefined
            : Number(query.limit),
        offset:
          query.offset === undefined
            ? undefined
            : Number(query.offset),
        action: query.action,
        resourceType: query.resourceType,
        resourceId: query.resourceId,
        userId: query.userId,
      };

      try {
        const events =
          await auditService.list(auditQuery);

        return reply
          .status(200)
          .send(events);
      } catch (error) {
        req.log.error(error);

        return reply.status(500).send({
          error: 'Failed to fetch audit events',
        });
      }
    },
  );
}