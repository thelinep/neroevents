import simpleGit from 'simple-git';

export async function gitCommit(message: string, repoRoot: string) {
  const git = (simpleGit as any)(repoRoot);
  await git.add('.');
  const status = await git.status();
  if (status.files.length) await git.commit(message);
}