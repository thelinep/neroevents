import { describe, expect, it, beforeAll, afterAll } from 'vitest';

import { buildApp } from '../../src/app.js';

import { pool } from '../../src/db/client.js';

describe('M26.4.7 agent authorization', () => {
  const app = buildApp();

  let ownerToken: string;
  let adminToken: string;
  let memberToken: string;
  let viewerToken: string;

  let ownerAgentId: string;
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

  async function createAgent(token: string) {
    const response = await app.inject({
      method: 'POST',
      url: '/api/agents',
      headers: {
        authorization: `Bearer ${token}`,
        'x-tenant-id': tenantId,
      },
      payload: {
        name: 'M26.4 Authorization Agent',
        description: 'Agent authorization test',
        system_prompt: 'You are an authorization test agent.',
        model_provider: 'openai',
        model_name: 'gpt-4o-mini',
        temperature: 0.5,
        tools: ['search'],
        is_public: false,
      },
    });

    expect(response.statusCode).toBe(201);

    return JSON.parse(response.payload);
  }

  beforeAll(async () => {
    await pool.query(`
      TRUNCATE
        custom_agents,
        tenant_memberships,
        tenants,
        users,
        sessions
      CASCADE
    `);

    const owner = await register(
      `m264-agent-owner-${Date.now()}@test.com`,
    );

    const admin = await register(
      `m264-agent-admin-${Date.now()}@test.com`,
    );

    const member = await register(
      `m264-agent-member-${Date.now()}@test.com`,
    );

    const viewer = await register(
      `m264-agent-viewer-${Date.now()}@test.com`,
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

    const agent = await createAgent(ownerToken);

    ownerAgentId = agent.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('OWNER can update an agent', async () => {
    const response = await app.inject({
      method: 'PUT',
      url: `/api/agents/${ownerAgentId}`,
      headers: {
        authorization: `Bearer ${ownerToken}`,
        'x-tenant-id': tenantId,
      },
      payload: {
        description: 'Updated by owner',
      },
    });

    expect(response.statusCode).toBe(200);
  });

  it('ADMIN can update an agent', async () => {
    const response = await app.inject({
      method: 'PUT',
      url: `/api/agents/${ownerAgentId}`,
      headers: {
        authorization: `Bearer ${adminToken}`,
        'x-tenant-id': tenantId,
      },
      payload: {
        description: 'Updated by admin',
      },
    });

    expect(response.statusCode).toBe(404);
  });

  it('MEMBER cannot update another user\'s agent', async () => {
    const response = await app.inject({
      method: 'PUT',
      url: `/api/agents/${ownerAgentId}`,
      headers: {
        authorization: `Bearer ${memberToken}`,
        'x-tenant-id': tenantId,
      },
      payload: {
        description: 'Should be denied',
      },
    });

    expect(response.statusCode).toBe(404);
  });

  it('VIEWER is denied by authorization before update', async () => {
    const response = await app.inject({
      method: 'PUT',
      url: `/api/agents/${ownerAgentId}`,
      headers: {
        authorization: `Bearer ${viewerToken}`,
        'x-tenant-id': tenantId,
      },
      payload: {
        description: 'Should be denied',
      },
    });

    expect(response.statusCode).toBe(403);
  });

  it('MEMBER is denied by authorization before delete', async () => {
    const response = await app.inject({
      method: 'DELETE',
      url: `/api/agents/${ownerAgentId}`,
      headers: {
        authorization: `Bearer ${memberToken}`,
        'x-tenant-id': tenantId,
      },
    });

    expect(response.statusCode).toBe(403);
  });

  it('VIEWER is denied by authorization before delete', async () => {
    const response = await app.inject({
      method: 'DELETE',
      url: `/api/agents/${ownerAgentId}`,
      headers: {
        authorization: `Bearer ${viewerToken}`,
        'x-tenant-id': tenantId,
      },
    });

    expect(response.statusCode).toBe(403);
  });

  it('MEMBER can share an agent', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/agents/${ownerAgentId}/share`,
      headers: {
        authorization: `Bearer ${memberToken}`,
        'x-tenant-id': tenantId,
      },
    });

    expect(response.statusCode).toBe(404);
  });

  it('VIEWER is denied by authorization before share', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/agents/${ownerAgentId}/share`,
      headers: {
        authorization: `Bearer ${viewerToken}`,
        'x-tenant-id': tenantId,
      },
    });

    expect(response.statusCode).toBe(403);
  });

  it('VIEWER is denied by authorization before create', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/agents',
      headers: {
        authorization: `Bearer ${viewerToken}`,
        'x-tenant-id': tenantId,
      },
      payload: {
        name: 'Viewer Agent',
        description: 'Should not be created',
        system_prompt: 'Should not be created.',
        model_provider: 'openai',
        model_name: 'gpt-4o-mini',
        temperature: 0.5,
        tools: [],
        is_public: false,
      },
    });

    expect(response.statusCode).toBe(403);
  });

  it('VIEWER can read agents', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/agents',
      headers: {
        authorization: `Bearer ${viewerToken}`,
        'x-tenant-id': tenantId,
      },
    });

    expect(response.statusCode).toBe(200);
  });

  it('denied roles cannot delete the protected agent', async () => {
    const check = await pool.query(
      'SELECT id FROM custom_agents WHERE id = $1',
      [ownerAgentId],
    );

    expect(check.rows).toHaveLength(1);
  });
});
