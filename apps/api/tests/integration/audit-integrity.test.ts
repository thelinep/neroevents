import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
} from 'vitest';

import type { FastifyInstance } from 'fastify';

import { buildApp } from '../../src/app.js';
import { pool } from '../../src/db/client.js';

describe('M27.1 audit event integrity', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('allows audit event insertion', async () => {
    const result = await pool.query<{
      id: string;
      tenant_id: string;
      action: string;
    }>(
      `
        INSERT INTO audit_events (
          tenant_id,
          action,
          resource_type,
          resource_id,
          metadata
        )
        SELECT
          id,
          'm27.1:test',
          'integrity-test',
          gen_random_uuid()::text,
          '{}'::jsonb
        FROM tenants
        LIMIT 1
        RETURNING id, tenant_id, action
      `,
    );

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].action).toBe('m27.1:test');
  });

  it('rejects audit event updates', async () => {
    const created = await pool.query<{ id: string }>(
      `
        INSERT INTO audit_events (
          tenant_id,
          action,
          resource_type,
          metadata
        )
        SELECT
          id,
          'm27.1:update-test',
          'integrity-test',
          '{}'::jsonb
        FROM tenants
        LIMIT 1
        RETURNING id
      `,
    );

    const id = created.rows[0].id;

    await expect(
      pool.query(
        `
          UPDATE audit_events
          SET action = 'm27.1:mutated'
          WHERE id = $1
        `,
        [id],
      ),
    ).rejects.toMatchObject({
      code: '42501',
    });

    const unchanged = await pool.query<{
      action: string;
    }>(
      `
        SELECT action
        FROM audit_events
        WHERE id = $1
      `,
      [id],
    );

    expect(unchanged.rows[0].action).toBe(
      'm27.1:update-test',
    );
  });

  it('rejects audit event deletion', async () => {
    const created = await pool.query<{ id: string }>(
      `
        INSERT INTO audit_events (
          tenant_id,
          action,
          resource_type,
          metadata
        )
        SELECT
          id,
          'm27.1:delete-test',
          'integrity-test',
          '{}'::jsonb
        FROM tenants
        LIMIT 1
        RETURNING id
      `,
    );

    const id = created.rows[0].id;

    await expect(
      pool.query(
        `
          DELETE FROM audit_events
          WHERE id = $1
        `,
        [id],
      ),
    ).rejects.toMatchObject({
      code: '42501',
    });

    const preserved = await pool.query(
      `
        SELECT id
        FROM audit_events
        WHERE id = $1
      `,
      [id],
    );

    expect(preserved.rows).toHaveLength(1);
  });

  it('keeps the project reference after project deletion', async () => {
    const created = await pool.query<{
      id: string;
      tenant_id: string;
    }>(
      `
        SELECT id, tenant_id
        FROM projects
        LIMIT 1
      `,
    );

    if (created.rows.length === 0) {
      return;
    }

    const project = created.rows[0];

   const audit = await pool.query<{
  id: string;
}>(
  `
    INSERT INTO audit_events (
      tenant_id,
      project_id,
      action,
      resource_type,
      resource_id,
      metadata
    )
    VALUES (
      $1::uuid,
      $2::uuid,
      'm27.1:project-delete',
      'project',
      $2::text,
      '{}'::jsonb
    )
    RETURNING id
  `,
  [project.tenant_id, project.id],
);

    await pool.query(
      `
        DELETE FROM projects
        WHERE id = $1
      `,
      [project.id],
    );

    const preserved = await pool.query<{
      project_id: string;
    }>(
      `
        SELECT project_id
        FROM audit_events
        WHERE id = $1
      `,
      [audit.rows[0].id],
    );

    expect(preserved.rows).toHaveLength(1);
    expect(preserved.rows[0].project_id).toBe(project.id);
  });
});
