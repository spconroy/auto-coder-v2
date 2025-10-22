import path from 'path';
import yaml from 'yaml';
import { loadConfig, AgentConfig } from '../config/index.js';
import {
  ensureDir,
  fileExists,
  newTaskId,
  makeSlug,
  readTextFile,
  resolveWithinCwd,
  writeTextFile,
} from '../utils/index.js';
import { TaskFile, TaskStep } from '../types/task.js';
import { promises as fs } from 'fs';
import { prepareAgentBranch, BranchPreparationResult } from '../git/index.js';

export interface PlanOptions {
  modelOverride?: string;
}

interface PlanInputs {
  specText: string;
  sourceLabel: string;
  specPath?: string;
}

const readSpecInput = async (spec: string): Promise<PlanInputs> => {
  const resolved = resolveWithinCwd(spec);
  if (await fileExists(resolved)) {
    const specText = await readTextFile(resolved);
    return {
      specText,
      sourceLabel: path.basename(resolved),
      specPath: resolved,
    };
  }

  return {
    specText: spec,
    sourceLabel: 'inline-prompt',
  };
};

const inferChangeHints = (specText: string): string[] => {
  const hints = new Set<string>();
  const lower = specText.toLowerCase();

  const register = (keyword: string, path: string): void => {
    if (lower.includes(keyword.toLowerCase())) {
      hints.add(path);
    }
  };

  register('readme', 'README.md');
  register('agents', 'AGENTS.md');
  register('contributing', 'CONTRIBUTING.md');
  register('docs/', 'docs/README.md');

  return Array.from(hints);
};

const buildStubGraph = (config: AgentConfig): TaskStep[] => {
  const defaultTestFramework =
    (config.tools.tests.default as string | undefined) ?? 'vitest';

  return [
    {
      id: 's1',
      kind: 'analyze',
      goal: 'Review specification and repository context',
    },
    {
      id: 's2',
      kind: 'edit',
      goal: 'Apply initial code changes based on the plan',
      depends_on: ['s1'],
      changes: [],
    },
    {
      id: 's3',
      kind: 'test',
      goal: 'Run project test suite',
      depends_on: ['s2'],
      framework: defaultTestFramework,
      args: ['--run'],
      on_fail: {
        strategy: 'fix_and_retry',
        max_cycles: 2,
      },
    },
  ];
};

export interface PlanResult {
  task: TaskFile;
  taskFilePath: string;
  config: AgentConfig;
  specSnapshotPath?: string;
  branchInfo: BranchPreparationResult;
}

export const planTask = async (spec: string, options: PlanOptions = {}): Promise<PlanResult> => {
  const config = await loadConfig();
  const { specText, sourceLabel, specPath } = await readSpecInput(spec);

  const taskId = newTaskId();
  const slug = makeSlug(sourceLabel.replace(/\.[^.]+$/, ''));
  const branch = `agent/${taskId}-${slug}`;
  const createdAt = new Date().toISOString();
  const model = options.modelOverride ?? config.model;

  const branchInfo = await prepareAgentBranch(config.git.base, branch);

  const task: TaskFile = {
    id: taskId,
    title: `Implement work from ${sourceLabel}`,
    branch,
    base: config.git.base,
    model,
    created_at: createdAt,
    policies: {
      approvals: 'manual',
      run_tests_after_each_step: true,
      allow_network: config.allow_network,
      max_parallel: 1,
      retries: 2,
    },
    success: {
      require_green_tests: true,
      require_no_lint_errors: true,
      required_files: [],
    },
    graph: buildStubGraph(config),
    metadata: {
      source_label: sourceLabel,
      spec_length: specText.length,
    },
  };

  const changeHints = inferChangeHints(specText);
  const editStep = task.graph.find((step) => step.kind === 'edit');
  if (editStep && (!editStep.changes || editStep.changes.length === 0) && changeHints.length > 0) {
    editStep.changes = changeHints.map((path) => ({ path, mode: 'patch' }));
    task.metadata = {
      ...(task.metadata ?? {}),
      change_hints: changeHints,
    };
  }

  const tasksDir = resolveWithinCwd('.coder/tasks');
  await ensureDir(tasksDir);
  const taskFilePath = path.join(tasksDir, `${task.id}.yaml`);
  const serialized = yaml.stringify(task);
  await writeTextFile(taskFilePath, serialized);

  let specSnapshotPath: string | undefined;
  if (specPath) {
    const snapshotDir = resolveWithinCwd('.coder/specs');
    await ensureDir(snapshotDir);
    specSnapshotPath = path.join(snapshotDir, `${task.id}-${path.basename(specPath)}`);
    await fs.copyFile(specPath, specSnapshotPath);
  } else {
    const snapshotDir = resolveWithinCwd('.coder/specs');
    await ensureDir(snapshotDir);
    specSnapshotPath = path.join(snapshotDir, `${task.id}-prompt.md`);
    await writeTextFile(specSnapshotPath, specText);
  }

  if (specSnapshotPath) {
    const relative = path.relative(process.cwd(), specSnapshotPath);
    task.metadata = {
      ...(task.metadata ?? {}),
      spec_snapshot: relative,
    };
  }

  return {
    task,
    taskFilePath,
    config,
    specSnapshotPath,
    branchInfo,
  };
};
