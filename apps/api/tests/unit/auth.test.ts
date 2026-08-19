import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../src/app.js';
import { pool } from '../../src/db/client.js';

const app=buildApp();

describe('Auth Routes', () => {
  let testUser = { email: 'test@example.com', password: 'Password123!' };

  beforeAll(async () => {
    await pool.query('TRUNCATE users, sessions CASCADE');
  });

  afterAll(async () => {
    await pool.end();
  });

  it('should register a new user', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { ...testUser, displayName: 'Test User' },
    });
    // console.log('REGISTER STATUS:', res.statusCode);
// console.log('REGISTER BODY:', res.payload);

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.user).toHaveProperty('id');
    expect(body.token).toBeDefined();
  });

  it('should login with correct credentials', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: testUser.email, password: testUser.password },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.user.email).toBe(testUser.email);
  });

  it('should reject login with wrong password', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: testUser.email, password: 'wrong' },
    });
    expect(res.statusCode).toBe(401);
  });
});