import path from 'path';
import { readTextFile, fileExists, resolveWithinCwd } from './filesystem.js';
import { TaskStep } from '../types/task.js';

const defaultPatchDir = (taskId: string): string =>
  path.join(resolveWithinCwd('.coder/patches'), taskId);

export interface LoadedDiff {
  diff: string;
  source: string;
}

export const loadDiffForStep = async (taskId: string, step: TaskStep): Promise<LoadedDiff | undefined> => {
  if (step.diff) {
    return { diff: step.diff, source: 'inline-step-diff' };
}
  if (step.diffPath) {
    const resolved = resolveWithinCwd(step.diffPath);
    if (await fileExists(resolved)) {
      return { diff: await readTextFile(resolved), source: resolved };
    }
  }

  const fallbackPath = path.join(defaultPatchDir(taskId), `${step.id}.diff`);
  if (await fileExists(fallbackPath)) {
    return { diff: await readTextFile(fallbackPath), source: fallbackPath };
  }

  return undefined;
};
