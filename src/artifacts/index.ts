import path from 'path';
import { ensureDir, resolveWithinCwd, writeTextFile } from '../utils/index.js';

const sanitizeLabel = (label: string): string =>
  label.replace(/[^a-z0-9._-]+/gi, '_').replace(/^_+|_+$/g, '') || 'artifact';

const stepArtifactDir = async (taskId: string, stepId: string): Promise<string> => {
  const dir = path.join(resolveWithinCwd('.coder/artifacts'), taskId, stepId);
  await ensureDir(dir);
  return dir;
};

export const writeStepArtifact = async (
  taskId: string,
  stepId: string,
  label: string,
  contents: string,
): Promise<string> => {
  const dir = await stepArtifactDir(taskId, stepId);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `${sanitizeLabel(label)}-${timestamp}.log`;
  const fullPath = path.join(dir, fileName);
  await writeTextFile(fullPath, contents);
  return path.relative(resolveWithinCwd('.'), fullPath);
};
