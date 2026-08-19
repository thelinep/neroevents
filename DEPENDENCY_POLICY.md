# Dependency Policy

`pnpm-lock.yaml` is the canonical workspace lockfile. Existing app-level `package-lock.json` files are retained in this transition archive to minimize dependency churn; remove them once the pnpm workspace migration has been validated in CI.
