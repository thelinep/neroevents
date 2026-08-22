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
  limit: number;
  offset: number;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  userId?: string;
}

export interface AuditEvent {
  id: string;
  tenant_id: string;
  user_id: string | null;
  project_id: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  metadata: Record<string, unknown>;
  created_at: Date;
}

export interface AuditEventListResponse {
  items: AuditEvent[];
  pagination: {
    limit: number;
    offset: number;
  };
}