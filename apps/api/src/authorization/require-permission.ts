import type { FastifyReply, FastifyRequest } from 'fastify';

import {
  hasPermission,
  type Permission,
} from './permissions.js';

export function requirePermission(
  request: FastifyRequest,
  reply: FastifyReply,
  permission: Permission,
): boolean {
  const role = request.tenant?.role;

  if (!role) {
    reply.status(403).send({
      error: 'Tenant membership required',
    });

    return false;
  }

  if (!hasPermission(role, permission)) {
    reply.status(403).send({
      error: 'Forbidden',
    });

    return false;
  }

  return true;
}
