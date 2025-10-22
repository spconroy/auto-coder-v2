import { promises as fs } from 'fs';
import path from 'path';

export const ensureDir = async (dirPath: string): Promise<void> => {
  await fs.mkdir(dirPath, { recursive: true });
};

export const resolveWithinCwd = (...segments: string[]): string => {
  return path.resolve(process.cwd(), ...segments);
};

export const readTextFile = async (filePath: string): Promise<string> => {
  return fs.readFile(filePath, 'utf8');
};

export const writeTextFile = async (filePath: string, contents: string): Promise<void> => {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, contents, 'utf8');
};

export const fileExists = async (filePath: string): Promise<boolean> => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};
