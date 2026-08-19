import fs from 'fs-extra';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { getProvider } from '../providers/registry.js';
import simpleGit from 'simple-git';

const execAsync = promisify(exec);

export async function unzip(zipPath: string) {
  const dest = `uploads/${Date.now()}`;
  await fs.ensureDir(dest);
  await execAsync(`unzip -q ${zipPath} -d ${dest}`);
  return dest;
}

export async function cloneRepo(repoUrl: string, destDir: string) {
  const git = (simpleGit as any)();
  await git.clone(repoUrl, destDir);
}

export async function analyzeCodebase(rootDir: string): Promise<string> {
  const tree = await getFileTree(rootDir);
  const provider = getProvider('gemini');
  const response = await provider(`Analyze this codebase file tree:\n${tree}`);
  return response.content;
}

async function getFileTree(dir: string, prefix = ''): Promise<string> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  let tree = '';
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name === '.git') continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) tree += `${prefix}${e.name}/\n` + await getFileTree(full, prefix + '  ');
    else tree += `${prefix}${e.name}\n`;
  }
  return tree;
}

export async function cleanupTemp(dir: string) {
  await fs.remove(dir);
}