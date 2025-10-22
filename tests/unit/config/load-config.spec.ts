import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadConfig } from '../../../src/config/index.js';
import os from 'os';
import fs from 'fs';
import path from 'path';

let tempDir: string;
let cwdSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'coder-config-'));
  cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(tempDir);
});

afterEach(() => {
  cwdSpy.mockRestore();
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe('loadConfig', () => {
  it('returns defaults when config file missing', async () => {
    const config = await loadConfig();
    expect(config.model).toBe('qwen2.5-coder:14b');
    expect(config.context.ignore).toContain('**/node_modules/**');
  });

  it('reads configuration from coder.config.json when present', async () => {
    const custom = {
      model: 'test-model',
      temperature: 0.1,
      max_tokens: 1024,
      allow_network: true,
      context: { ignore: ['**/tmp/**'], topK: 8 },
      tools: {
        shell: { allow: ['npm'], timeoutSec: 100 },
        tests: { autoDetect: false, default: 'jest' },
      },
      git: { base: 'develop', merge_mode: 'no-ff', sign_commits: true },
      mcp: {
        server: { host: '127.0.0.1', port: 9999 },
        client: { tool_allowlist: ['fs.read'] },
      },
    };
    fs.writeFileSync(path.join(tempDir, 'coder.config.json'), JSON.stringify(custom, null, 2));
    const config = await loadConfig();
    expect(config.model).toBe('test-model');
    expect(config.git.base).toBe('develop');
    expect(config.tools.tests.default).toBe('jest');
  });
});
