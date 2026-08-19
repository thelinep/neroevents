# Nevo Security Baseline

## Secrets

- Never commit provider API keys, JWT secrets, private keys, or credentials.
- Use `.env.example` only for placeholders.
- Rotate any credential that appears in a repository or artifact.

## AI execution

LLM-generated paths and commands are untrusted input. Filesystem, Git, shell, and network operations must pass through an explicit policy and workspace boundary.

## Approval

Protected operations require a durable approval record. A UI confirmation or boolean stub is not authorization.

## Database

SQL migrations in `packages/database/migrations` are the authoritative schema. Do not add a second runtime schema definition.
