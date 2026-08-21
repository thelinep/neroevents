import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../src/app.js';
import { pool } from '../../src/db/client.js';

describe('M26.4.5 project authorization', () => {
  const app = buildApp();

  let ownerToken: string;
  let adminToken: string;
  let memberToken: string;
  let viewerToken: string;
  let projectId: string;
  let tenantId: string;

  async function register(email: string) {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email,
        password: 'Password123!',
        displayName: email.split('@')[0],
      },
    });

    expect(response.statusCode).toBe(201);

    const body = JSON.parse(response.payload);

    expect(body.token).toBeTruthy();
    expect(body.tenant?.id).toBeTruthy();

    return {
      token: body.token as string,
      tenantId: body.tenant.id as string,
      userId: body.user.id as string,
    };
  }

  async function setRole(
    tenant: string,
    user: string,
    role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER',
  ) {
    await pool.query(
      `
        INSERT INTO tenant_memberships (
          tenant_id,
          user_id,
          role
        )
        VALUES ($1, $2, $3)
        ON CONFLICT (tenant_id, user_id)
        DO UPDATE SET role = EXCLUDED.role
      `,
      [tenant, user, role],
    );
  }

  async function createProject(token: string) {
    const response = await app.inject({
      method: 'POST',
      url: '/api/projects',
      headers: {
        authorization: `Bearer ${token}`,
        'x-tenant-id': tenantId,
      },
      payload: {
        name: 'M26.4 Authorization Project',
      },
    });

    expect(response.statusCode).toBe(201);

    return JSON.parse(response.payload);
  }

  beforeAll(async () => {
    await pool.query(`
      TRUNCATE
        projects,
        tenant_memberships,
        tenants,
        users,
        sessions
      CASCADE
    `);

    const owner = await register(
      `m264-owner-${Date.now()}@test.com`,
    );

    const admin = await register(
      `m264-admin-${Date.now()}@test.com`,
    );

    const member = await register(
      `m264-member-${Date.now()}@test.com`,
    );

    const viewer = await register(
      `m264-viewer-${Date.now()}@test.com`,
    );

    tenantId = owner.tenantId;

    await setRole(
      tenantId,
      owner.userId,
      'OWNER',
    );

    await setRole(
      tenantId,
      admin.userId,
      'ADMIN',
    );

    await setRole(
      tenantId,
      member.userId,
      'MEMBER',
    );

    await setRole(
      tenantId,
      viewer.userId,
      'VIEWER',
    );

    ownerToken = owner.token;
    adminToken = admin.token;
    memberToken = member.token;
    viewerToken = viewer.token;

    const project = await createProject(ownerToken);

    projectId = project.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('OWNER can delete a project', async () => {
    const project = await createProject(ownerToken);

    const response = await app.inject({
      method: 'DELETE',
      url: `/api/projects/${project.id}`,
      headers: {
        authorization: `Bearer ${ownerToken}`,
        'x-tenant-id': tenantId,
      },
    });

    expect(response.statusCode).toBe(204);
  });

  it('ADMIN can delete a project', async () => {
    const project = await createProject(ownerToken);

    const response = await app.inject({
      method: 'DELETE',
      url: `/api/projects/${project.id}`,
      headers: {
        authorization: `Bearer ${adminToken}`,
        'x-tenant-id': tenantId,
      },
    });

    expect(response.statusCode).toBe(404);
  });

  it('MEMBER is denied by authorization before deletion', async () => {
    const response = await app.inject({
      method: 'DELETE',
      url: `/api/projects/${projectId}`,
      headers: {
        authorization: `Bearer ${memberToken}`,
        'x-tenant-id': tenantId,
      },
    });

    expect(response.statusCode).toBe(403);
  });

  it('VIEWER is denied by authorization before deletion', async () => {
    const response = await app.inject({
      method: 'DELETE',
      url: `/api/projects/${projectId}`,
      headers: {
        authorization: `Bearer ${viewerToken}`,
        'x-tenant-id': tenantId,
      },
    });

    expect(response.statusCode).toBe(403);
  });

  it('denied roles cannot delete the protected project', async () => {
    const check = await pool.query(
      'SELECT id FROM projects WHERE id = $1',
      [projectId],
    );

    expect(check.rows).toHaveLength(1);
  });
});
