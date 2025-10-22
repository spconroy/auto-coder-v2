import { loadTask, loadTaskState, saveTaskState } from './tasks.js';
import { TaskState, TaskStateStep } from '../types/task.js';
import { prepareAgentBranch } from '../git/index.js';

export interface RunOptions {
  autonomous?: boolean;
  fromFile?: string;
}

export interface RunResult {
  state: TaskState;
  alreadyInitialized: boolean;
}

const buildInitialState = (
  taskId: string,
  branch: string,
  baseCommit: string,
  stepIds: string[],
): TaskState => {
  const now = new Date().toISOString();
  const steps: TaskState['steps'] = {};
  for (const id of stepIds) {
    steps[id] = { status: 'pending', artifacts: [] };
  }
  return {
    id: taskId,
    branch,
    updated_at: now,
    base_commit: baseCommit,
    steps,
  };
};

export const initializeRun = async (taskId: string, opts: RunOptions = {}): Promise<RunResult> => {
  const task = await loadTask(taskId);
  const existingState = await loadTaskState(taskId);
  if (existingState) {
    return { state: existingState, alreadyInitialized: true };
  }

  const branchInfo = await prepareAgentBranch(task.base, task.branch);
  const stepOrder = task.graph.map((step) => step.id);
  const state = buildInitialState(task.id, branchInfo.branch, branchInfo.baseCommit, stepOrder);
  await saveTaskState(state);

  return { state, alreadyInitialized: false };
};

export const updateStepState = async (
  taskId: string,
  stepId: string,
  patch: Partial<TaskStateStep>,
): Promise<TaskState> => {
  const state = await loadTaskState(taskId);
  if (!state) {
    throw new Error(`Task state for ${taskId} not initialized`);
  }
  const existing = state.steps[stepId];
  if (!existing) {
    throw new Error(`Step ${stepId} not found in task ${taskId}`);
  }

  const mergedArtifacts = new Set<string>(existing.artifacts ?? []);
  if (patch.artifacts) {
    for (const artifact of patch.artifacts) {
      if (artifact) {
        mergedArtifacts.add(artifact);
      }
    }
  }

  const merged: TaskStateStep = {
    ...existing,
    ...patch,
    artifacts: Array.from(mergedArtifacts),
  };

  state.steps[stepId] = merged;
  state.updated_at = new Date().toISOString();
  await saveTaskState(state);
  return state;
};
