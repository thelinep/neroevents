import type { Pool } from 'pg';

import type { AuditEventInput } from './audit.types.js';

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
}
