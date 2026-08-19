import path from 'node:path';

export function resolveWithinRoot(root: string, requestedPath: string): string {
  const rootResolved = path.resolve(root);
  const target = path.resolve(rootResolved, requestedPath);
  const relative = path.relative(rootResolved, target);

  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Path escapes the allowed workspace');
  }

  return target;
}
