import dotenv from 'dotenv';
dotenv.config();
export const config = {
  port: parseInt(process.env.PORT || '3000'),
  host: process.env.HOST || '0.0.0.0',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://nevo:nevo@localhost:5432/nevo',
  databasePoolMax: parseInt(process.env.DATABASE_POOL_MAX || '10', 10),
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  repoRoot: process.env.REPO_ROOT || process.cwd(),
  allowedPaths: (process.env.ALLOWED_PATHS || '').split(':').filter(Boolean),
  sessionExpiryDays: parseInt(process.env.SESSION_EXPIRY_DAYS || '7', 10),
  authRateLimitWindowSeconds: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_SECONDS || '60', 10),
  authRateLimitMaxAttempts: parseInt(process.env.AUTH_RATE_LIMIT_MAX_ATTEMPTS || '10', 10)
};
