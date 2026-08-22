import type { AuditEvent } from './audit.types.js';

export interface AuditRetentionPolicy {
  retentionDays: number;
}

export interface AuditRetentionDecision {
  retentionDays: number;
  cutoff: Date;
  eligible: boolean;
}

/**
 * M27.6 — Audit Retention Policy
 *
 * This module defines retention policy and determines whether an
 * audit event has crossed the retention boundary.
 *
 * IMPORTANT:
 * - This module never UPDATEs audit_events.
 * - This module never DELETEs audit_events.
 * - This module never changes an audit event.
 * - Actual lifecycle execution must remain a separately authorized
 *   governance operation.
 */

const DEFAULT_RETENTION_DAYS = 365;

function parseRetentionDays(
  value: string | undefined,
): number {
  if (value === undefined || value.trim() === '') {
    return DEFAULT_RETENTION_DAYS;
  }

  const days = Number(value);

  if (
    !Number.isInteger(days) ||
    days <= 0
  ) {
    throw new Error(
      'AUDIT_RETENTION_DAYS must be a positive integer',
    );
  }

  return days;
}

/**
 * Resolve the configured audit retention policy.
 *
 * Configuration:
 *
 *   AUDIT_RETENTION_DAYS=365
 *
 * Defaults to 365 days when the environment variable is
 * not configured.
 */
export function getAuditRetentionPolicy(): AuditRetentionPolicy {
  return {
    retentionDays: parseRetentionDays(
      process.env.AUDIT_RETENTION_DAYS,
    ),
  };
}

/**
 * Calculate the retention cutoff from a reference time.
 *
 * An event is retention-eligible when:
 *
 *   event.created_at < cutoff
 *
 * The cutoff itself is not eligible.
 */
export function getAuditRetentionCutoff(
  referenceDate: Date = new Date(),
  policy: AuditRetentionPolicy =
    getAuditRetentionPolicy(),
): Date {
  if (
    !Number.isFinite(
      referenceDate.getTime(),
    )
  ) {
    throw new Error(
      'referenceDate must be a valid Date',
    );
  }

  if (
    !Number.isInteger(policy.retentionDays) ||
    policy.retentionDays <= 0
  ) {
    throw new Error(
      'retentionDays must be a positive integer',
    );
  }

  const cutoff = new Date(
    referenceDate.getTime(),
  );

  cutoff.setUTCDate(
    cutoff.getUTCDate() -
      policy.retentionDays,
  );

  return cutoff;
}

/**
 * Determine whether an audit event has crossed
 * the configured retention boundary.
 *
 * This is intentionally a pure decision function.
 */
export function isAuditEventRetentionEligible(
  event: Pick<AuditEvent, 'created_at'>,
  referenceDate: Date = new Date(),
  policy: AuditRetentionPolicy =
    getAuditRetentionPolicy(),
): boolean {
  const createdAt =
    event.created_at instanceof Date
      ? event.created_at
      : new Date(event.created_at);

  if (!Number.isFinite(createdAt.getTime())) {
    throw new Error(
      'audit event created_at must be a valid Date',
    );
  }

  const cutoff =
    getAuditRetentionCutoff(
      referenceDate,
      policy,
    );

  return createdAt.getTime() < cutoff.getTime();
}

/**
 * Return the complete retention decision for
 * an audit event.
 *
 * This makes the policy boundary explicit and
 * testable without touching the database.
 */
export function evaluateAuditRetention(
  event: Pick<AuditEvent, 'created_at'>,
  referenceDate: Date = new Date(),
  policy: AuditRetentionPolicy =
    getAuditRetentionPolicy(),
): AuditRetentionDecision {
  const cutoff =
    getAuditRetentionCutoff(
      referenceDate,
      policy,
    );

  const createdAt =
    event.created_at instanceof Date
      ? event.created_at
      : new Date(event.created_at);

  if (!Number.isFinite(createdAt.getTime())) {
    throw new Error(
      'audit event created_at must be a valid Date',
    );
  }

  return {
    retentionDays: policy.retentionDays,
    cutoff,
    eligible:
      createdAt.getTime() <
      cutoff.getTime(),
  };
}

/**
 * Determine whether an event is still within
 * the retention period.
 */
export function isAuditEventWithinRetention(
  event: Pick<AuditEvent, 'created_at'>,
  referenceDate: Date = new Date(),
  policy: AuditRetentionPolicy =
    getAuditRetentionPolicy(),
): boolean {
  return !isAuditEventRetentionEligible(
    event,
    referenceDate,
    policy,
  );
}