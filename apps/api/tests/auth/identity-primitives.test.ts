import { describe, expect, it } from 'vitest';
import { createSessionToken, hashSessionToken, normalizeEmail, validatePassword } from '@nevo/auth';

describe('identity primitives', () => {
  it('normalizes email', () => {
    expect(normalizeEmail('  User@Example.COM ')).toBe('user@example.com');
  });

  it('enforces password policy', () => {
    expect(validatePassword('weak').valid).toBe(false);
    expect(validatePassword('StrongPassword1!').valid).toBe(true);
  });

  it('creates non-reversible session token hashes', () => {
    const token = createSessionToken();
    expect(token.length).toBeGreaterThan(30);
    expect(hashSessionToken(token)).toHaveLength(64);
    expect(hashSessionToken(token)).not.toBe(token);
  });
});
