export interface AuditEventInput {
  tenantId: string;
  userId?: string | null;
  projectId?: string | null;
  action: string;
  resourceType?: string | null;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
}

export interface AuditEventQuery {
  tenantId: string;
  limit?: number;
  offset?: number;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  userId?: string;
}
