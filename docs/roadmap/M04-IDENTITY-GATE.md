# M04 Identity Gate

## API

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `POST /api/auth/refresh`

## Security controls

- Normalized email addresses
- Strong password policy
- bcrypt cost 12
- 256-bit random session token
- SHA-256 token hash at rest
- Disabled-user rejection
- Session activity tracking
- Refresh rotation
- Authentication rate limiting
- Central Fastify auth plugin

## Acceptance

1. Register a new user.
2. Login with the new user.
3. Verify `/auth/me`.
4. Refresh and verify the token changes.
5. Verify the old token is rejected.
6. Logout and verify the session is rejected.
7. Verify disabled users cannot log in.
8. Verify repeated authentication attempts receive HTTP 429 after the configured threshold.
