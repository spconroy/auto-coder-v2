# Auto-Coder v2 Implementation Checklist

Use this checklist to track delivery of the local, Ollama-backed coding agent. Mark items complete as features are implemented.

## MVP Capability Checklist
- [ ] Provide **local-first model orchestration** on Ollama with:
  - [ ] Model registry & switching for `qwen2.5-coder`, `deepseek-coder`, `llama3.1-instruct`, etc.
  - [ ] Per-project defaults (model, temperature, max tokens, tool-calling toggle).
  - [ ] Automatic fallbacks (escalate from 7B to 14B/32B with summarisation).
  - [ ] Streaming token responses with cancel/abort support.
- [ ] Build **project-aware context**:
  - [ ] Incremental file indexer that skips large/binary paths (`node_modules`, build artifacts).
  - [ ] Local vector store (SQLite + FAISS/HNSW) over file chunks and symbols.
  - [ ] Context composer blending RAG results, open tabs/selected ranges, recent diffs, README/CONTRIBUTING, and active issue text with smart truncation.
- [ ] Deliver **deep editor (VS Code) integration**:
  - [ ] Inline code actions (insert, replace, apply patch with preview).
  - [ ] Side panel for chat, history, retrieved context list with click-to-open.
  - [ ] Command palette hooks (Explain/Refactor selection, Generate tests, Fix failing log, Write docstring, Create PR description).
  - [ ] Keyboard shortcut (`cmd/ctrl+enter`) and quick “Add file to context”.
- [ ] Support **local-only tool use**:
  - [ ] Sandboxed shell runner with allowlist.
  - [ ] Git helpers (status, diff, branch, commit, stash, patch with safety checks).
  - [ ] Package manager helpers (npm/pnpm/yarn/pip/poetry) with dry-run.
  - [ ] Test adapters (Jest, Vitest, PyTest, Go test) with log ingestion to prompts.
- [ ] Implement **task planning loop**: Plan → Retrieve → Edit → Run → Verify → Summarize, with optional “Show plan” and “Require approval before edits” guardrails plus deterministic single-file edit mode.
- [ ] Maintain **local docs & knowledge base** covering `docs/`, `OPENAPI.yaml`, API types, Postman/Insomnia exports, and framework recipes (Next.js, Flask/FastAPI, Express, React, Django).
- [ ] Provide **observability & replay**:
  - [ ] Log prompts, retrieved context, tool calls, patches, commands.
  - [ ] Export session transcript and patch bundle for reviewers.
- [ ] Enforce **privacy & safety defaults**:
  - [ ] No outbound network calls unless explicitly enabled.
  - [ ] Secrets redaction before prompting (env vars, tokens, `.npmrc`, `.pypirc`).
  - [ ] Read-only mode switch.

## Roadmap Enhancements
- [ ] Add **model-aware prompting** tuned for edit/explain/design-doc flows and automatic error-driven re-prompts.
- [ ] Integrate **static analysis + LSP** diagnostics (ESLint, flake8, mypy, tsserver) and AST-aware chunking.
- [ ] Deliver **test authoring & coverage loops** with prompts for low-coverage targets.
- [ ] Create **spec-to-code scaffolding** that converts Markdown/Jira specs into previewable patches.
- [ ] Provide **configuration UI** backed by `agent.config.json`.
- [ ] Support **multi-repo/monorepo awareness** with workspace detection and cross-package symbol linking.

## Power-Up Differentiators
- [ ] Ship two-phase “trust but verify” patching (propose diff + approval per chunk, auto-rollback on failed checks).
- [ ] Offer explainable retries with transparent reasoning logs.

## CLI & Workflow Checklist
- [ ] Implement `coder plan` command that:
  - [ ] Loads project config, generates unique task IDs, creates `agent/<task_id>-<slug>` branches from base, and persists `.coder/tasks/<task_id>.yaml`.
  - [ ] Streams plan YAML summarising steps (analyze/edit/shell/test/doc) with goals and file hints.
- [ ] Implement `coder run` command that:
  - [ ] Checks out task branch, iterates steps, applies diffs via MCP tools, stages and commits per step, and runs tests when scheduled.
  - [ ] Logs to `.coder/logs/<task_id>.jsonl` and updates `.coder/state/<task_id>.json`.
- [ ] Implement `coder merge` with default `--squash` to base and optional `--no-ff`.
- [ ] Provide `coder resume`, `coder stop`, `coder logs --follow`, and `coder revert --to-step <id>` commands.
- [ ] Follow git discipline: single-step commits prefixed `task(stepX): ...`; default branch base `main`.

## Autonomous Mode Checklist
- [ ] Accept Taskfiles (YAML/JSON) defining DAG steps with success criteria, timeouts, and retries.
- [ ] Run `coder run --autonomous` headlessly with checkpointing, idempotent steps, and agent branch isolation.
- [ ] Persist `.coder/state/<task_id>.json` for resume/stop flows and track `pending|running|success|failed|skipped`.
- [ ] Support global flags: `--max-parallel`, `--retries`, `--timeout`, `--fail-fast`, `--merge-on-success`.
- [ ] Enforce success gate: tests green, lint clean, required files present before merge.
- [ ] Implement per-step `on_fail` strategies (`fix_and_retry`, `revert_and_stop`, `skip`) with log capture and retry loops.
- [ ] Scheduler must topologically order steps, honour dependencies, and limit concurrency.
- [ ] Each edit/test step must write artifacts under `.coder/artifacts/{taskId}/{stepId}.*`.

## Taskfile Schema Checklist
- [ ] Require fields: `id`, `title`, `branch`, `base`, `model`, `policies`, `success`, `graph`.
- [ ] Enforce policies: approvals mode (`none|manual`), `run_tests_after_each_edit`, `allow_network`, `max_parallel`, `retries`.
- [ ] Support success criteria: `require_green_tests`, `require_no_lint_errors`, `required_files`.
- [ ] Define step shape with `id`, `kind`, `goal`, `depends_on`, `timeout`, `retries`, `changes`, `cmd`, `framework`, `args`, `assert`.
- [ ] Validate `idempotent` marker for shell steps and apply only when safe.

## Configuration Checklist (`coder.config.json`)
- [ ] Store defaults: `model`, `temperature`, `max_tokens`, `allow_network`.
- [ ] Configure context ignore globs and retrieval `topK`.
- [ ] Define tool allowlists (`shell`, `tests`) with timeout caps.
- [ ] Capture git defaults (base branch, merge mode, signing).
- [ ] Configure MCP server/client endpoints with tool allowlist.

## MCP Tooling Checklist
- [ ] Implement JSON-RPC tools:
  - [ ] `fs.read`, `fs.write`, `fs.apply_patch`, `fs.glob`.
  - [ ] `git.status`, `git.commit`, `git.checkout`, `git.revert`, `git.merge`.
  - [ ] `shell.run`.
  - [ ] `tests.run` with framework autodetect (`vitest`, etc.).
  - [ ] `project.search` or equivalent indexing helper.
- [ ] Guard each tool with path normalization, allowlists, timeouts, and resource limits.
- [ ] Enforce dry-run before applying patches and reject forbidden paths (`.env`, `secrets.*`).
- [ ] Record outputs and errors to artifacts for replay.

## Prompt & LLM Contract Checklist
- [ ] Provide planning, edit, and fix-on-fail prompt templates referencing retrieved files, diffs, and logs.
- [ ] Require edit/fix/doc responses in strict JSON:
  - [ ] One-line commit message (`<=72` chars, imperative).
  - [ ] Valid unified diff scoped to repo root; deny binary/secret files.
- [ ] Handle failure cases (invalid diff, tool error) with clear re-prompts.

## Safety & Guardrail Checklist
- [ ] Deny network calls unless configuration enables `allow_network`.
- [ ] Enforce write policy: only repo paths, forbid `.env`/secrets, cap diff size (e.g., ≤2000 added lines in autonomous mode).
- [ ] Apply `git apply --check` before mutating, then `git apply --index`.
- [ ] Ensure per-step rollback routines and clean branch lifecycle (`coder clean` optional).
- [ ] Redact secrets from logs and prompts.

## Testing & Quality Checklist
- [ ] Add AJV (or equivalent) validation for all JSON-RPC schemas.
- [ ] Unit test every tool handler and executor branch (mock shell/git).
- [ ] Contract-test request/response pairs (golden files).
- [ ] Build end-to-end scenario covering plan → edit → test → merge against sample repo.
- [ ] Target ≥90 % statement coverage and enforce via CI.

## Implementation Hand-Off Checklist
- [ ] Implement tool routers for `/tools/{namespace}.{method}`.
- [ ] Enforce policy guards (paths, allowlists, timeouts) across tools.
- [ ] Executor must:
  - [ ] Topologically sort DAG.
  - [ ] Run steps with retries/timeouts.
  - [ ] Sequence `fs.apply_patch (dry_run) → fs.apply_patch → git.commit`.
  - [ ] Call `tests.run` in test/doc flows and loop through `fix_and_retry`.
  - [ ] Persist `.coder/state` and `.coder/logs`.
- [ ] Integrate Ollama client producing contract-compliant JSON.
- [ ] Provide merge routine (default squash) and tagging (`coder/<task_id>`).
- [ ] Document any new config flags and keep README/spec synced.

