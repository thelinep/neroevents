# M04 — Identity

## Scope
Production-grade registration, login, session authentication, logout and refresh-token rotation.

## Implemented
- Email normalization.
- Password policy (12–128 chars, upper/lower/number/special).
- bcrypt cost 12.
- Random 256-bit session tokens encoded as base64url.
- SHA-256 token hashes stored in PostgreSQL.
- Disabled-account rejection.
- `last_used_at` updates on authenticated requests.
- Refresh token rotation: old session revoked before a new session is created.
- Basic authentication rate limiting.
- Central Fastify authentication plugin.
- Centralized database pool.
- Identity hardening migration and indexes.

## API
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `POST /api/auth/refresh`

## Gate
The M04 gate passes when a clean database can migrate, a user can register/login, `/me` works, logout invalidates the session, refresh rotates the token, disabled users cannot authenticate, and the E2E auth suite is green.
