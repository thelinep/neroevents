import { describe, expect, it, vi } from 'vitest';

import { AuditService } from '../../src/audit/audit.service.js';

describe('M26.5 audit service', () => {
  it('records an audit event with tenant scope', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });

    const service = new AuditService({
      query,
    } as never);

    await service.record({
      tenantId: 'tenant-a',
      userId: 'user-a',
      projectId: 'project-a',
      action: 'project:create',
      resourceType: 'project',
      resourceId: 'project-a',
      metadata: {
        source: 'test',
      },
    });

    expect(query).toHaveBeenCalledTimes(1);

    const [sql, values] = query.mock.calls[0];

    expect(sql).toContain('INSERT INTO audit_events');
    expect(sql).toContain('tenant_id');

    expect(values).toEqual([
      'tenant-a',
      'user-a',
      'project-a',
      'project:create',
      'project',
      'project-a',
      JSON.stringify({
        source: 'test',
      }),
    ]);
  });
});
