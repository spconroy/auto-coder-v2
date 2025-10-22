import { promises as fs } from 'fs';
import path from 'path';
import { ensureDir, resolveWithinCwd } from '../utils/index.js';

export type LogLevel = 'info' | 'warn' | 'error';

export interface LogEntry<T = Record<string, unknown>> {
  level: LogLevel;
  message: string;
  timestamp: string;
  data?: T;
}

export const appendTaskLog = async <T extends Record<string, unknown>>(
  taskId: string,
  entry: LogEntry<T>,
): Promise<void> => {
  const logsDir = resolveWithinCwd('.coder/logs');
  await ensureDir(logsDir);
  const logPath = path.join(logsDir, `${taskId}.jsonl`);
  const line = JSON.stringify(entry);
  await fs.appendFile(logPath, `${line}\n`, 'utf8');
};

export const createLogEntry = <T extends Record<string, unknown>>(
  level: LogLevel,
  message: string,
  data?: T,
): LogEntry<T> => ({
  level,
  message,
  timestamp: new Date().toISOString(),
  data,
});
