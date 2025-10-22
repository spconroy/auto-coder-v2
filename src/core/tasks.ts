import path from 'path';
import yaml from 'yaml';
import { TaskFile, TaskState } from '../types/task.js';
import {
  ensureDir,
  fileExists,
  readTextFile,
  resolveWithinCwd,
  writeTextFile,
} from '../utils/index.js';

const tasksDir = (): string => resolveWithinCwd('.coder/tasks');
const stateDir = (): string => resolveWithinCwd('.coder/state');

export const getTaskFilePath = (taskId: string): string => {
  return path.join(tasksDir(), `${taskId}.yaml`);
};

export const getTaskStatePath = (taskId: string): string => {
  return path.join(stateDir(), `${taskId}.json`);
};

export const loadTask = async (taskId: string): Promise<TaskFile> => {
  const filePath = getTaskFilePath(taskId);
  if (!(await fileExists(filePath))) {
    throw new Error(`Task ${taskId} was not found in .coder/tasks`);
  }
  const raw = await readTextFile(filePath);
  return yaml.parse(raw) as TaskFile;
};

export const saveTaskState = async (state: TaskState): Promise<void> => {
  await ensureDir(stateDir());
  await writeTextFile(getTaskStatePath(state.id), JSON.stringify(state, null, 2));
};

export const loadTaskState = async (taskId: string): Promise<TaskState | undefined> => {
  const statePath = getTaskStatePath(taskId);
  if (!(await fileExists(statePath))) {
    return undefined;
  }
  const raw = await readTextFile(statePath);
  return JSON.parse(raw) as TaskState;
};
