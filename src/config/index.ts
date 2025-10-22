import { promises as fs } from 'fs';
import path from 'path';
import { resolveWithinCwd } from '../utils/index.js';

export interface ToolConfig {
  allow?: string[];
  timeoutSec?: number;
  autoDetect?: boolean;
  default?: string;
}

export interface ContextConfig {
  ignore: string[];
  topK: number;
}

export interface GitConfig {
  base: string;
  merge_mode: 'squash' | 'no-ff';
  sign_commits: boolean;
}

export interface McpConfig {
  server: { host: string; port: number };
  client: { tool_allowlist: string[] };
}

export interface AgentConfig {
  model: string;
  temperature: number;
  max_tokens: number;
  allow_network: boolean;
  context: ContextConfig;
  tools: {
    shell: ToolConfig;
    tests: ToolConfig;
  };
  git: GitConfig;
  mcp: McpConfig;
}

const defaultConfig: AgentConfig = {
  model: 'qwen2.5-coder:14b',
  temperature: 0.2,
  max_tokens: 2048,
  allow_network: false,
  context: {
    ignore: ['**/node_modules/**', '**/.next/**', '**/dist/**'],
    topK: 12,
  },
  tools: {
    shell: { allow: ['pnpm', 'npm', 'pytest', 'go', 'git'], timeoutSec: 300 },
    tests: { autoDetect: true, default: 'vitest' },
  },
  git: {
    base: 'main',
    merge_mode: 'squash',
    sign_commits: false,
  },
  mcp: {
    server: { host: '127.0.0.1', port: 3323 },
    client: { tool_allowlist: ['fs.*', 'git.*', 'shell.run', 'tests.run', 'project.search'] },
  },
};

export const loadConfig = async (configPath = 'coder.config.json'): Promise<AgentConfig> => {
  const resolved = resolveWithinCwd(configPath);
  try {
    const raw = await fs.readFile(resolved, 'utf8');
    const parsed = JSON.parse(raw) as AgentConfig;
    return parsed;
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return defaultConfig;
    }
    throw new Error(`Failed to read configuration at ${path.relative(process.cwd(), resolved)}: ${String(error)}`);
  }
};
