# @nevo/database

Authoritative PostgreSQL schema assets for Nevo.

- `migrations/` contains ordered SQL migrations.
- `seeds/` contains deterministic development/E2E seed data.
- Runtime migration execution currently lives in `apps/api/src/db/migrate.ts` so the API can run migrations before accepting traffic.

Do not add a second runtime schema definition or Prisma schema unless Prisma becomes the chosen database authority.
