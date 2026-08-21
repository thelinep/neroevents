export interface AuditEventInput {
  tenantId: string;
  userId?: string | null;
  projectId?: string | null;
  action: string;
  resourceType?: string | null;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
}
