#!/usr/bin/env node
import chalk from 'chalk';
import { Command } from 'commander';
import yaml from 'yaml';
import { planTask } from '../core/planner.js';
import { loadTask, loadTaskState } from '../core/tasks.js';
import { executeTask, initializeRun } from '../core/index.js';
import { fileExists, readTextFile, resolveWithinCwd, writeTextFile } from '../utils/index.js';
import { TaskFile } from '../types/task.js';

const program = new Command();

program
  .name('coder')
  .description('Local autonomous coding agent powered by Ollama and MCP tools.')
  .version('0.1.0');

program
  .command('plan')
  .argument('<spec>', 'Path to a spec file or inline prompt')
  .option('--model <model>', 'Override default model')
  .option('--quiet', 'Print task id only')
  .action(async (spec: string, options: { model?: string; quiet?: boolean }) => {
    const { task, taskFilePath, specSnapshotPath, branchInfo } = await planTask(spec, {
      modelOverride: options.model,
    });

    if (options.quiet) {
      console.log(task.id);
      return;
    }

    console.log(
      chalk.green(`✔ Planned task ${task.id}`),
      `\n  branch: ${chalk.cyan(task.branch)} ${branchInfo.existed ? chalk.yellow('(reused)') : chalk.green('(created)')}`,
      `\n  steps: ${task.graph.length}`,
      `\n  task file: ${taskFilePath}`,
      specSnapshotPath ? `\n  spec snapshot: ${specSnapshotPath}` : '',
    );
    console.log(`  base: ${branchInfo.base} @ ${branchInfo.baseCommit.slice(0, 7)}`);
  });

program
  .command('show')
  .argument('<taskId>', 'Task identifier')
  .action(async (taskId: string) => {
    const task = await loadTask(taskId);
    console.log(chalk.bold(task.title));
    console.log(`id: ${task.id}`);
    console.log(`branch: ${task.branch}`);
    console.log(`base: ${task.base}`);
    console.log(`model: ${task.model}`);
    console.log(`policies: approvals=${task.policies.approvals}, retries=${task.policies.retries}`);
    console.log(chalk.bold('\nSteps:'));
    task.graph.forEach((step, index) => {
      const header = `${index + 1}. [${step.kind}] ${step.id}`;
      console.log(chalk.cyan(header));
      console.log(`    goal: ${step.goal}`);
      if (step.depends_on?.length) {
        console.log(`    depends_on: ${step.depends_on.join(', ')}`);
      }
      if (step.framework) {
        console.log(`    framework: ${step.framework}`);
      }
      if (step.cmd) {
        console.log(`    cmd: ${step.cmd}`);
      }
    });
  });

program
  .command('run')
  .option('-t, --task <taskId>', 'Task identifier')
  .option('-f, --file <path>', 'Taskfile to execute')
  .option('--autonomous', 'Run without interactive approvals', false)
  .action(async (options: { task?: string; file?: string; autonomous?: boolean }) => {
    let taskId = options.task;

    if (options.file) {
      const resolved = resolveWithinCwd(options.file);
      if (!(await fileExists(resolved))) {
        throw new Error(`Taskfile not found at ${resolved}`);
      }
      const raw = await readTextFile(resolved);
      const parsed = yaml.parse(raw) as TaskFile;
      if (!parsed?.id) {
        throw new Error('Taskfile must contain an id field');
      }
      const destination = resolveWithinCwd('.coder/tasks', `${parsed.id}.yaml`);
      if (!(await fileExists(destination))) {
        await writeTextFile(destination, raw);
      }
      taskId = parsed.id;
    }

    if (!taskId) {
      throw new Error('Specify --task <taskId> or --file <path>');
    }

    const { state, alreadyInitialized } = await initializeRun(taskId, {
      autonomous: options.autonomous,
      fromFile: options.file,
    });

    console.log(
      chalk.green(`✔ Prepared run for ${taskId}`),
      `\n  branch: ${state.branch}`,
      `\n  steps tracked: ${Object.keys(state.steps).length}`,
      `\n  state file: .coder/state/${taskId}.json`,
      alreadyInitialized ? `\n  note: state already existed, leaving untouched.` : '',
    );
    await executeTask(taskId, { autonomous: options.autonomous });
  });

program
  .command('resume')
  .argument('<taskId>', 'Task identifier to resume')
  .action(async (taskId: string) => {
    const { state } = await initializeRun(taskId);
    console.log(
      chalk.green(`✔ Loaded state for ${taskId}`),
      `\n  branch: ${state.branch}`,
      `\n  steps: ${Object.keys(state.steps).length}`,
    );
    await executeTask(taskId, { autonomous: true });
  });

program
  .command('abort')
  .argument('<taskId>', 'Task identifier to abort')
  .action(async (taskId: string) => {
    console.log(
      chalk.yellow(
        `Abort requested for ${taskId}. Implement branch cleanup and rollback in future iterations.`,
      ),
    );
  });

program
  .command('diff')
  .argument('<taskId>', 'Task identifier')
  .action(async (taskId: string) => {
    const state = await loadTaskState(taskId);
    if (!state) {
      console.log(chalk.red(`No state found for ${taskId}. Run the task first.`));
      return;
    }
    console.log(
      chalk.yellow(
        `Diff viewing is not implemented yet. Steps completed (success/skipped): ${
          Object.values(state.steps).filter((s) => s.status === 'success' || s.status === 'skipped')
            .length
        }/${Object.keys(state.steps).length}`,
      ),
    );
  });

program
  .command('test')
  .argument('<taskId>', 'Task identifier')
  .option('--framework <name>', 'Force specific test framework')
  .action(async (taskId: string) => {
    console.log(
      chalk.yellow(
        `Test execution stubs are pending. Hook tests for ${taskId} once MCP test adapter is available.`,
      ),
    );
  });

program
  .command('merge')
  .argument('<taskId>', 'Task identifier to merge')
  .option('--mode <mode>', 'Merge strategy (squash|no-ff)', 'squash')
  .action(async (taskId: string, options: { mode: 'squash' | 'no-ff' }) => {
    console.log(
      chalk.yellow(
        `Merge routine (${options.mode}) for ${taskId} is not implemented yet. Future work will manage git branching.`,
      ),
    );
  });

program
  .command('revert')
  .argument('<taskId>', 'Task identifier')
  .option('--to-step <stepId>', 'Revert to step before this one')
  .action(async (taskId: string, options: { toStep?: string }) => {
    console.log(
      chalk.yellow(
        `Revert logic for ${taskId} (to step ${options.toStep ?? 'latest'}) is not implemented yet.`,
      ),
    );
  });

program
  .command('clean')
  .argument('<taskId>', 'Task identifier')
  .option('--delete-branch', 'Delete associated agent branch', false)
  .action(async (taskId: string, options: { deleteBranch?: boolean }) => {
    console.log(
      chalk.yellow(
        `Cleanup for ${taskId} (delete branch: ${options.deleteBranch ?? false}) pending implementation.`,
      ),
    );
  });

program
  .command('logs')
  .argument('<taskId>', 'Task identifier')
  .option('--follow', 'Stream logs as they update', false)
  .action(async (taskId: string, options: { follow?: boolean }) => {
    console.log(
      chalk.yellow(
        `Log viewer for ${taskId} (follow: ${options.follow ?? false}) not available yet.`,
      ),
    );
  });

program
  .command('config')
  .option('--print', 'Print effective configuration')
  .option('--edit', 'Open configuration for editing')
  .action(async (options: { print?: boolean; edit?: boolean }) => {
    if (options.print) {
      const configPath = resolveWithinCwd('coder.config.json');
      const contents = await readTextFile(configPath);
      console.log(contents);
      return;
    }

    if (options.edit) {
      console.log(
        chalk.yellow('Interactive config editing is not implemented yet. Please edit coder.config.json manually.'),
      );
      return;
    }

    console.log(
      chalk.yellow('No action specified. Use --print to display configuration or --edit to modify it.'),
    );
  });

program.parseAsync().catch((error) => {
  console.error(chalk.red('CLI execution failed'), error);
  process.exit(1);
});
