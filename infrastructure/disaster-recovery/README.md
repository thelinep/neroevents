# Nevo Production Health, Readiness & Disaster Recovery

## Purpose

This document defines the production health, readiness, and disaster
recovery verification procedure.

## Health

`/health` is the process liveness endpoint.

It must remain available without authentication.

A successful `/health` response means that the application process is
running and capable of accepting health requests.

Health must not be treated as proof that all production dependencies are
ready.

## Readiness

`/ready` is the production readiness endpoint.

Readiness represents whether the application can safely serve production
traffic.

A healthy process may therefore be alive while not ready.

The production container healthcheck uses `/ready` as its readiness signal.

## Dependency recovery

Production readiness depends on the required application dependencies.

When a required dependency is unavailable:

1. The dependency healthcheck becomes unhealthy.
2. The application readiness state must reflect the dependency failure
   where the application contract requires it.
3. Traffic must not be treated as safely ready.
4. After the dependency recovers, readiness must return to healthy.

## Disaster recovery

Application containers are disposable.

Production PostgreSQL data is persistent and backed up independently.

Recovery consists of:

1. Confirm the production failure.
2. Determine whether application restart is sufficient.
3. Determine whether PostgreSQL recovery is required.
4. Select the approved backup artifact when database restoration is required.
5. Restore PostgreSQL.
6. Start or restart required services.
7. Verify PostgreSQL health.
8. Verify Redis health.
9. Verify backend `/health`.
10. Verify backend `/ready`.
11. Verify frontend availability.
12. Authenticate with a valid account.
13. Verify tenant selection.
14. Verify representative application data.
15. Verify audit access.
16. Record the recovery result.

## Recovery verification

A recovery is not considered complete merely because containers are
running.

The following must be verified:

- PostgreSQL healthy
- Redis healthy
- backend healthy
- backend ready
- frontend available
- authentication functional
- tenant selection functional
- representative data present
- audit access functional

## Recovery metrics

Every production disaster-recovery exercise should record:

- incident start time
- recovery start time
- service restoration time
- data restoration time
- readiness restoration time
- recovery completion time
- estimated RPO
- measured RTO
- backup artifact used
- verification result

## Operational boundary

The automated M29.9 certification verifies that the repository contains
the required production health, readiness, orchestration, and recovery
contracts.

A real production disaster-recovery exercise must be performed separately
against the deployed production environment.