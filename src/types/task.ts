export type TaskStepKind =
  | 'analyze'
  | 'edit'
  | 'shell'
  | 'test'
  | 'doc'
  | 'custom';

export interface TaskStepChange {
  path: string;
  mode?: 'create' | 'patch' | 'delete';
}

export interface TaskStepAssert {
  type: 'file_exists' | 'command_success' | 'custom';
  path?: string;
  command?: string;
  description?: string;
}

export interface TaskStepOnFail {
  strategy?: 'fix_and_retry' | 'revert_and_stop' | 'skip';
  max_cycles?: number;
}

export interface TaskStep {
  id: string;
  kind: TaskStepKind;
  goal: string;
  depends_on?: string[];
  timeout?: string;
  retries?: number;
  changes?: TaskStepChange[];
  cmd?: string;
  cwd?: string;
  framework?: string;
  args?: string[];
  assert?: TaskStepAssert[];
  allowlist?: string[];
  idempotent?: boolean;
  on_fail?: TaskStepOnFail;
  diff?: string;
  diffPath?: string;
}

export interface TaskPolicies {
  approvals: 'manual' | 'none';
  run_tests_after_each_step: boolean;
  allow_network: boolean;
  max_parallel: number;
  retries: number;
}

export interface TaskSuccessCriteria {
  require_green_tests: boolean;
  require_no_lint_errors: boolean;
  required_files: string[];
}

export interface TaskMetadata {
  spec_snapshot?: string;
  source_label?: string;
  spec_length?: number;
  change_hints?: string[];
}

export interface TaskFile {
  id: string;
  title: string;
  branch: string;
  base: string;
  model: string;
  created_at: string;
  policies: TaskPolicies;
  success: TaskSuccessCriteria;
  graph: TaskStep[];
  metadata?: TaskMetadata;
}

export interface TaskStateStep {
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  started_at?: string;
  ended_at?: string;
  error?: string;
  commit_sha?: string;
  note?: string;
  retries?: number;
  artifacts?: string[];
}

export interface TaskState {
  id: string;
  branch: string;
  base_commit?: string;
  updated_at: string;
  steps: Record<string, TaskStateStep>;
}
