import path from 'path';
import { fileExists, readTextFile, resolveWithinCwd } from './filesystem.js';

const MAX_CONTEXT_CHARS = 4000;

export interface FileContext {
  path: string;
  snippet: string;
}

export const loadFileContexts = async (paths: string[]): Promise<FileContext[]> => {
  const unique = Array.from(new Set(paths.filter(Boolean)));
  const contexts: FileContext[] = [];

  for (const relative of unique) {
    const resolved = resolveWithinCwd(relative);
    if (!(await fileExists(resolved))) {
      continue;
    }
    const contents = await readTextFile(resolved);
    const snippet = contents.length > MAX_CONTEXT_CHARS
      ? `${contents.slice(0, MAX_CONTEXT_CHARS)}\n...\n[truncated]`
      : contents;
    contexts.push({
      path: relative.replace(/\\/g, '/'),
      snippet,
    });
  }

  return contexts;
};
