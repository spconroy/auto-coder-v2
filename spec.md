# Auto-Coder v2 Implementation Checklist

Use this doc to track delivery of the autonomous, Ollama-backed coding agent. Check items off as they are implemented and verified. Requirements retain narrative context from the original spec while staying actionable.

---

## MVP Capability Checklist
- [ ] **Local-first model orchestration**
  - [ ] Register and switch between local Ollama models (`qwen2.5-coder`, `deepseek-coder`, `llama3.1-instruct`, etc.).
  - [ ] Support per-project defaults (model id, temperature, max tokens, tool-calling toggle) stored in configuration.
  - [ ] Provide automatic fallback sequence (e.g., 7B → 14B → 32B) with summarisation pipeline when contexts overflow limits.
  - [ ] Stream tokens with interactive cancel/abort controls and surface usage statistics.
  - [ ] Surface memory preset guidance (7B/14B/32B) so operators understand RAM/VRAM expectations.

- [ ] **Project-aware context service**
  - [ ] Build an incremental indexer that ignores large/binary paths such as `node_modules`, `.next`, and `dist`.
  - [ ] Maintain a local vector store (SQLite + FAISS/HNSW or equivalent) over file chunks and symbols.
  - [ ] Compose prompts blending top-K retrieved snippets, open files/selected ranges, recent diffs, README/CONTRIBUTING, and active task text.
  - [ ] Implement hierarchical summarisation and smart truncation to stay within token budgets.
  - [ ] Cache embeddings per file hash and refresh incrementally on save.

- [ ] **Editor & CLI surfaces**
  - [ ] Provide inline code actions and patch previews for GUI clients (VS Code extension parity).
  - [ ] Expose chat/task side panel listing retrieved context with click-to-open capability.
  - [ ] Offer keyboard-first workflow (`cmd/ctrl+enter`, quick “add file to context”).
  - [ ] Mirror the same capabilities in the CLI via prompts, plan display, and diff previews.

- [ ] **Local tool execution**
  - [ ] Sandbox shell commands behind allowlists and timeouts.
  - [ ] Provide git helpers (status, diff, branch, commit, stash, patch application with checks).
  - [ ] Provide package manager helpers (npm/pnpm/yarn/pip/poetry) with dry-run capability.
  - [ ] Implement test adapters (Jest, Vitest, PyTest, Go test) that stream logs back into prompts.

- [ ] **Task planning loop**
  - [ ] Implement deterministic Plan → Retrieve → Edit → Run → Verify → Summarize cycle.
  - [ ] Include guardrails for “show plan first” and “require approval before edits”.
  - [ ] Offer deterministic single-file edit mode for surgical fixes.

- [ ] **Local docs & knowledge base**
  - [ ] Index project docs (`docs/`, `OPENAPI.yaml`, API types).
  - [ ] Package “knowledge packs” for common frameworks (Next.js, Flask/FastAPI, Express, React, Django).
  - [ ] Retrieve framework recipes automatically when relevant.

- [ ] **Privacy & safety defaults**
  - [ ] Disallow outbound network calls until explicitly toggled.
  - [ ] Redact secrets (env vars, tokens, `.npmrc`, `.pypirc`) from prompts and logs.
  - [ ] Provide read-only mode toggle that blocks write tools.

## Core Tooling & Observability
- [ ] **Observability**
  - [ ] Log prompts, retrieved context, tool calls, patches, and shell commands.
  - [ ] Export session transcripts and patch bundles for reviews.
  - [ ] Persist `.coder/logs/<task>.jsonl` and `.coder/artifacts/<task>/<step>.diff` for replay.

- [ ] **Git discipline**
  - [ ] Always work on `agent/<task_id>-<slug>` branch off the configured base.
  - [ ] Create one commit per step with `task(stepX): ...` summary.
  - [ ] Default merge strategy: `git merge --squash` into base; support `--no-ff`.

- [ ] **Rollback & recovery**
  - [ ] On failure, revert step commits or reset branch cleanly.
  - [ ] Support `coder revert -t <task> --to-step <id>` and `coder clean`.

## Roadmap Enhancements
- [ ] Model-aware prompting for edit/explain/design-doc flows plus automatic error-driven retries.
- [ ] Static analysis + LSP diagnostics (ESLint, flake8, mypy, tsserver) and AST-aware chunking for precise retrieval.
- [ ] Test authoring + coverage loops that suggest suites for low-coverage modules.
- [ ] Spec-to-code scaffolding from Markdown/Jira into previewable patches.
- [ ] Configuration UI backed by `agent.config.json`.
- [ ] Multi-repo / monorepo awareness with cross-package symbol linking.

## Power-Up Differentiators
- [ ] Two-phase “trust but verify” patching (approve chunks, auto-rollback on failed checks).
- [ ] Benchmark-assisted “tight loop” mode for performance-sensitive code.
- [ ] Natural-language refactor plans with risk notes prior to execution.
- [ ] Offline knowledge packs shipped with stack-specific patterns.
- [ ] Pluggable policy guardrails (CWE, dependency allowlists, license checks).
- [ ] API/DB copiloting with read-only DB introspection and OpenAPI/GraphQL sampling.

## Architecture & Components
- [ ] Maintain clean separation between:
  - [ ] Thin editor/CLI clients (chat UI, apply-patch preview, toggles).
  - [ ] Local daemon exposing an Ollama client, context orchestrator, tool sandbox, patch engine, secrets redactor, and audit log.
- [ ] Provide WebSocket or RPC channel between clients and daemon.
- [ ] Expose the same daemon to the CLI for headless runs (shared code path).

## UX Heuristics
- [ ] Present plan card → patch card → checks card in that order.
- [ ] Display context pills (files/tests/diffs) with add/remove affordances.
- [ ] Provide toggles for shell, git writes, auto-test, and ask-before-edit.

## CLI UX & Commands
- [ ] Implement command set: `plan`, `show`, `run`, `resume`, `abort`, `diff`, `test`, `merge`, `revert`, `clean`, `config`.
- [ ] Support flags `--autonomous`, `--model`, `--temp`, `--max-tokens`, `--allow`, `--dry-run`.
- [ ] Stream progress per step and include diff previews before apply when approvals are enabled.
- [ ] Provide `coder logs -t <task> --follow` for live tailing.

## Task Planning & Execution Loop
- [ ] Generate plans from specs/prompts into `.coder/tasks/<task>.yaml`.
- [ ] Use MCP tool calls for all file edits (unified diffs only).
- [ ] Commit after each step; pause on conflicts and suggest 3-way merge guidance.
- [ ] Loop tests with `fix_and_retry` strategy that feeds logs into the model.
- [ ] Persist `.coder/state/<task>.json` with `pending|running|success|failed|skipped`, timings, retries, and commit SHAs.

## Autonomous Mode Requirements
- [ ] Accept DAG Taskfiles with success criteria, timeouts, retries, and idempotency hints.
- [ ] Provide `coder run --autonomous` with resume/stop options and checkpointing.
- [ ] Enforce max parallelism, wall-clock timeout, fail-fast, and merge-on-success flags.
- [ ] Evaluate global success (tests green, lint clean, required files present) before merging.
- [ ] Support per-step `on_fail` strategies: `fix_and_retry`, `revert_and_stop`, `skip`.

## Taskfile Schema
- [ ] Require core fields: `id`, `title`, `branch`, `base`, `model`, `policies`, `success`, `graph`.
- [ ] Support policy fields: approvals mode, run-tests-after-edit, allow_network, max_parallel, retries.
- [ ] Support success requirements: green tests, lint clean, required files list.
- [ ] Define step attributes (`id`, `kind`, `goal`, `depends_on`, `timeout`, `retries`, `changes`, `cmd`, `framework`, `args`, `assert`, `idempotent`).
- [ ] Validate DAG acyclicity and produce actionable errors.

## Configuration & Defaults
- [ ] Store defaults in `coder.config.json` (model, temperature, max tokens, allow_network, context ignore globs, retrieval `topK`, git base, merge mode, signing, tool allowlists, MCP endpoints).
- [ ] Provide CLI helper to edit/inspect config.
- [ ] Example baseline:
```json
{
  "model": "qwen2.5-coder:14b",
  "temperature": 0.2,
  "max_tokens": 2048,
  "allow_network": false,
  "context": {
    "ignore": ["**/node_modules/**", "**/.next/**", "**/dist/**"],
    "topK": 12
  },
  "tools": {
    "shell": { "allow": ["pnpm","npm","pytest","go","git"], "timeoutSec": 300 },
    "tests": { "autoDetect": true, "default": "pytest" }
  },
  "git": {
    "base": "main",
    "merge_mode": "squash",
    "sign_commits": false
  },
  "mcp": {
    "server": { "host": "127.0.0.1", "port": 3323 },
    "client": { "tool_allowlist": ["fs.*","git.*","shell.run","tests.run","project.search"] }
  }
}
```

## MCP Tooling
- [ ] Implement JSON-RPC 2.0 endpoints for `fs.read`, `fs.write`, `fs.apply_patch`, `fs.glob`, `git.status`, `git.commit`, `git.checkout`, `git.merge`, `git.revert`, `shell.run`, `tests.run`, `project.search`.
- [ ] Enforce path containment, allowlists, diff size caps, timeouts, and resource limits.
- [x] Run `fs.apply_patch` in dry-run mode before applying; reject `.env`/`secrets.*` and non-text diffs.
- [x] Record tool responses and errors to artifacts for audit.

## Prompt Surfaces & LLM Contract
- [ ] Provide planning prompt referencing repo map, diffs, package manifests, and available tools.
- [ ] Provide edit prompt that returns strict JSON `{"commit_msg":"...", "diff":"..."}` with unified diff scoped to the repo root.
- [ ] Provide fix-from-logs prompt for test/lint failures with minimal patches.
- [ ] Handle invalid diff/tool errors with corrective re-prompts and bounded retries.

## Security & Guardrails
- [ ] Deny network usage unless `allow_network` is true; block curl/wget by default.
- [ ] Enforce write policy: repo-only, forbid `.env`, `secrets.*`, and huge diffs (>2000 added lines in autonomous mode).
- [ ] Run `git apply --check` before mutating, then `git apply --index`.
- [ ] Redact secrets in logs and prompts.
- [ ] Provide explicit “what the agent will do” checklist prior to autonomous execution when approvals are enabled.

## Observability & Replay
- [x] Emit logs in structured format (JSON schema) with prompt tokens, tool durations, and exit codes.
- [x] Store artifacts in `.coder/artifacts/{task}/{step}` including diffs, logs, and transcripts.
- [ ] Tag successful merges as `coder/<task_id>`; document branch clean-up workflow.
- [ ] Support exporting session transcript + patch bundle for code reviews.

## Testing & Quality
- [ ] Add schema validation (AJV or similar) for all tool params and Taskfile structures.
- [ ] Unit test every tool handler and executor branch with deterministic mocks.
- [ ] Maintain golden contract tests for JSON-RPC request/response pairs.
- [ ] Provide end-to-end scenario covering plan → edit → test → merge using a sample repo.
- [ ] Achieve ≥90% statement coverage and enforce in CI.

## Implementation Aids
- [ ] Supply minimal CLI skeleton (Typer/Node) demonstrating branch creation, task loading, diff application, and commit loop.
- [ ] Provide autonomous executor skeleton with topological scheduling, checkpointing, and retry strategies.
- [ ] Example reference (Python Typer):
```python
@app.command()
def plan(i: str, model: str | None = None):
    cfg = load_config()
    task_id = new_task_id()
    branch = f"agent/{task_id}-task"
    base = cfg["git"]["base"]
    assert git(f"checkout {base}").returncode == 0
    assert git("pull --ff-only").returncode == 0
    assert git(f"checkout -b {branch}").returncode == 0
    spec = Path(i).read_text() if Path(i).is_file() else i
    tasks = orchestrate_plan(spec, model or cfg["model"])
    Path(".coder/tasks").mkdir(parents=True, exist_ok=True)
    Path(f".coder/tasks/{task_id}.yaml").write_text(yaml.safe_dump(tasks))
    typer.echo(task_id)
```

## Hand-off Checklist for Devs
- [ ] Implement method routers for `/tools/{namespace}.{method}`.
- [ ] Enforce policy guards (paths, allowlists, timeouts) across all tools.
- [x] Ensure executor sequences `fs.apply_patch (dry_run) → fs.apply_patch → git.commit`.
- [ ] Integrate Ollama client producing contract-compliant JSON responses.
- [x] Persist `.coder/state`, `.coder/logs`, and `.coder/artifacts` per task/step.
- [ ] Wire test runner to support `fix_and_retry` loop.
- [ ] Provide merge routine (default squash) and tag creation.
- [ ] Keep README/spec updates in sync with shipped behavior.
- [ ] Detect host hardware (CPU, RAM, GPU) during CLI startup and surface Ollama model recommendations (e.g., warn if >75% RAM would be used).
