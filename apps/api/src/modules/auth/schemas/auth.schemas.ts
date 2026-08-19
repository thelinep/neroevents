import type { FastifyRequest } from 'fastify';
import { normalizeEmail, validatePassword } from '@nevo/auth';

export interface RegisterBody {
  email: string;
  password: string;
  displayName?: string;
}

export interface LoginBody {
  email: string;
  password: string;
}

export function parseRegisterBody(request: FastifyRequest): RegisterBody {
  const body = (request.body ?? {}) as Partial<RegisterBody>;
  const email = normalizeEmail(String(body.email ?? ''));
  const password = String(body.password ?? '');
  const displayName = body.displayName?.trim();
  if (!email || !email.includes('@') || email.length > 320) throw new Error('Invalid email');
  const passwordResult = validatePassword(password);
  if (!passwordResult.valid) throw new Error(passwordResult.errors.join('; '));
  return { email, password, displayName: displayName || undefined };
}

export function parseLoginBody(request: FastifyRequest): LoginBody {
  const body = (request.body ?? {}) as Partial<LoginBody>;
  const email = normalizeEmail(String(body.email ?? ''));
  const password = String(body.password ?? '');
  if (!email || !email.includes('@') || email.length > 320 || !password) throw new Error('Invalid credentials');
  return { email, password };
}
