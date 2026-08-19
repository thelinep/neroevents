# Nevo Architecture

Nevo is organized into five layers:

1. `apps/web` — React product interface.
2. `apps/api` — Fastify API, orchestration and runtime services.
3. `packages/*` — reusable contracts, database assets, AI infrastructure, auth and shared primitives.
4. `infrastructure` — Docker, nginx and operational scripts.
5. `e2e` — system-level verification.

The migration is intentionally incremental: existing feature code stays operational while domain boundaries are introduced.
