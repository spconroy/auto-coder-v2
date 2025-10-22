import { execa } from 'execa';
import { McpClient, FsApplyPatchResult } from './types.js';

const runGitApply = async (args: string[], diff: string): Promise<FsApplyPatchResult> => {
  try {
    const result = await execa('git', ['apply', ...args], {
      input: diff,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    return {
      ok: true,
      stdout: result.stdout,
      stderr: result.stderr,
    };
  } catch (error: unknown) {
    const err = error as Error & { stdout?: string; stderr?: string };
    return {
      ok: false,
      stdout: err.stdout ?? '',
      stderr: err.stderr ?? '',
      errorMessage: err.message,
    };
  }
};

export class LocalMcpClient implements McpClient {
  async fsApplyPatch(diff: string): Promise<FsApplyPatchResult> {
    // Dry run check
    const check = await runGitApply(['--check', '--whitespace=nowarn'], diff);
    if (!check.ok) {
      return {
        ok: false,
        stdout: check.stdout,
        stderr: check.stderr,
        errorMessage: check.errorMessage ?? 'Patch failed dry-run check.',
      };
    }

    const apply = await runGitApply(['--index', '--whitespace=nowarn'], diff);
    if (!apply.ok) {
      return {
        ok: false,
        stdout: apply.stdout,
        stderr: apply.stderr,
        errorMessage: apply.errorMessage ?? 'Patch failed to apply.',
      };
    }

    return {
      ok: true,
      stdout: apply.stdout,
      stderr: apply.stderr,
    };
  }
}
