# Nevo Architecture Upgrade — M02 Scaffold

This archive is an incremental hardening scaffold based on the existing Nevo codebase.

Implemented:
- `apps/api` and `apps/web` layout
- SQL migrations moved to `packages/database/migrations`
- migration tracking and startup migration runner
- `/health` and `/ready` endpoints
- container-safe API host binding
- nginx SPA fallback
- nginx `/api` reverse proxy
- nginx WebSocket proxy
- full existing frontend route registration
- contracts/shared/LLM/auth package scaffolds
- workspace/path security boundary scaffold
- approval/workspace/orchestration boundaries
- E2E test relocation and deterministic wording
- environment/secrets hygiene
- architecture/security/operations documentation

Not yet complete:
- full API contract adoption
- real approval enforcement
- ZIP extraction hardening
- dynamic SQL identifier allowlisting
- sandboxed shell execution
- complete missing feature APIs
- production secrets manager
- full E2E registration/seed lifecycle

This is intentionally an M02/M03 foundation, not a claim of production certification.
