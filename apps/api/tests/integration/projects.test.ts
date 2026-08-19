import { describe, it, expect, beforeAll } from 'vitest';
// import {app} from '../../src/index.js';
import { pool } from '../../src/db/client.js';
import { buildApp } from '../../src/app.js';

const app=buildApp();
describe('Projects API', () => {
  let token: string;
  let userId: string;

  beforeAll(async () => {
    await pool.query('TRUNCATE projects, users, sessions CASCADE');
    // Register and login to get token
    const reg = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'proj@test.com', password: 'Password123!' },
    });
    const regBody = JSON.parse(reg.payload);
    // console.log('PROJECT REGISTER:', reg.statusCode, reg.payload);
    token = regBody.token;
    userId = regBody.user.id;
  });

  it('should create a project', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/projects',
      headers: { Authorization: `Bearer ${token}` },
      payload: { name: 'Test Project' },
    });
    // console.log('PROJECT CREATE STATUS:', res.statusCode);
// console.log('PROJECT CREATE BODY:', res.payload);
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.name).toBe('Test Project');
    expect(body.user_id).toBe(userId);
  });

  it('should list user projects', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/projects',
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
  });
});