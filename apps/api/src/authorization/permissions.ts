import type { TenantRole } from './roles.js';

export type Permission =
  | 'project:read'
  | 'project:create'
  | 'project:update'
  | 'project:delete'
  | 'agent:read'
  | 'agent:create'
  | 'agent:update'
  | 'agent:delete'
  | 'agent:share'
  | 'audit:read'
  | 'audit:export';

const permissions: Record<Permission, readonly TenantRole[]> = {
  'project:read': ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'],
  'project:create': ['OWNER', 'ADMIN', 'MEMBER'],
  'project:update': ['OWNER', 'ADMIN', 'MEMBER'],
  'project:delete': ['OWNER', 'ADMIN'],

  'agent:read': ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'],
  'agent:create': ['OWNER', 'ADMIN', 'MEMBER'],
  'agent:update': ['OWNER', 'ADMIN', 'MEMBER'],
  'agent:delete': ['OWNER', 'ADMIN'],
  'agent:share': ['OWNER', 'ADMIN', 'MEMBER'],
  'audit:read': ['OWNER', 'ADMIN'],
  'audit:export': ['OWNER', 'ADMIN'],
};

export function hasPermission(
  role: TenantRole,
  permission: Permission,
): boolean {
  return permissions[permission].includes(role);
}
