import type { Pool } from 'pg';

import type {
  AuditEvent,
  AuditEventInput,
  AuditEventListResponse,
  AuditEventQuery,
} from './audit.types.js';

export class AuditService {
  constructor(private readonly pool: Pool) {}

  async record(input: AuditEventInput): Promise<void> {
    await this.pool.query(
      `
        INSERT INTO audit_events (
          tenant_id,
          user_id,
          project_id,
          action,
          resource_type,
          resource_id,
          metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        input.tenantId,
        input.userId ?? null,
        input.projectId ?? null,
        input.action,
        input.resourceType ?? null,
        input.resourceId ?? null,
        JSON.stringify(input.metadata ?? {}),
      ],
    );
  }

async list(
  input: AuditEventQuery,
): Promise<AuditEventListResponse> {
  const conditions = ['tenant_id = $1'];
  const values: unknown[] = [input.tenantId];

  const addFilter = (
    column: string,
    value: string | undefined,
  ): void => {
    if (value === undefined) {
      return;
    }

    values.push(value);
    conditions.push(`${column} = $${values.length}`);
  };

  addFilter('action', input.action);
  addFilter('resource_type', input.resourceType);
  addFilter('resource_id', input.resourceId);
  addFilter('user_id', input.userId);

  values.push(input.limit);
  const limitParam = values.length;

  values.push(input.offset);
  const offsetParam = values.length;

  const result = await this.pool.query<AuditEvent>(
    `
      SELECT
        id,
        tenant_id,
        user_id,
        project_id,
        action,
        resource_type,
        resource_id,
        metadata,
        created_at
      FROM audit_events
      WHERE ${conditions.join(' AND ')}
      ORDER BY created_at DESC, id DESC
      LIMIT $${limitParam}
      OFFSET $${offsetParam}
    `,
    values,
  );

  return {
    items: result.rows,
    pagination: {
      limit: input.limit,
      offset: input.offset,
    },
  };
}

async export(
  input: AuditEventQuery,
): Promise<AuditEventListResponse> {
  return this.list(input);
}

async getById(
  tenantId: string,
  id: string,
): Promise<AuditEvent | null> {
  const result = await this.pool.query<AuditEvent>(
    `
      SELECT
        id,
        tenant_id,
        user_id,
        project_id,
        action,
        resource_type,
        resource_id,
        metadata,
        created_at
      FROM audit_events
      WHERE id = $1
        AND tenant_id = $2
      LIMIT 1
    `,
    [id, tenantId],
  );

  return result.rows[0] ?? null;
}
}
