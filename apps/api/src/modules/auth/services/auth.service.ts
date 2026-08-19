import bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import { createSessionToken, hashSessionToken, type AuthUser, type SessionPair } from '@nevo/auth';

export class AuthService {
  constructor(private readonly db: Pool, private readonly sessionExpiryDays: number) {}

  private expiry(): Date {
    return new Date(Date.now() + this.sessionExpiryDays * 24 * 60 * 60 * 1000);
  }

  private async createSession(client: Pool | PoolClient, userId: string): Promise<SessionPair> {
    const token = createSessionToken();
    const expiresAt = this.expiry();
    await client.query(
      `INSERT INTO sessions (user_id, token_hash, expires_at, last_used_at)
       VALUES ($1, $2, $3, NOW())`,
      [userId, hashSessionToken(token), expiresAt],
    );
    return { token, expiresAt };
  }

  async register(email: string, password: string, displayName?: string) {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');
      const existing = await client.query('SELECT id FROM users WHERE email = $1', [email]);
      if (existing.rowCount) {
        await client.query('ROLLBACK');
        throw Object.assign(new Error('Email already registered'), { code: 'EMAIL_EXISTS' });
      }
      const passwordHash = await bcrypt.hash(password, 12);
      const userResult = await client.query(
        `INSERT INTO users (id, email, password_hash, display_name)
         VALUES ($1, $2, $3, $4)
         RETURNING id, email, display_name`,
        [randomUUID(), email, passwordHash, displayName ?? email.split('@')[0]],
      );
      const row = userResult.rows[0];
      const user: AuthUser = { id: row.id, email: row.email, displayName: row.display_name };
      const session = await this.createSession(client, user.id);
      await client.query('COMMIT');
      return { user, session };
    } catch (error) {
      try { await client.query('ROLLBACK'); } catch {}
      throw error;
    } finally {
      client.release();
    }
  }

  async login(email: string, password: string) {
    const result = await this.db.query(
      `SELECT id, email, display_name, password_hash, disabled_at
       FROM users WHERE email = $1`,
      [email],
    );
    const user = result.rows[0];
    if (!user || user.disabled_at) throw Object.assign(new Error('Invalid credentials'), { code: 'INVALID_CREDENTIALS' });
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) throw Object.assign(new Error('Invalid credentials'), { code: 'INVALID_CREDENTIALS' });
    const session = await this.createSession(this.db, user.id);
    return {
      user: { id: user.id, email: user.email, displayName: user.display_name },
      session,
    };
  }

  async authenticate(token: string): Promise<AuthUser | null> {
    const tokenHash = hashSessionToken(token);
    const result = await this.db.query(
      `SELECT u.id, u.email, u.display_name, u.disabled_at, s.id AS session_id
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = $1
         AND s.revoked_at IS NULL
         AND s.expires_at > NOW()`,
      [tokenHash],
    );
    const row = result.rows[0];
    if (!row || row.disabled_at) return null;
    await this.db.query('UPDATE sessions SET last_used_at = NOW() WHERE id = $1', [row.session_id]);
    return { id: row.id, email: row.email, displayName: row.display_name };
  }

  async logout(token: string): Promise<void> {
    await this.db.query(
      'UPDATE sessions SET revoked_at = NOW() WHERE token_hash = $1 AND revoked_at IS NULL',
      [hashSessionToken(token)],
    );
  }

  async refresh(token: string) {
    const oldHash = hashSessionToken(token);
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query(
        `SELECT s.id, s.user_id, u.id AS uid, u.email, u.display_name, u.disabled_at
         FROM sessions s JOIN users u ON u.id = s.user_id
         WHERE s.token_hash = $1 AND s.revoked_at IS NULL AND s.expires_at > NOW()
         FOR UPDATE OF s`,
        [oldHash],
      );
      const row = result.rows[0];
      if (!row || row.disabled_at) throw Object.assign(new Error('Unauthorized'), { code: 'UNAUTHORIZED' });
      await client.query('UPDATE sessions SET revoked_at = NOW() WHERE id = $1', [row.id]);
      const session = await this.createSession(client, row.uid);
      await client.query('COMMIT');
      return { user: { id: row.uid, email: row.email, displayName: row.display_name }, session };
    } catch (error) {
      try { await client.query('ROLLBACK'); } catch {}
      throw error;
    } finally {
      client.release();
    }
  }
}
