export type TenantRole =
  | 'OWNER'
  | 'ADMIN'
  | 'MEMBER'
  | 'VIEWER';

export const ROLE_RANK: Record<TenantRole, number> = {
  VIEWER: 10,
  MEMBER: 20,
  ADMIN: 30,
  OWNER: 40,
};
