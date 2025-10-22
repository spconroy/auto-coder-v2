import chalk from 'chalk';
import { execaCommand, type ExecaError } from 'execa';
import { TaskFile, TaskStateStep, TaskStep, TaskStepKind } from '../types/task.js';
import { loadTask, loadTaskState, saveTaskState } from './tasks.js';
import { updateStepState } from './runner.js';
import { appendTaskLog, createLogEntry } from '../logging/index.js';
import {
  getCurrentCommit,
  stageAllChanges,
  workingTreeHasChanges,
  commitAllChanges,
} from '../git/index.js';
import { writeStepArtifact } from '../artifacts/index.js';
import { loadConfig, type AgentConfig } from '../config/index.js';
import { createMcpClient, McpClient } from '../mcp/index.js';
import { loadDiffForStep } from '../utils/diff.js';
import { resolveWithinCwd, readTextFile } from '../utils/index.js';
import { loadFileContexts } from '../utils/context.js';
import { generateDiffWithOllama } from '../llm/index.js';

export interface ExecuteOptions {
  autonomous?: boolean;
}

export interface StepExecutionContext {
  task: TaskFile;
  step: TaskStep;
  options: ExecuteOptions;
  config: AgentConfig;
  mcp: McpClient;
  model: string;
}

export interface StepResult extends Partial<TaskStateStep> {
  status: TaskStateStep['status'];
  artifacts?: string[];
  commitMessage?: string;
}

type StepHandler = (ctx: StepExecutionContext) => Promise<StepResult>;

const placeholderHandler = (note: string): StepHandler => {
  return async (): Promise<StepResult> => ({
    status: 'success',
    note,
  });
};

const createAnalyzeHandler = (): StepHandler => {
  return async ({ task }: StepExecutionContext): Promise<StepResult> => {
    const lines = [
      `Task ID: ${task.id}`,
      `Title: ${task.title}`,
      `Branch: ${task.branch}`,
    ];
    if (task.metadata?.spec_snapshot) {
      lines.push(`Spec snapshot: ${task.metadata.spec_snapshot}`);
    }
    if (typeof task.metadata?.spec_length === 'number') {
      lines.push(`Spec length: ${task.metadata.spec_length} chars`);
    }
    lines.push('Planned steps:');
    task.graph.forEach((step, idx) => {
      lines.push(`  ${idx + 1}. [${step.kind}] ${step.id} → ${step.goal}`);
    });

    const artifactPath = await writeStepArtifact(
      task.id,
      'analysis',
      'analysis-summary',
      lines.join('\n'),
    );

    return {
      status: 'success',
      note: 'Recorded analysis summary artifact.',
      artifacts: [artifactPath],
    };
  };
};

interface CommandResult {
  ok: boolean;
  stdout: string;
  stderr: string;
  exitCode?: number;
  errorMessage?: string;
}

const runCommand = async (
  command: string,
  cwd: string,
  timeoutMs?: number,
): Promise<CommandResult> => {
  try {
    const result = await execaCommand(command, {
      cwd,
      shell: true,
      timeout: timeoutMs,
    });
    return {
      ok: true,
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      exitCode: result.exitCode ?? 0,
    };
  } catch (error: unknown) {
    const err = error as ExecaError;
    return {
      ok: false,
      stdout: err.stdout ?? '',
      stderr: err.stderr ?? '',
      exitCode: err.exitCode ?? undefined,
      errorMessage: err.shortMessage ?? err.message ?? String(error),
    };
  }
};

const getShellBinary = (command: string): string => command.trim().split(/\s+/)[0] ?? '';

const sanitizeCommitMessage = (message: string): string => {
  const firstLine = message.split(/\r?\n/)[0]?.trim() ?? '';
  if (!firstLine) {
    return 'task: automated change';
  }
  return firstLine.length > 72 ? `${firstLine.slice(0, 69)}...` : firstLine;
};

const isUnifiedDiff = (diff: string): boolean => {
  const trimmed = diff.trim();
  if (trimmed.length === 0) {
    return false;
  }
  const hasDiffGit = /^diff --git a\/.+ b\/.+/m.test(trimmed);
  const hasUnifiedHeaders = /^--- \w.*\n\+\+\+ \w.*/m.test(trimmed);
  const hasHunks = /\n@@ /.test(trimmed);
  return (hasDiffGit || hasUnifiedHeaders) && hasHunks;
};

const createShellHandler = (config: AgentConfig): StepHandler => {
  return async ({ step, task }: StepExecutionContext): Promise<StepResult> => {
    const command = step.cmd?.trim();
    if (!command) {
      return { status: 'skipped', note: 'No shell command specified.' };
    }

    const allowList = config.tools.shell.allow ?? [];
    const binary = getShellBinary(command);
    if (allowList.length > 0 && !allowList.includes(binary)) {
      return {
        status: 'failed',
        error: `Command "${binary}" is not in shell allowlist (${allowList.join(', ')}).`,
      };
    }

    const timeoutMs = config.tools.shell.timeoutSec
      ? config.tools.shell.timeoutSec * 1000
      : undefined;
    await logStepEvent(task.id, 'info', 'shell-execute', {
      stepId: step.id,
      command,
      cwd: step.cwd ?? process.cwd(),
      timeoutMs,
    });

    const result = await runCommand(command, step.cwd ?? process.cwd(), timeoutMs);
    const artifacts: string[] = [];
    if (result.stdout) {
      artifacts.push(await writeStepArtifact(task.id, step.id, 'stdout', result.stdout));
    }
    if (result.stderr) {
      artifacts.push(await writeStepArtifact(task.id, step.id, 'stderr', result.stderr));
    }

    if (!result.ok) {
      return {
        status: 'failed',
        error:
          result.errorMessage ??
          `Command exited with code ${result.exitCode ?? 'unknown'}.`,
        artifacts,
      };
    }

    return {
      status: 'success',
      note: `Command exited with code ${result.exitCode ?? 0}.`,
      artifacts,
    };
  };
};

const buildTestCommand = (framework: string | undefined, args: string[]): string => {
  const parts = (items: string[]): string => items.filter(Boolean).join(' ');
  switch (framework) {
    case 'vitest':
      return parts(['npx', 'vitest', 'run', ...args]);
    case 'jest':
      return parts(['npx', 'jest', ...args]);
    case 'pytest':
      return parts(['pytest', ...args]);
    case 'go':
      return parts(['go', 'test', ...args]);
    default:
      return parts(['npm', 'test', ...args]);
  }
};

const createTestHandler = (config: AgentConfig): StepHandler => {
  return async ({ step, task }: StepExecutionContext): Promise<StepResult> => {
    const framework = step.framework ?? (config.tools.tests.default as string | undefined);
    const args = step.args ?? [];
    const command = (step.cmd ?? buildTestCommand(framework, args)).trim();

    await logStepEvent(task.id, 'info', 'tests-execute', {
      stepId: step.id,
      framework,
      command,
      args,
    });

    const result = await runCommand(command, step.cwd ?? process.cwd());
    const artifacts: string[] = [];
    if (result.stdout) {
      artifacts.push(await writeStepArtifact(task.id, step.id, 'test-stdout', result.stdout));
    }
    if (result.stderr) {
      artifacts.push(await writeStepArtifact(task.id, step.id, 'test-stderr', result.stderr));
    }

    if (!result.ok) {
      return {
        status: 'failed',
        error:
          result.errorMessage ??
          `Tests exited with code ${result.exitCode ?? 'unknown'}.`,
        artifacts,
      };
    }

    return {
      status: 'success',
      note: `Tests passed (exit code ${result.exitCode ?? 0}).`,
      artifacts,
    };
  };
};

const createPatchHandler = (config: AgentConfig, kind: 'edit' | 'doc'): StepHandler => {
  return async ({ task, step, mcp, model }: StepExecutionContext): Promise<StepResult> => {
    const artifacts: string[] = [];
    let commitMessageOverride: string | undefined;

    let loaded = await loadDiffForStep(task.id, step);
    const changeHints = step.changes?.map((change) => change.path);
    const fileContexts = changeHints?.length ? await loadFileContexts(changeHints) : [];

    const generateDiff = async (message: string): Promise<{ ok: boolean; error?: string }> => {
      try {
        const specSnapshot = task.metadata?.spec_snapshot
          ? await readTextFile(resolveWithinCwd(task.metadata.spec_snapshot))
          : undefined;
        const llmResult = await generateDiffWithOllama({
          model,
          stepId: step.id,
          taskId: task.id,
          goal: message,
          specText: specSnapshot,
          changeHints,
          fileContexts,
        });

        loaded = { diff: llmResult.diff, source: 'ollama-generated' };
        commitMessageOverride = llmResult.commitMessage;
        artifacts.push(
          await writeStepArtifact(task.id, step.id, 'ollama-prompt', llmResult.prompt),
        );
        artifacts.push(
          await writeStepArtifact(task.id, step.id, 'ollama-response', llmResult.rawResponse),
        );
        artifacts.push(
          await writeStepArtifact(task.id, step.id, 'ollama-diff', llmResult.diff),
        );
        return { ok: true };
      } catch (error: unknown) {
        artifacts.push(
          await writeStepArtifact(
            task.id,
            step.id,
            `ollama-failure-${Date.now()}`,
            String(error),
          ),
        );
        return { ok: false, error: String(error) };
      }
    };

    if (!loaded) {
      const attempt = await generateDiff(step.goal);
      if (!attempt.ok) {
        return {
          status: 'failed',
          error: `Failed to generate diff via Ollama: ${attempt.error}`,
          artifacts,
        };
      }
    }

    if (!isUnifiedDiff(loaded.diff)) {
      const errorMessage = 'Model returned a patch that is not a valid unified diff.';
      artifacts.push(await writeStepArtifact(task.id, step.id, 'ollama-invalid-diff', loaded.diff));
      const retry = await generateDiff(
        `${step.goal}. Previous attempt failed because: ${errorMessage}. Produce a valid unified diff for the target files.`,
      );
      if (!retry.ok || !loaded || !isUnifiedDiff(loaded.diff)) {
        return {
          status: 'failed',
          error: retry.error ?? errorMessage,
          artifacts,
        };
      }
    }

    await logStepEvent(task.id, 'info', 'apply-diff', {
      stepId: step.id,
      source: loaded.source,
    });

    const patchResult = await mcp.fsApplyPatch(loaded.diff);
    artifacts.push(await writeStepArtifact(task.id, step.id, 'diff', loaded.diff));

    if (!patchResult.ok) {
      if (patchResult.stdout) {
        artifacts.push(await writeStepArtifact(task.id, step.id, 'patch-stdout', patchResult.stdout));
      }
      if (patchResult.stderr) {
        artifacts.push(await writeStepArtifact(task.id, step.id, 'patch-stderr', patchResult.stderr));
      }
      return {
        status: 'failed',
        error: patchResult.errorMessage ?? 'Failed to apply diff.',
        artifacts,
      };
    }

    const hasChanges = await workingTreeHasChanges();
    let commitSha: string | undefined;
    if (hasChanges) {
      await stageAllChanges();
      const defaultMessage = `task(${step.id}): ${kind === 'doc' ? 'update docs' : 'apply edits'}`;
      const rawMessage = commitMessageOverride?.trim()?.length ? commitMessageOverride : defaultMessage;
      commitSha = await commitAllChanges(sanitizeCommitMessage(rawMessage));
    }

    return {
      status: 'success',
      note: hasChanges
        ? `Applied diff and committed ${commitSha ?? ''}`
        : 'Applied diff (no changes staged).',
      artifacts,
      commit_sha: commitSha,
      commitMessage: commitMessageOverride,
    };
  };
};

const handlerFactories: Record<TaskStepKind, (config: AgentConfig) => StepHandler> = {
  analyze: () => createAnalyzeHandler(),
  edit: (config) => createPatchHandler(config, 'edit'),
  shell: createShellHandler,
  test: createTestHandler,
  doc: (config) => createPatchHandler(config, 'doc'),
  custom: () => placeholderHandler('Custom step placeholder. Define bespoke handler.'),
};

const resolveHandler = (kind: TaskStepKind, config: AgentConfig): StepHandler =>
  (handlerFactories[kind] ?? handlerFactories.custom)(config);

const logStepEvent = async (
  taskId: string,
  level: 'info' | 'warn' | 'error',
  message: string,
  data?: Record<string, unknown>,
): Promise<void> => {
  await appendTaskLog(taskId, createLogEntry(level, message, data));
};

export const executeTask = async (taskId: string, options: ExecuteOptions = {}): Promise<void> => {
  const task = await loadTask(taskId);
  const initialState = await loadTaskState(taskId);
  if (!initialState) {
    throw new Error(
      `Task state not found for ${taskId}. Run "coder run --task ${taskId}" first to initialize.`,
    );
  }

  const config = await loadConfig();
  const mcp = createMcpClient();

  console.log(
    chalk.blue(
      `→ Starting execution for ${taskId} (${task.graph.length} steps, branch ${initialState.branch})`,
    ),
  );
  await logStepEvent(taskId, 'info', 'execution-start', {
    taskId,
    steps: task.graph.length,
    branch: initialState.branch,
    options,
  });

  for (const step of task.graph) {
    const currentState = (await loadTaskState(taskId))!;
    const stepState = currentState.steps[step.id];
    if (!stepState) {
      throw new Error(`State missing for step ${step.id}`);
    }
    if (stepState.status === 'success' || stepState.status === 'skipped') {
      console.log(chalk.gray(`  • Skipping ${step.id} (already ${stepState.status})`));
      continue;
    }

    await updateStepState(task.id, step.id, {
      status: 'running',
      started_at: new Date().toISOString(),
      note: undefined,
      error: undefined,
    });
    await logStepEvent(taskId, 'info', 'step-start', {
      stepId: step.id,
      kind: step.kind,
      goal: step.goal,
    });
    console.log(chalk.cyan(`  • [${step.kind}] ${step.id}: ${step.goal}`));

    const handler = resolveHandler(step.kind, config);
    const activeModel = task.model ?? config.model;
    const aggregatedArtifacts = new Set<string>(currentState.steps[step.id].artifacts ?? []);
    let attempt = 0;
    const maxFixCycles =
      step.on_fail?.strategy === 'fix_and_retry' ? step.on_fail?.max_cycles ?? 1 : 0;
    let result: StepResult;

    while (true) {
      try {
        result = await handler({ task, step, options, config, mcp, model: activeModel });
      } catch (error: unknown) {
        result = {
          status: 'failed',
          error: String(error),
        };
      }

      if (result.artifacts) {
        result.artifacts.forEach((artifact) => aggregatedArtifacts.add(artifact));
      }

      if (result.status !== 'failed') {
        break;
      }

      if (step.on_fail?.strategy !== 'fix_and_retry' || attempt >= maxFixCycles) {
        break;
      }

      attempt += 1;
      await logStepEvent(taskId, 'warn', 'step-retry', {
        stepId: step.id,
        attempt,
        maxCycles: maxFixCycles,
        error: result.error,
      });
      console.log(
        chalk.yellow(
          `    ⚠ Retry ${attempt}/${maxFixCycles} for ${step.id} (fix_and_retry). Re-running handler...`,
        ),
      );
    }

    const commitSha = await getCurrentCommit().catch(() => undefined);
    const patch: Partial<TaskStateStep> = {
      status: result.status,
      started_at: currentState.steps[step.id].started_at,
      ended_at: new Date().toISOString(),
      error: result.error,
      note: result.note,
      retries: attempt,
      commit_sha: commitSha,
      artifacts: Array.from(aggregatedArtifacts),
    };

    await updateStepState(task.id, step.id, patch);
    await logStepEvent(taskId, result.status === 'failed' ? 'error' : 'info', 'step-complete', {
      stepId: step.id,
      status: result.status,
      commitSha,
      commitMessage: result.commitMessage,
      note: result.note,
      error: result.error,
      artifacts: result.artifacts,
    });

    if (result.status === 'failed') {
      console.log(chalk.red(`    ✖ Step ${step.id} failed: ${result.error}`));
      const strategy = step.on_fail?.strategy;
      if (strategy === 'skip') {
        console.log(chalk.yellow(`    ⚠ on_fail=skip → marking ${step.id} as skipped.`));
        await updateStepState(task.id, step.id, {
          status: 'skipped',
          note: `Skipped after failure due to on_fail=skip. Original error: ${result.error}`,
        });
        await logStepEvent(taskId, 'warn', 'step-skipped-after-failure', {
          stepId: step.id,
          strategy,
        });
        continue;
      }

      if (strategy === 'fix_and_retry') {
        console.log(
          chalk.yellow(
            '    ⚠ fix_and_retry requested, but automated fixes are not implemented yet.',
          ),
        );
        await updateStepState(task.id, step.id, {
          note: 'Failure encountered. fix_and_retry not yet implemented; manual intervention required.',
        });
      }

      break;
    }

    const summary = result.note ?? 'Step completed.';
    console.log(chalk.green(`    ✔ Step ${step.id} completed. ${summary}`));
  }

  const finalState = await loadTaskState(taskId);
  if (finalState) {
    finalState.updated_at = new Date().toISOString();
    await saveTaskState(finalState);
  }

  await logStepEvent(taskId, 'info', 'execution-complete', {
    taskId,
  });
  console.log(chalk.green(`✔ Execution loop complete for ${taskId}`));
  console.log(
    chalk.yellow(
      'Edit/doc handlers remain placeholders. Integrate MCP fs.apply_patch for full automation.',
    ),
  );
};
