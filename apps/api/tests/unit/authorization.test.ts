import { describe, expect, it } from 'vitest';
import {
  hasPermission,
  type Permission,
} from '../../src/authorization/permissions.js';
import type { TenantRole } from '../../src/authorization/roles.js';

describe('M26.4 authorization matrix', () => {
  const cases: Array<
    [TenantRole, Permission, boolean]
  > = [
    ['OWNER', 'project:read', true],
    ['ADMIN', 'project:read', true],
    ['MEMBER', 'project:read', true],
    ['VIEWER', 'project:read', true],

    ['OWNER', 'project:create', true],
    ['ADMIN', 'project:create', true],
    ['MEMBER', 'project:create', true],
    ['VIEWER', 'project:create', false],

    ['OWNER', 'project:delete', true],
    ['ADMIN', 'project:delete', true],
    ['MEMBER', 'project:delete', false],
    ['VIEWER', 'project:delete', false],

    ['OWNER', 'agent:read', true],
    ['ADMIN', 'agent:read', true],
    ['MEMBER', 'agent:read', true],
    ['VIEWER', 'agent:read', true],

    ['OWNER', 'agent:create', true],
    ['ADMIN', 'agent:create', true],
    ['MEMBER', 'agent:create', true],
    ['VIEWER', 'agent:create', false],

    ['OWNER', 'agent:delete', true],
    ['ADMIN', 'agent:delete', true],
    ['MEMBER', 'agent:delete', false],
    ['VIEWER', 'agent:delete', false],

    ['OWNER', 'agent:share', true],
    ['ADMIN', 'agent:share', true],
    ['MEMBER', 'agent:share', true],
    ['VIEWER', 'agent:share', false],
  ];

  it.each(cases)(
    '%s hasPermission(%s) = %s',
    (role, permission, expected) => {
      expect(hasPermission(role, permission)).toBe(expected);
    },
  );
});
