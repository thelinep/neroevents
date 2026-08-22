import type { FastifyRequest } from 'fastify';

export type AuditOperation =
  | 'audit.read.list'
  | 'audit.read.detail'
  | 'audit.authorization.denied'
  | 'audit.read.error'
  | 'audit.export'
  | 'audit.export.error';

export interface AuditLogContext {
  operation: AuditOperation;
  statusCode: number;
  tenantId?: string;
  eventId?: string;
  durationMs: number;
}

export function logAuditOperation(
  request: FastifyRequest,
  context: AuditLogContext,
): void {
  request.log.info(
    {
      operation: context.operation,
      requestId: request.id,
      ...(context.tenantId !== undefined
        ? {
            tenantId: context.tenantId,
          }
        : {}),
      ...(context.eventId !== undefined
        ? {
            eventId: context.eventId,
          }
        : {}),
      statusCode: context.statusCode,
      durationMs: context.durationMs,
    },
    context.operation,
  );
}