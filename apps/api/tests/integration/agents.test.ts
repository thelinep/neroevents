import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../src/app.js';
import { pool } from '../../src/db/client.js';

let app: ReturnType<typeof buildApp>;

describe('Agents API', () => {
  let token: string;
  let userId: string;
  let agentId: string;

  const testAgent = {
    name: 'Test Agent',
    description: 'Integration test agent',
    system_prompt: 'You are a helpful test agent.',
    model_provider: 'openai',
    model_name: 'gpt-4o-mini',
    temperature: 0.5,
    tools: ['search'],
    is_public: false,
  };

  beforeAll(async () => {
    await pool.query('TRUNCATE custom_agents, users, sessions CASCADE');
app = buildApp();

    const reg = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: 'agent@test.com',
        password: 'Password123!',
        displayName: 'Agent Tester',
      },
    });

    expect(reg.statusCode).toBe(201);

    const body = JSON.parse(reg.payload);
    token = body.token;
    userId = body.user.id;

    expect(token).toBeDefined();
    expect(userId).toBeDefined();
  });

  afterAll(async () => {
    await app.close();
    await pool.end();
  });

  it('should reject unauthenticated list requests', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/agents',
    });

    expect(res.statusCode).toBe(401);
  });

  it('should reject unauthenticated create requests', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/agents',
      payload: testAgent,
    });

    expect(res.statusCode).toBe(401);
  });

  it('should reject create requests with missing required fields', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/agents',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      payload: {
        name: 'Incomplete Agent',
      },
    });

    expect(res.statusCode).toBe(400);
  });

  it('should create an agent', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/agents',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      payload: testAgent,
    });

    expect(res.statusCode).toBe(201);

    const body = JSON.parse(res.payload);

    expect(body).toHaveProperty('id');
    expect(body.name).toBe(testAgent.name);
    expect(body.description).toBe(testAgent.description);
    expect(body.system_prompt).toBe(testAgent.system_prompt);
    expect(body.model_provider).toBe(testAgent.model_provider);
    expect(body.model_name).toBe(testAgent.model_name);
    expect(body.temperature).toBe(testAgent.temperature);
    expect(body.tools).toEqual(testAgent.tools);
    expect(body.is_public).toBe(false);
    expect(body.user_id).toBe(userId);

    agentId = body.id;
  });

  it('should list the authenticated user agents', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/agents',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    expect(res.statusCode).toBe(200);

    const body = JSON.parse(res.payload);

    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);

    const agent = body.find(
      (item: { id: string }) => item.id === agentId,
    );

    expect(agent).toBeDefined();
    expect(agent.user_id).toBe(userId);
  });

  it('should update the authenticated user agent', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: `/api/agents/${agentId}`,
      headers: {
        Authorization: `Bearer ${token}`,
      },
      payload: {
        name: 'Updated Test Agent',
        description: 'Updated description',
        temperature: 0.8,
      },
    });

    expect(res.statusCode).toBe(200);

    const body = JSON.parse(res.payload);

    expect(body.id).toBe(agentId);
    expect(body.user_id).toBe(userId);
    expect(body.name).toBe('Updated Test Agent');
    expect(body.description).toBe('Updated description');
    expect(body.temperature).toBe(0.8);
  });

  it('should reject an empty update', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: `/api/agents/${agentId}`,
      headers: {
        Authorization: `Bearer ${token}`,
      },
      payload: {},
    });

    expect(res.statusCode).toBe(400);
  });

  it('should share an authenticated user agent', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/agents/${agentId}/share`,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    expect(res.statusCode).toBe(200);

    const body = JSON.parse(res.payload);

    expect(body.shareToken).toBeDefined();
    expect(typeof body.shareToken).toBe('string');
    expect(body.shareToken.length).toBeGreaterThan(0);

    const db = await pool.query(
      `SELECT share_token, is_public, user_id
       FROM custom_agents
       WHERE id = $1`,
      [agentId],
    );

    expect(db.rows).toHaveLength(1);
    expect(db.rows[0].share_token).toBe(body.shareToken);
    expect(db.rows[0].is_public).toBe(true);
    expect(db.rows[0].user_id).toBe(userId);
  });

  it('should expose the shared public agent', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/agents',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    expect(res.statusCode).toBe(200);

    const body = JSON.parse(res.payload);

    const agent = body.find(
      (item: { id: string }) => item.id === agentId,
    );

    expect(agent).toBeDefined();
    expect(agent.is_public).toBe(true);
  });

  it('should not allow another user to update the agent', async () => {
    const reg = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: 'other-agent@test.com',
        password: 'Password123!',
        displayName: 'Other Agent User',
      },
    });

    expect(reg.statusCode).toBe(201);

    const otherBody = JSON.parse(reg.payload);
    const otherToken = otherBody.token;

    const res = await app.inject({
      method: 'PUT',
      url: `/api/agents/${agentId}`,
      headers: {
        Authorization: `Bearer ${otherToken}`,
      },
      payload: {
        name: 'Hijacked Agent',
      },
    });

    expect(res.statusCode).toBe(404);
  });

    it('should reject forbidden update fields', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: `/api/agents/${agentId}`,
      headers: {
        Authorization: `Bearer ${token}`,
      },
      payload: {
        user_id: '00000000-0000-0000-0000-000000000000',
      },
    });

    expect(res.statusCode).toBe(400);
  });

  it('should reject invalid temperature', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: `/api/agents/${agentId}`,
      headers: {
        Authorization: `Bearer ${token}`,
      },
      payload: {
        temperature: 3,
      },
    });

    expect(res.statusCode).toBe(400);
  });

  it('should reject invalid tools', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: `/api/agents/${agentId}`,
      headers: {
        Authorization: `Bearer ${token}`,
      },
      payload: {
        tools: 'search',
      },
    });

    expect(res.statusCode).toBe(400);
  });

  it('should reject invalid is_public', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: `/api/agents/${agentId}`,
      headers: {
        Authorization: `Bearer ${token}`,
      },
      payload: {
        is_public: 'true',
      },
    });

    expect(res.statusCode).toBe(400);
  });

  it('should not allow another user to delete the agent', async () => {
    const reg = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: 'delete-agent@test.com',
        password: 'Password123!',
        displayName: 'Delete Agent User',
      },
    });

    expect(reg.statusCode).toBe(201);

    const otherBody = JSON.parse(reg.payload);

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/agents/${agentId}`,
      headers: {
        Authorization: `Bearer ${otherBody.token}`,
      },
    });

    expect(res.statusCode).toBe(404);
  });

  it('should delete the authenticated user agent', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/agents/${agentId}`,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    expect(res.statusCode).toBe(204);

    const db = await pool.query(
      'SELECT id FROM custom_agents WHERE id = $1',
      [agentId],
    );

    expect(db.rows).toHaveLength(0);
  });

  it('should return 404 for a deleted agent', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: `/api/agents/${agentId}`,
      headers: {
        Authorization: `Bearer ${token}`,
      },
      payload: {
        name: 'Should Not Exist',
      },
    });

    expect(res.statusCode).toBe(404);
  });
});