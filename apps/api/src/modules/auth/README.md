# Auth Module

Identity is intentionally isolated from the rest of the API.

- `routes/` — HTTP endpoints
- `services/` — authentication/session business logic
- `schemas/` — request parsing and validation
- `services/rate-limiter.ts` — baseline abuse protection

The module uses `@nevo/auth` for reusable token and password primitives and `@nevo/database`/the API DB pool for persistence.
