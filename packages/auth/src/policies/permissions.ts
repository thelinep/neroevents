export const permissions = [
  'project.read',
  'project.write',
  'agent.read',
  'agent.write',
  'filesystem.read',
  'filesystem.write',
  'git.read',
  'git.write',
  'shell.execute',
  'network.request',
] as const;

export type Permission = typeof permissions[number];

export const defaultAgentPermissions: Permission[] = [
  'project.read',
  'agent.read',
  'filesystem.read',
  'git.read',
];
