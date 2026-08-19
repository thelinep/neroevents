import fs from 'fs-extra';
import path from 'path';
export async function generateDiff(files: string[], response: any, context: Record<string,string>): Promise<Record<string,string>> {
  const diff: Record<string,string> = {};
  const blocks = response.content.match(/```(?:\w+)?\n([\s\S]*?)```/g) || [];
  for (let i = 0; i < Math.min(blocks.length, files.length); i++) {
    const file = files[i];
    const content = blocks[i].replace(/```\w*\n?/, '').replace(/```$/, '');
    diff[file] = content;
  }
  return diff;
}
export async function applyDiff(diff: Record<string,string>, repoRoot: string) {
  for (const [file, content] of Object.entries(diff)) {
    const fullPath = path.join(repoRoot, file);
    await fs.ensureDir(path.dirname(fullPath));
    await fs.writeFile(fullPath, content, 'utf-8');
  }
}
