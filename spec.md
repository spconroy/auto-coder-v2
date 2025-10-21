Skip to content
Chat history

You said:
I need a coding agent similar to  Claude code but uses ollama for all the work. Tell me what features it needs to work well 
ChatGPT said:

Thought for 20s
Awesome—here’s a pragmatic, opinionated feature set for a Claude Code–style agent that runs entirely on Ollama. I’ve grouped things by “must-have” (ship in v1), “should-have” (next couple sprints), and “power-ups” (differentiators). I also outline a clean architecture that plays nicely with VS Code.

Must-have (MVP)
1) Local-first model orchestration (Ollama)

Model registry & switching (e.g., qwen2.5-coder, deepseek-coder, llama3.1-instruct).

Per-project defaults (model, temperature, max tokens, tool calling on/off).

Automatic fallbacks (if 7B fails context-wise, try 14B/32B with summarization).

Streaming tokens + cancel/abort.

2) Project-aware context

Fast, incremental code indexer (ignores node_modules, large binaries).

Local vector store (SQLite + FAISS/hnswlib) built from file chunks + symbols.

Context composer that blends:

Top-K relevant files/snippets (RAG),

Open tabs/selected ranges,

Recent diffs,

Project README/CONTRIBUTING,

Task issue text.

Smart truncation & hierarchical summaries to respect context limits.

3) Deep editor integration (VS Code)

Inline code actions (insert, replace, “apply patch” with preview).

Side panel for chat, thread history, retrieved context list (click to open file/line).

Commands: Explain selection, Refactor selection, Generate tests, Fix failing test log, Write docstring, Create PR description.

Keyboard-first: cmd/ctrl+enter to send; quick “Add file to context”.

4) Tool use (local only)

Sandboxed shell runner (with allowlist of commands).

Git tools: status/diff, branch, commit, stash, patch application with safety checks.

Package manager helpers (npm/pnpm/yarn/pip/poetry) with dry-run.

Test runner adapters (Jest, Vitest, PyTest, Go test) with log ingestion back into prompts.

5) Task planning & multi-step execution

Simple agent loop: Plan → Retrieve → Edit → Run → Verify → Summarize.

Guardrail: “Show plan” & “Require approval before edits” toggles.

Deterministic “single-file edit” mode for surgical changes.

6) Local docs & knowledge

Per-project docs vault: docs/, OPENAPI.yaml, /api types, Postman/Insomnia export.

Framework recipes out of the box (Next.js, Flask/FastAPI, Express, React, Django).

7) Observability & replay

Every action logged: prompts, files added to context, patches applied, commands run.

Exportable session transcript & patch bundle (handy for code reviews).

8) Privacy & safety

No network calls by default (hard off). Explicit toggles per project for any external fetch.

Secrets redaction before prompt stuffing (env, tokens, .npmrc, .pypirc).

“Read-only” mode switch.

Should-have (near-term)
9) Model-aware prompting

Role templates tuned for “edit/patch” vs “explain” vs “design doc”.

Automatic error-driven prompting: on compile/test failure, feed logs and ask the model to fix.

10) Static analysis + LSP taps

Surface diagnostics (ESLint, flake8, mypy, tsserver) directly into the agent’s context.

AST-aware chunking for more precise retrieval (symbols > raw text).

11) Test authoring & coverage loops

“Write tests for this module” (mocks, fixtures).

Coverage-driven prompts: identify low-coverage targets and propose tests.

12) Spec-to-code workflows

Paste an MD spec or JIRA ticket → auto scaffolding (files, routes, components, tests) → preview as a patch.

13) Configuration UI

Per-project agent.config.json to pin models, ignore globs, tool permissions, max concurrent edits.

14) Multi-repo / monorepo awareness

Workspaces, per-package context, cross-package symbol linking.

Power-ups (differentiators)
15) “Trust but verify” patching

Two-phase edit: agent proposes unified diff + rationale → you approve chunk-by-chunk.

Auto-rollback on failing post-checks (tests/linters).

16) Benchmarked “tight loops”

Micro-bench runner that compares before/after perf for hot functions (Go/Python/Node).

Latency budgets surfaced to the model for performance-safe refactors.

17) Natural-language refactor plans

Generate a Refactor Plan (bulleted steps, impacted files, risk notes), then execute stepwise with your approvals.

18) Knowledge packs (offline)

Locally shipped, cached “how-to” snippets for your stack (e.g., Next.js data fetching patterns, secure cookie handling, OAuth flows), retrieved like docs.

19) Policy guardrails

Pluggable rules (MITRE CWE checks, dependency allowlist, license compliance). Agent refuses changes that violate rules, and suggests compliant alternatives.

20) API/DB copiloting

Connect to a dev database (read-only) to infer schemas and generate safe queries + migrations (with migration approval gates).

OpenAPI/GraphQL schema introspection → sample calls + client code.

Clean local architecture
[VS Code Extension]
  ├─ Chat/Task UI, inline code actions
  ├─ “Apply Patch” preview
  └─ WebSocket to Local Daemon (localhost)

[Local Daemon] (FastAPI/Node)
  ├─ Ollama Client (streaming)
  ├─ Context Orchestrator
  │   ├─ File system walker + incremental indexer
  │   ├─ Embeddings via Ollama (or local sentence-transformer)
  │   └─ Ranker (BM25 + vector fusion)
  ├─ Tool Sandbox
  │   ├─ Shell runner (allowlist, time/mem quotas)
  │   ├─ Git adapter
  │   ├─ Test adapters
  │   └─ Lint/Type adapters
  ├─ Patch Engine (AST-aware when possible)
  ├─ Secrets Redactor (patterns + .env loader)
  └─ Audit Log (SQLite + JSONL transcripts)
Why this split?

The extension stays thin and safe; all heavy lifting is local to the daemon.

You can later expose a CLI that uses the same daemon for headless runs (CI or TUI).

UX that feels like Claude Code
One box, many modes: “Chat”, “Edit Selection”, “Fix Tests”, “Implement Ticket”.

Context pills (files, tests, diffs) shown above the input—click to remove/add.

Plan card first, Patch card second, Checks card third. Clear, linear flow.

Toggles: Allow shell, Allow git writes, Auto-run tests, Ask before edit.

Performance notes (Ollama reality)
Provide a memory preset slider (7B ↔ 14B ↔ 32B) with hints about RAM/VRAM.

Use embedding models with tiny footprint (e.g., nomic-embed-text or similar) for retrieval; they’re fast.

Cache embeddings per file hash; update incrementally on save.

Chunk smartly (AST nodes, 300–800 tokens) + hybrid retrieval (BM25 + vector).

Security & privacy
Default air-gapped: no outbound HTTP.

Explicit per-project allowlist for running commands and touching directories.

Redact secrets from prompts and logs; never store raw .env or tokens.

Clear “what the agent will do” checklist before executing (esp. shell & git).

Configuration surface (example)
{
  "model": "qwen2.5-coder:14b",
  "temperature": 0.2,
  "max_tokens": 2048,
  "tools": {
    "shell": { "enabled": true, "allow": ["npm", "pnpm", "pytest", "go", "git"] },
    "git": { "enabled": true, "branch": "agent/auto" },
    "tests": { "autoRun": true, "framework": "pytest" }
  },
  "context": {
    "ignore": ["**/dist/**", "**/.next/**", "**/node_modules/**"],
    "topK": 12,
    "includeOpenTabs": true
  },
  "privacy": { "network": "off", "redactSecrets": true }
}
Minimal v1 checklist
 VS Code extension with chat + apply-patch preview

 Local daemon (FastAPI/Node) with Ollama streaming

 Indexer + embeddings + hybrid retrieval

 Shell (allowlisted), Git (diff/apply), Test runner adapters

 Context composer (open files, retrieved files, diffs)

 Plan → Patch → Verify loop with approvals

 Logs/transcripts export

First upgrades to tackle
 LSP + ESLint/mypy integration into context

 Test generation & coverage prompts

 Spec-to-scaffold flow

 AST-aware patching for JS/TS & Python

If you want, I can sketch a concrete repo structure (daemon + VS Code extension) and the exact prompts for each mode (implement, refactor, fix tests) tuned for qwen2.5-coder on Ollama.

You said:
I just care about cli right now. It needs to support mcp it needs to build task lists. I'd like it to use git branches so it can revert if needed. Then merge back to main when done
ChatGPT said:

Thought for 13s
Got it — CLI-only, MCP-compatible, task-list driven, and git-safe (branch → work → merge → revert if needed). Here’s a tight blueprint plus a runnable skeleton you can extend.

Goals
Local-first with Ollama (no network by default).

MCP support so the model can call tools (read/write files, run tests, git ops).

Task lists: the agent generates and executes a checklist; you can approve/skip steps.

Git safety: every run happens on a temp branch; auto-commit per step; fast rollback; clean merge back to main.

CLI UX (commands)
coder plan   -i spec.md        # create a task plan from a spec or prompt
coder show   -t <task_id>      # view plan, steps, status, branch
coder run    -t <task_id>      # execute steps with approvals (optional --auto)
coder resume -t <task_id>      # continue a paused/failed run
coder abort  -t <task_id>      # stop, leave branch in place
coder diff   -t <task_id>      # show accumulated diff
coder test   -t <task_id>      # run tests (framework autodetect)
coder merge  -t <task_id>      # merge agent branch → main (squash by default)
coder revert -t <task_id>      # rollback last committed step(s) on agent branch
coder clean  -t <task_id>      # clean temp artifacts; optional branch delete
coder config                     # open/edit config (models, policies, globs)
Common flags

--auto: don’t prompt for approvals between steps

--model qwen2.5-coder:14b / --temp 0.2 / --max-tokens 2048

--allow shell,git,tests (tool allowlist)

--dry-run (plan only, no writes)

Flow (under the hood)
Plan

Reads input (file or prompt).

Builds a task list YAML (DAG) with steps like: analyze, scaffold, edit files, install deps, run tests, fix tests, doc updates.

Saves to .coder/tasks/<task_id>.yaml

Creates a branch: agent/<task_id>-<slug> (from main or current).

Execute

For each step:

Construct prompt context (spec, recent diffs, top-K relevant files, open tickets).

Use MCP tools to read/write files via patch application, not blind overwrite.

Commit after each step with message task(step#): summary.

Optionally run linters/tests; on failure, the model proposes a fix step (or pause for approval).

Persist artifact log: prompts, retrieved context, commands run, exit codes.

Merge

On success, git merge --squash (default) or --ff-only if clean.

Tag release coder/<task_id>; close task.

Revert

If a step broke things, coder revert triggers git revert for last commit(s) on the agent branch or drops the branch.

MCP Integration (model + tools)
Why MCP? Lets the model call tools in a standardized way. You’ll run:

MCP Server in your daemon exposing tools:

fs.read(path), fs.apply_patch(unified_diff), fs.glob(pattern)

shell.run(cmd, timeout, cwd)

git.status(), git.diff(), git.commit(msg), git.checkout(branch), git.merge(target, mode)

tests.run(framework?, args?)

project.search(query, top_k) (hybrid BM25+embeddings for retrieval)

MCP Client for the Ollama LLM: your agent prompts the model and allows tool calls; the daemon executes tool calls and streams results back.

Minimum contracts

Tool calls are idempotent and dry-run capable where possible (apply_patch(dry_run=true)).

File writes only via unified diffs to enable preview & conflict detection.

Tool responses are trimmed and summarized to reduce token load.

Task List Format (YAML)
id: T-20251021-001
title: "Add endpoint /api/health and unit tests"
branch: "agent/T-20251021-001-health"
created_at: "2025-10-21T10:30:00-07:00"
model: "qwen2.5-coder:14b"
policies:
  approvals: manual         # manual | auto
  run_tests_after_each_step: true
steps:
  - id: s1
    kind: analyze
    goal: "Understand current routing and test setup"
  - id: s2
    kind: edit
    goal: "Create /api/health endpoint"
    changes:
      - path: "api/health.ts"
        mode: create
  - id: s3
    kind: edit
    goal: "Add tests"
    changes:
      - path: "tests/health.test.ts"
        mode: create
  - id: s4
    kind: shell
    goal: "Install test deps if needed"
    cmd: "pnpm i -D vitest supertest"
  - id: s5
    kind: test
    goal: "Run tests"
    framework: "vitest"
  - id: s6
    kind: doc
    goal: "Update README"
    changes:
      - path: "README.md"
        mode: patch
Agent keeps a .state file tracking pending/running/success/failed/skipped and commit SHAs per step.

Git Discipline
Branching: agent/<task_id>-<slug>

Commits: one per step (or sub-step), conventional prefix task(stepX): …

Merge:

Default: --squash into main

Optional: --no-ff with merge commit

Conflicts:

If apply_patch fails, the agent:

Refreshes index, regenerates patch with finer chunks,

If still failing, pauses & prints a 3-way merge suggestion.

Rollback:

coder revert -t T… --to-step s3 → git revert <sha_of_s4..sN> on agent branch

Or coder clean to delete branch if not merged.

Config (project-local, coder.config.json)
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
Prompt Surfaces (concise)
Planning prompt

You are a local coding agent. Task: {user_goal}.
Scan repo structure (summarized), recent diffs, package.json, test config.
Output a YAML task list (DAG) with clear steps: analyze, edits (file paths), shell cmds, tests, docs.
Keep steps small and reversible. Assume MCP tools: fs.read, fs.apply_patch(unified_diff), shell.run, tests.run, git.*
Edit step prompt

Implement step {step_id}: {goal}.
Only modify listed files or create new ones if necessary.
Return a unified diff with minimal changes, plus a one-line commit message.
Context includes: {retrieved_snippets}, {errors_from_previous_test?}
Fix-on-fail prompt

Tests/logs indicate failures: {logs}.
Generate the smallest patch to fix failures. Provide diff and short commit message.
Minimal Python Skeleton (Typer + subprocess + YAML)
You can start with this and swap in your preferred libs (e.g., GitPython).

# cli/main.py
import subprocess, uuid, json, yaml, os, sys
import typer
from datetime import datetime

app = typer.Typer()

def sh(cmd, cwd=None):
    return subprocess.run(cmd, shell=True, cwd=cwd, capture_output=True, text=True)

def git(cmd): return sh(f"git {cmd}")

def load_config():
    with open("coder.config.json") as f: return json.load(f)

def new_task_id():
    return f"T-{datetime.now().strftime('%Y%m%d-%H%M%S')}-{uuid.uuid4().hex[:6]}"

@app.command()
def plan(i: str = typer.Option(..., help="Spec file or prompt text"),
         model: str = None):
    cfg = load_config()
    task_id = new_task_id()
    branch = f"agent/{task_id}-task"
    base = cfg["git"]["base"]

    # create branch
    assert git(f"checkout {base}").returncode == 0, "checkout base failed"
    assert git(f"pull --ff-only").returncode == 0, "pull failed"
    assert git(f"checkout -b {branch}").returncode == 0, "branch create failed"

    # get spec
    spec = i if os.path.isfile(i) else i
    if os.path.isfile(i):
        with open(i) as f: spec = f.read()

    # call local daemon (your MCP+Ollama orchestrator) to produce tasks
    # Here we stub a tiny plan:
    tasks = {
        "id": task_id,
        "title": "Stub plan",
        "branch": branch,
        "created_at": datetime.now().isoformat(),
        "model": model or cfg["model"],
        "policies": {"approvals": "manual", "run_tests_after_each_step": True},
        "steps": [
            {"id": "s1", "kind": "analyze", "goal": "Understand project"},
            {"id": "s2", "kind": "edit", "goal": "Create /api/health", "changes":[{"path":"api/health.ts","mode":"create"}]},
            {"id": "s3", "kind": "test", "goal": "Run tests", "framework":"vitest"}
        ]
    }
    os.makedirs(".coder/tasks", exist_ok=True)
    with open(f".coder/tasks/{task_id}.yaml","w") as f: yaml.safe_dump(tasks, f)
    typer.echo(task_id)

@app.command()
def run(t: str, auto: bool = False):
    # load task
    with open(f".coder/tasks/{t}.yaml") as f: task = yaml.safe_load(f)
    # ensure branch
    assert git(f"checkout {task['branch']}").returncode == 0, "branch missing"

    # loop steps (stub: you’ll call daemon to talk to model, apply diffs via MCP)
    for step in task["steps"]:
        typer.echo(f"→ {step['id']} {step['kind']}: {step['goal']}")
        if step["kind"] == "edit":
            # Example: apply a dummy patch
            diff = """--- /dev/null
+++ b/api/health.ts
@@
+export default function handler(req, res) { res.status(200).json({ ok: true }); }
"""
            r = sh(f"git apply --index - << 'PATCH'\n{diff}\nPATCH")
            if r.returncode != 0:
                typer.echo(r.stderr); raise SystemExit(1)
            git(f"commit -m 'task({step['id']}): add health endpoint'")

        if step["kind"] == "test":
            r = sh("pnpm test")
            typer.echo(r.stdout)
            if r.returncode != 0:
                typer.echo("Tests failed. Pausing."); raise SystemExit(1)

    typer.echo("Run complete.")

@app.command()
def merge(t: str, mode: str = "squash"):
    with open(f".coder/tasks/{t}.yaml") as f: task = yaml.safe_load(f)
    branch = task["branch"]
    base = load_config()["git"]["base"]
    assert git(f"checkout {base}").returncode == 0
    git("pull --ff-only")
    if mode == "squash":
        assert git(f"merge --squash {branch}").returncode == 0
        git(f"commit -m 'merge {branch} via coder'")
    else:
        assert git(f"merge --no-ff {branch}").returncode == 0
    typer.echo("Merged to main.")

if __name__ == "__main__":
    app()
The real implementation wires plan/run to your local daemon that:

Hosts the MCP server (tools listed above),

Acts as an MCP client to the Ollama-backed model,

Orchestrates prompts → tool calls → patches → commits.

Daemon Outline (FastAPI or Node)
/llm/complete: stream completions via Ollama

/mcp:

POST /tools/<name> executes tool

POST /apply_patch validates & applies unified diffs (with --check first)

/tasks: CRUD for task YAML + state

Indexing: background file index; hybrid search (BM25 + local embeddings)

Safety Rails & Defaults
No network; block shell.run for curl/wget unless allow_network=true.

Write path policy: edits only under repo root, deny .env, secrets.*.

Patch preview: coder diff shows per-step changes; --approve to continue.

Auto-tests after each edit when enabled.

What you’ll get from this design
Repeatable, auditable runs (task YAML + step commits + logs).

Easy reverts (per-step commits) and clean merges back to main.

MCP lets you grow tool capability without re-prompting gymnastics.

Works great with Ollama fully offline.

If you want, I can expand the daemon’s MCP server skeleton (Python FastAPI) with concrete tool handlers for fs.apply_patch, git.commit, and tests.run, plus the exact planning/edit prompts tuned for qwen2.5-coder:14b.

You said:
Needs to support full autonomous mode where you pass in a task list and it will iterate through the entire thing 
ChatGPT said:
Perfect — here’s how to add a fully autonomous mode so your CLI can take a task list and run the whole thing end-to-end with zero human approvals, while staying safe (git branch, step commits, revert on failure), MCP-toolable, and resume-able.

What “Autonomous Mode” means (exactly)
Input: a Taskfile (YAML/JSON) that defines a DAG of steps (analyze/edit/shell/test/doc/custom), success criteria, timeouts, and retry policy.

Execution: agent iterates the graph in topological order, letting the model plan & call MCP tools per step, with no prompts to the user.

Safety: work happens on an agent/<task-id> branch; each step makes at most one commit; auto-rollback on failing post-checks; auto-merge to main when all success criteria pass.

Idempotency: steps declare idempotent behavior (e.g., “patch only if diff applies cleanly”, “skip if file exists and matches hash”).

Checkpointing: a .state file records step state (pending|running|success|failed|skipped) and SHAs so you can resume reliably.

CLI ergonomics
coder run --autonomous -t <task_id>             # run entire plan headlessly
coder run --autonomous -f tasks/add-endpoint.yaml
coder resume -t <task_id>                        # continue after crash/reboot
coder stop -t <task_id>                          # graceful stop (write checkpoint)
coder merge -t <task_id> --if-green              # only if all success criteria met
coder revert -t <task_id> --to-step s3           # undo commits after s3 on agent branch
coder logs  -t <task_id> --follow                # stream agent logs
Useful flags:

--max-parallel 1 (DAG parallelism; default 1 for safety)

--retries 2 (global cap; per-step can override)

--timeout 30m (global wall clock)

--fail-fast (stop on first failure)

--merge-on-success (auto merge at the end)

Taskfile schema (autonomous-ready)
id: T-20251021-042
title: "Implement /api/health + tests + docs"
branch: "agent/T-20251021-042-health"
base: "main"
model: "qwen2.5-coder:14b"
policies:
  approvals: none                 # none | manual
  run_tests_after_each_edit: true
  allow_network: false
  max_parallel: 1
  retries: 2
success:
  require_green_tests: true
  require_no_lint_errors: true
  required_files:
    - api/health.ts
    - tests/health.test.ts
graph:
  - id: s1
    kind: analyze                 # model reasons, sets sub-goals (no writes)
    goal: "Understand routing & tests"
    depends_on: []
    timeout: 2m

  - id: s2
    kind: edit                    # model returns unified diff; MCP fs.apply_patch
    goal: "Create /api/health endpoint"
    changes:
      - path: "api/health.ts"     # hint; not enforced if diff targets others
    depends_on: [s1]
    retries: 2
    timeout: 5m
    assert:                       # success criteria for this step
      - type: file_exists
        path: api/health.ts

  - id: s3
    kind: edit
    goal: "Add tests for /api/health"
    changes:
      - path: "tests/health.test.ts"
    depends_on: [s2]
    timeout: 5m

  - id: s4
    kind: shell                   # still executed via MCP tool sandbox
    goal: "Install test deps if needed"
    cmd: "pnpm i -D vitest supertest"
    cwd: "."
    allowlist: ["pnpm"]
    depends_on: [s2, s3]
    timeout: 10m
    idempotent: true

  - id: s5
    kind: test
    goal: "Run all tests"
    framework: "vitest"           # or autodetect
    args: ["--run"]
    depends_on: [s4]
    retries: 1
    timeout: 10m
    on_fail:
      strategy: fix_and_retry     # see failure strategies below
      max_cycles: 2               # loop: analyze logs → patch → re-run tests

  - id: s6
    kind: doc
    goal: "Add README section"
    changes:
      - path: "README.md"
        mode: patch
    depends_on: [s5]
    timeout: 3m
Failure strategies (autonomous-safe)
on_fail.strategy: fix_and_retry
Loop per cycle:

Capture failing logs (build/test/lint).

Prompt model: “minimal patch to fix”.

Apply patch (dry-run first), commit, re-run check.

Stop when green or max_cycles reached.

on_fail.strategy: revert_and_stop
Revert last step commit(s) on agent branch and mark task failed.

on_fail.strategy: skip
Mark step skipped if non-critical; continue successors that don’t require it.

Autonomous executor — core algorithm
Init

Create/checkout branch from base (pull fast-forward).

Persist .coder/tasks/<id>.yaml and .coder/state/<id>.json.

Start MCP server (tools: fs.read, fs.apply_patch, fs.glob, shell.run, git.*, tests.run, lint.run, project.search).

Topological scheduler

Build DAG, pick ready steps whose depends_on are success or skipped (if allowed).

Honor max_parallel; usually run 1 at a time for determinism.

Per-step loop

Compose prompt context: spec, repo map, relevant files (BM25+embeddings), last diffs, last errors.

Send to Ollama; allow tool calls (MCP).

Enforce write policy: file edits must come as unified diffs; apply with git apply --check, then git apply --index. Deny writes outside repo; redact secrets.

Atomic commit per step: task(stepX): ... (sign optional).

If step kind is test/lint, collect logs; if failing and strategy is fix_and_retry, iterate the cycle.

Checkpoint

After each step, write state: step status, commit SHA, timings, retries, artifacts links.

Finish

Evaluate global success (tests green, lint clean, required files present).

If green and --merge-on-success, merge:

Default git merge --squash agent/… → single commit on main

Tag coder/<task_id>; optionally delete agent branch.

Minimal Python skeleton for autonomous executor
(Uses Typer; swap in your actual MCP+Ollama calls where noted.)

# cli/auto.py
import os, json, time, subprocess, yaml, signal
from pathlib import Path
import typer
from collections import defaultdict, deque
from datetime import datetime

app = typer.Typer()

def sh(cmd, cwd=None):
    return subprocess.run(cmd, shell=True, cwd=cwd, capture_output=True, text=True)

def git(cmd): return sh(f"git {cmd}")

def topological_order(steps):
    deps = {s["id"]: set(s.get("depends_on", [])) for s in steps}
    rdeps = defaultdict(list)
    for s in steps:
        for d in s.get("depends_on", []):
            rdeps[d].append(s["id"])
    q = deque([sid for sid, ds in deps.items() if not ds])
    order = []
    while q:
        sid = q.popleft()
        order.append(sid)
        for nxt in rdeps[sid]:
            deps[nxt].discard(sid)
            if not deps[nxt]:
                q.append(nxt)
    if len(order) != len(steps): raise RuntimeError("Cyclic graph")
    return order

def save_state(state_path, state):
    state["updated_at"] = datetime.now().isoformat()
    Path(state_path).parent.mkdir(parents=True, exist_ok=True)
    Path(state_path).write_text(json.dumps(state, indent=2))

def load_task(task_path):
    with open(task_path) as f: return yaml.safe_load(f)

def apply_unified_diff(diff_text):
    # dry run
    check = sh("git apply --check -", cwd=".",)
    if check.returncode != 0:
        check = subprocess.run("git apply --check -", shell=True, input=diff_text,
                               text=True, capture_output=True)
        if check.returncode != 0:
            return False, check.stderr
    # apply + stage
    apply = subprocess.run("git apply --index -", shell=True, input=diff_text,
                           text=True, capture_output=True)
    if apply.returncode != 0:
        return False, apply.stderr
    return True, ""

def commit(msg):
    r = git(f"commit -m \"{msg}\"")
    return r.returncode == 0, r.stderr

def run_tests(framework=None, args=None):
    cmd = "pnpm vitest --run" if framework == "vitest" else "pytest -q"
    if args: cmd = " ".join([cmd] + args)
    r = sh(cmd)
    return r.returncode == 0, r.stdout + r.stderr

# ---- Replace these with your Ollama+MCP orchestrations ----
def model_plan_step(step, context):
    """Return dict with maybe 'diff', 'commit_msg', 'shell_cmd', etc."""
    # Call local daemon -> LLM with tools. For demo, return step passthrough.
    return {}

def model_fix_from_logs(logs):
    """Return minimal diff + commit message to fix failing tests/lints."""
    return {"diff": "", "commit_msg": "fix: adjust code (stub)"}
# -----------------------------------------------------------

@app.command()
def run(task: str = typer.Option(..., "-f"), autonomous: bool = True,
        merge_on_success: bool = False):
    t = load_task(task)
    state_path = f".coder/state/{t['id']}.json"

    # prepare branch
    base = t.get("base","main")
    branch = t["branch"]
    assert git(f"checkout {base}").returncode == 0, "checkout base failed"
    assert git("pull --ff-only").returncode == 0, "pull failed"
    assert git(f"checkout -B {branch}").returncode == 0, "branch create/switch failed"

    steps = {s["id"]: s for s in t["graph"]}
    order = topological_order(t["graph"])

    # init state
    state = {"id": t["id"], "branch": branch, "steps": {sid: {"status":"pending"} for sid in order}}
    save_state(state_path, state)

    stop_flag = False
    def handle_sigint(sig, frame):
        nonlocal stop_flag
        stop_flag = True
    signal.signal(signal.SIGINT, handle_sigint)

    for sid in order:
        if stop_flag: break
        s = steps[sid]
        state["steps"][sid] = {"status": "running", "started_at": datetime.now().isoformat()}
        save_state(state_path, state)

        # Build context (spec, repo map, last diffs, etc.) for the model
        ctx = {}  # fill with your orchestrator

        ok = True
        msg = ""
        try:
            if s["kind"] in ("analyze", "doc"):
                _ = model_plan_step(s, ctx)
                # if doc needs diff, handle same as edit
                if "diff" in _ and _.get("diff"):
                    ok, err = apply_unified_diff(_["diff"])
                    if not ok: raise RuntimeError(err)
                    ok, err = commit(_["commit_msg"])
                    if not ok: raise RuntimeError(err)

            elif s["kind"] == "edit":
                out = model_plan_step(s, ctx)  # expect unified diff + commit msg
                diff = out.get("diff","")
                cmsg = out.get("commit_msg", f"task({sid}): apply edits")
                if not diff: raise RuntimeError("model returned no diff")
                ok, err = apply_unified_diff(diff)
                if not ok: raise RuntimeError(err)
                ok, err = commit(cmsg)
                if not ok: raise RuntimeError(err)

            elif s["kind"] == "shell":
                cmd = s["cmd"]
                r = sh(cmd, cwd=s.get("cwd","."))
                if r.returncode != 0:
                    raise RuntimeError(r.stdout + r.stderr)

            elif s["kind"] == "test":
                ok, logs = run_tests(s.get("framework"), s.get("args"))
                if not ok:
                    strat = s.get("on_fail",{}).get("strategy","revert_and_stop")
                    if strat == "fix_and_retry":
                        cycles = 0
                        while not ok and cycles < s.get("on_fail",{}).get("max_cycles",1):
                            fix = model_fix_from_logs(logs)
                            if not fix.get("diff"):
                                break
                            aok, err = apply_unified_diff(fix["diff"])
                            if not aok: raise RuntimeError(err)
                            cok, cerr = commit(fix.get("commit_msg","fix: minimal change"))
                            if not cok: raise RuntimeError(cerr)
                            ok, logs = run_tests(s.get("framework"), s.get("args"))
                            cycles += 1
                        if not ok:
                            raise RuntimeError("tests still failing after fix cycles")
                    else:
                        raise RuntimeError("tests failing")
        except Exception as e:
            ok = False
            msg = str(e)

        state["steps"][sid]["status"] = "success" if ok else "failed"
        state["steps"][sid]["ended_at"] = datetime.now().isoformat()
        if not ok:
            state["steps"][sid]["error"] = msg
            save_state(state_path, state)
            typer.echo(f"Step {sid} failed: {msg}")

            # revert policy: revert last commit on branch for this step
            git("reset --hard")  # drop staged changes
            # optional: git revert HEAD -n; leave commit history intact
            break

        save_state(state_path, state)

    # Global success check (simplified)
    all_ok = all(v["status"]=="success" for v in state["steps"].values())
    if all_ok and merge_on_success:
        assert git(f"checkout {base}").returncode == 0
        git("pull --ff-only")
        assert git(f"merge --squash {branch}").returncode == 0
        git(f"commit -m 'merge {branch} via coder'")
        typer.echo("Merged to main.")
    else:
        typer.echo(f"Done. success={all_ok}. Branch left at {branch}.")
Wire model_plan_step and model_fix_from_logs to your Ollama+MCP daemon. The daemon should enforce: file writes only via unified diffs, deny paths outside repo, redact secrets, and summarize tool outputs.

Prompts for autonomous mode (concise & reliable)
Edit step (produce diff + commit message)

You are a local coding agent using MCP tools (fs.read, fs.apply_patch, git.*, tests.run).
Goal: {goal}
Constraints:
- Only return a unified diff for necessary changes (minimal patch).
- Keep edits small and reversible.
- Include a one-line commit message.
Context:
{repo_map}
{relevant_snippets}
{recent_errors_if_any}
Output JSON:
{"commit_msg":"...", "diff":"--- a/file\n+++ b/file\n@@ ..."}
Fix-from-logs

Tests failed with logs:
{logs}
Provide the smallest possible patch to make tests pass without changing public API unless required.
Return JSON with {"commit_msg":"...", "diff":"..."}.
Observability (for headless runs)
Logs: JSONL stream per step (prompt tokens, tool calls, exit codes, timings).

Artifacts: save patches as files under .coder/artifacts/<id>/<sid>.diff.

State: .coder/state/<id>.json as the single source of truth; coder resume looks here.

Security defaults
allow_network: false by default; block shell.run for curl/wget unless enabled.

Deny writes to .env, secrets.*, and outside the repo root.

Always git apply --check before applying diffs; bail on conflicts.

Timeouts & CPU/mem limits on shell.run via the MCP server.

Example: end-to-end autonomous run
coder run --autonomous -f tasks/add-health.yaml --merge-on-success
# → creates agent/T-… branch
# → s1 analyze (no writes)
# → s2 edit (diff → commit)
# → s3 edit (diff → commit)
# → s4 shell (install deps)
# → s5 test (if fail → fix_and_retry cycles)
# → s6 doc (diff → commit)
# → global checks → squash merge to main → tag
That’s it. Drop this executor in, wire your MCP+Ollama daemon into the two stubbed functions, and you’ve got a hands-off mode that is auditable, reversible, and safe to use on real repos. If you want, I can flesh out the FastAPI MCP server with concrete tool handlers and the exact JSON tool schemas it will expose.

You said:
Most of these tools you install using npm. Maybe I should do that
ChatGPT said:
Yes — that’s actually the right move.
If you’re planning to build this autonomous coding agent CLI with full MCP + Ollama integration, you’ll want to structure it as an npm package so you can:

Distribute it easily (e.g., npm install -g coder-agent)

Bundle CLI + daemon + MCP server together

Use Node’s async I/O for spawning Ollama, running git/shell commands, and streaming completions efficiently

✅ Recommended Stack
Layer	Tech	Purpose
CLI	Commander.js or Yargs	Argument parsing and subcommands
Daemon / MCP	Fastify or Express	Serves MCP-compatible JSON RPC tools
Shell & Git	simple-git, execa, zx	Safe subprocess control
LLM bridge	ollama-js (official Ollama API client)	Local model completions
Storage	lowdb or sqlite3	Task state and logs
Config	cosmiconfig	Load coder.config.json automatically
YAML parsing	yaml	Task definition parsing
Diff handling	diff, simple-git, or git apply via shell	Apply/revert patches
Text streaming	eventsource-parser	Stream token updates cleanly
📦 Package Structure
coder-agent/
├── package.json
├── bin/
│   └── coder.js            # CLI entry (#!/usr/bin/env node)
├── src/
│   ├── cli/
│   │   ├── index.ts
│   │   ├── commands/
│   │   │   ├── plan.ts
│   │   │   ├── run.ts
│   │   │   ├── merge.ts
│   │   │   └── revert.ts
│   ├── daemon/
│   │   ├── index.ts        # MCP server (Fastify JSON-RPC)
│   │   └── tools/
│   │       ├── fs.ts
│   │       ├── git.ts
│   │       ├── shell.ts
│   │       ├── tests.ts
│   │       └── project.ts
│   ├── llm/
│   │   └── ollama-client.ts
│   ├── core/
│   │   ├── executor.ts     # Runs task DAG autonomously
│   │   ├── planner.ts
│   │   └── state.ts
│   └── utils/
│       ├── log.ts
│       ├── config.ts
│       └── yaml.ts
├── coder.config.json
├── tasks/
│   └── sample.yaml
└── README.md
🧠 npm Script Workflow
{
  "name": "coder-agent",
  "version": "0.1.0",
  "bin": {
    "coder": "./bin/coder.js"
  },
  "scripts": {
    "dev": "tsx src/cli/index.ts",
    "start": "node bin/coder.js",
    "daemon": "tsx src/daemon/index.ts",
    "build": "tsup src/cli/index.ts --format esm,cjs --dts",
    "test": "vitest"
  },
  "dependencies": {
    "commander": "^12.0.0",
    "ollama": "^0.5.4",
    "simple-git": "^3.20.0",
    "yaml": "^2.4.2",
    "execa": "^9.0.0",
    "fastify": "^4.27.0",
    "lowdb": "^7.1.0",
    "chalk": "^5.3.0"
  }
}
Then install dependencies:

npm install commander ollama simple-git yaml execa fastify lowdb chalk
⚙️ Example CLI Command Definition (src/cli/index.ts)
import { Command } from 'commander';
import { runTask } from '../core/executor.js';
import { planTask } from '../core/planner.js';
const program = new Command();

program
  .name('coder')
  .description('Local autonomous coding agent powered by Ollama + MCP');

program
  .command('plan')
  .argument('<spec>', 'Spec file or prompt text')
  .action(planTask);

program
  .command('run')
  .option('--autonomous', 'Run full task list with no approvals')
  .option('-f, --file <path>', 'Path to task list YAML')
  .action(async (opts) => {
    await runTask(opts.file, { autonomous: opts.autonomous });
  });

program.parse();
⚙️ MCP Tool Registration (src/daemon/tools/git.ts)
import { execSync } from 'child_process';

export const gitTools = {
  'git.status': async () => ({ output: execSync('git status -s').toString() }),
  'git.commit': async ({ message }: { message: string }) => {
    execSync(`git commit -am "${message}"`);
    return { ok: true };
  },
  'git.revert': async ({ commit }: { commit: string }) => {
    execSync(`git revert ${commit} --no-edit`);
    return { ok: true };
  }
};
The MCP daemon exposes these tools via Fastify, using JSON-RPC 2.0 endpoints like /tools/git.commit.

🚀 Running it
npm install -g .
coder daemon &          # start MCP tools
coder plan spec.md      # generate plan
coder run -f tasks/feature.yaml --autonomous
coder merge -t T-20251021-001
🧩 Next Steps
Add Ollama connection
Use ollama.generate({ model, prompt, stream }) in src/llm/ollama-client.ts.

Implement autonomous DAG executor
Similar to the Python version, but event-driven with await and Promise.all.

Expose MCP tools for fs, git, shell, and tests in src/daemon/tools/.

Persist state with a small JSON DB in .coder/state.json.

Optional: publish to npm

npm publish --access public
If you want, I can give you a ready-to-run package.json + bin/coder.js + example src/daemon/index.ts scaffold that you can literally npm install && npm link to start testing MCP+Ollama locally.
Would you like me to output that next?

You said:
Give me a full spec in markdown I can hand my dev team
ChatGPT said:
Here’s a complete Markdown specification you can hand to your development team for building the Coder Agent CLI — a fully autonomous, Ollama-powered coding agent with MCP tool integration and Git-safe automation.

🧠 Coder Agent CLI — Technical Specification
Goal:
A local-first, fully autonomous CLI agent that executes coding tasks using Ollama for LLM reasoning and MCP tools for file, shell, and git operations.
All actions are sandboxed within a git branch, producing atomic commits per step and safely merging back to main when successful.

1. Overview
Purpose
The Coder Agent CLI automates software development tasks from a structured task list (YAML/JSON).
It can:

Plan & execute development tasks autonomously

Edit code, run tests, and apply patches safely

Roll back on failure

Merge results back into the main branch

Core Principles
Local-first: Runs entirely offline using Ollama

Auditable: Every action logged and committed

Reversible: Each step is a separate git commit

MCP-compatible: All actions exposed as callable tools

Language-agnostic: Works with JS/TS, Python, Go, etc.

2. Key Features
Feature	Description
🧩 Ollama integration	Uses local LLM (e.g. qwen2.5-coder, llama3.1-coder) via the Ollama API for reasoning, planning, and patch generation
⚙️ MCP Tool System	Standardized JSON-RPC tool endpoints for fs, git, shell, and tests
🧠 Autonomous Execution	Runs entire task lists without human prompts
🔁 Task DAG Execution	Executes steps in dependency order; retries failed steps automatically
🪣 Git-Safe Operation	Creates a temp branch, commits per step, reverts or merges automatically
🧾 Checkpointing	.coder/state/<task_id>.json stores live state & allows resuming
🧰 Sandboxed Shell Runner	Runs whitelisted commands (e.g. npm, pnpm, pytest, go)
🧩 Context Retrieval	Pulls relevant code/doc context for each step
🧱 Unified Diff Editing	All file changes applied as diffs with git apply --check preflight
📊 Logging & Auditing	Structured logs per step, including LLM prompt, diff, and shell output
3. System Architecture
High-Level Diagram
+-----------------------+
|       coder CLI       |
|  (commander.js app)   |
+----------+------------+
           |
           | HTTP JSON-RPC
           v
+-----------------------+
|  Local MCP Daemon     |
|  (Fastify server)     |
|  - fs.read/write      |
|  - git.*              |
|  - shell.run          |
|  - tests.run          |
+----------+------------+
           |
           | Ollama API (localhost:11434)
           v
+-----------------------+
|   Ollama LLM Engine   |
|  (e.g. qwen2.5-coder) |
+-----------------------+
Modules
Module	Description
src/cli/	CLI commands (plan, run, merge, revert, resume)
src/core/	Task planner, executor, and state manager
src/daemon/	MCP server exposing tools
src/llm/	Ollama streaming client
src/utils/	Logging, YAML parsing, config management
4. Installation
Dev Setup
npm install -g coder-agent
coder daemon &
Project Structure
coder-agent/
├── bin/coder.js
├── src/
│   ├── cli/
│   ├── core/
│   ├── daemon/
│   ├── llm/
│   └── utils/
├── package.json
├── coder.config.json
└── tasks/
5. CLI Commands
Command	Description
coder plan <spec>	Generate task list from a spec or prompt
coder run -f <task.yaml> --autonomous	Execute full task list
coder resume -t <id>	Resume stopped or failed run
coder merge -t <id>	Merge completed branch into main
coder revert -t <id> [--to-step sX]	Roll back specific step(s)
coder diff -t <id>	Show accumulated diffs
coder logs -t <id> [--follow]	Stream logs
coder clean -t <id>	Delete temp branch and state
coder config	View or edit config
6. Configuration (coder.config.json)
{
  "model": "qwen2.5-coder:14b",
  "temperature": 0.2,
  "max_tokens": 2048,
  "allow_network": false,
  "tools": {
    "shell": { "allow": ["npm", "pnpm", "pytest", "go", "git"], "timeoutSec": 300 },
    "git": { "base": "main", "merge_mode": "squash" }
  },
  "mcp": {
    "port": 3323,
    "tool_allowlist": ["fs.*", "git.*", "shell.run", "tests.run"]
  }
}
7. Task File Format
Example (tasks/add-endpoint.yaml)
id: T-20251021-042
title: "Add /api/health endpoint"
branch: "agent/T-20251021-042-health"
base: "main"
model: "qwen2.5-coder:14b"
policies:
  approvals: none
  run_tests_after_each_edit: true
  max_parallel: 1
  retries: 2

graph:
  - id: s1
    kind: analyze
    goal: "Understand routing structure"
    depends_on: []
  - id: s2
    kind: edit
    goal: "Create /api/health"
    changes:
      - path: "api/health.ts"
    depends_on: [s1]
  - id: s3
    kind: test
    goal: "Run vitest suite"
    framework: "vitest"
    depends_on: [s2]
    on_fail:
      strategy: fix_and_retry
      max_cycles: 2
  - id: s4
    kind: doc
    goal: "Update README"
    depends_on: [s3]
8. MCP Tools Specification
8.1 File System
Tool	Params	Description
fs.read	{ path }	Returns file contents
fs.write	{ path, content }	Writes file
fs.apply_patch	{ diff }	Applies unified diff
fs.glob	{ pattern }	Returns matching files
8.2 Git
Tool	Params	Description
git.status	none	Returns short status
git.commit	{ message }	Commits staged files
git.revert	{ commit }	Reverts commit
git.merge	{ branch, mode }	Merges into base
git.checkout	{ branch }	Switches branch
8.3 Shell
Tool	Params	Description
shell.run	{ cmd, cwd?, timeoutSec? }	Executes whitelisted shell command
8.4 Tests
Tool	Params	Description
tests.run	{ framework?, args? }	Runs tests; returns pass/fail and logs
9. Autonomous Executor
Behavior
Runs all steps in DAG order

Uses Ollama for each edit or fix step

Automatically commits, retries, or reverts

Merges branch if all success criteria pass

Lifecycle
Init → Create branch → save state

Execute Step → Run via MCP tools

Commit → One commit per step

Test → Fix & retry if failed

Checkpoint → Write .coder/state/<id>.json

Finish → Merge or rollback

10. LLM Prompts
Edit Step
You are a local coding agent using MCP tools.
Goal: {goal}

Rules:
- Output minimal unified diff for necessary changes
- Never delete large files or unrelated code
- Return a JSON object with `commit_msg` and `diff`
Fix Step
Tests failed with logs:
{logs}

Generate a minimal patch to make all tests pass.
Output JSON:
{"commit_msg": "...", "diff": "..."}
11. Logging and State
Directory: .coder/

File	Purpose
tasks/<id>.yaml	Original task plan
state/<id>.json	Live state, step progress
logs/<id>.jsonl	Step-by-step execution logs
artifacts/<id>/<step>.diff	Diffs per step
Each log entry:

{
  "step": "s3",
  "action": "apply_patch",
  "success": true,
  "duration_ms": 3200,
  "stdout": "...",
  "stderr": ""
}
12. Security & Safety
Measure	Description
🔒 Air-gapped by default	No outbound network unless allowed
🧩 Tool allowlist	Only permitted shell commands can run
🧱 Diff enforcement	All edits via unified diff, preflighted
🧾 Commit granularity	One atomic commit per step
🔁 Auto revert	On step failure, branch reverts to last good commit
13. Future Enhancements
Multi-agent parallel mode

Context caching (embeddings-based)

Optional remote collaboration via HTTP API

VS Code extension wrapper

14. Deliverables
CLI binary (coder)

Daemon service (coder daemon)

Task executor module

MCP tool implementations

Ollama LLM bridge

Sample tasks and config

Would you like me to extend this spec with API schemas (JSON-RPC) for each MCP endpoint and LLM orchestration flow diagrams for the dev team to implement next?

You said:
Yes
ChatGPT said:
Here’s the extended developer specification (Markdown format) for the Coder Agent CLI, including API schemas, JSON-RPC structures, and sequence flow diagrams to implement the MCP layer, LLM orchestration, and autonomous task runner.
It’s designed to be handed directly to your dev team as a working blueprint for implementation.

🧠 Coder Agent CLI — Full Technical Specification
Version: 1.0
Author: Inventive HQ Engineering
Last Updated: 2025-10-21

1. Overview
The Coder Agent CLI is a local autonomous software development agent built for engineering teams.
It enables developers to execute structured task lists automatically using Ollama for reasoning and MCP tools for environment interaction.

2. Architecture Overview
2.1 Components
Component	Description
CLI (coder)	User interface for running and controlling tasks
Daemon (MCP Server)	JSON-RPC 2.0 API exposing safe local tools
Ollama LLM Bridge	Handles all prompt/response interaction with Ollama models
Executor	Core orchestrator that interprets task graphs and runs steps
State Manager	Persists progress, errors, logs, and metadata
Git Sandbox	Ensures atomic, reversible changes
3. System Flow Diagram
sequenceDiagram
    participant User
    participant CLI
    participant Executor
    participant MCP
    participant Ollama
    participant Git

    User->>CLI: coder run --autonomous -f tasks/add-endpoint.yaml
    CLI->>Executor: Parse YAML task file
    Executor->>Git: checkout base branch + create temp branch
    Executor->>MCP: Initialize tool session (fs, git, shell, tests)
    loop Per Step
        Executor->>Ollama: Generate patch plan / code diff
        Ollama->>Executor: Return JSON {diff, commit_msg}
        Executor->>MCP: fs.apply_patch(diff)
        MCP->>Git: git apply --check && git apply --index
        Executor->>MCP: git.commit(commit_msg)
        Executor->>MCP: tests.run (if enabled)
        MCP->>Executor: Return logs + pass/fail
        alt Fail & retry
            Executor->>Ollama: Send logs to fix_and_retry
            Ollama->>Executor: Return minimal fix diff
            Executor->>MCP: fs.apply_patch(diff)
        end
    end
    Executor->>Git: merge agent branch -> main (squash)
    Executor->>CLI: Done + report summary
4. MCP API Specification
4.1 Transport
Protocol: JSON-RPC 2.0 over HTTP

Content-Type: application/json

Base URL: http://127.0.0.1:3323

Method Format: POST /tools/{namespace}.{method}

Authentication: None (local only)

4.2 Tool Namespaces
🧾 fs (File System)
Method	Params	Returns	Description
fs.read	{ "path": "src/index.ts" }	{ "content": "<file text>" }	Reads a file
fs.write	{ "path": "src/index.ts", "content": "..." }	{ "ok": true }	Writes a file
fs.apply_patch	{ "diff": "--- a/x\n+++ b/x\n@@ ..." }	{ "ok": true, "changed": ["file1", "file2"] }	Applies unified diff
fs.glob	{ "pattern": "**/*.ts" }	{ "files": ["a.ts", "b.ts"] }	Returns matching paths
🧩 git
Method	Params	Returns	Description
git.status	{}	{ "output": "M index.js" }	Git short status
git.commit	{ "message": "feat: add API route" }	{ "ok": true, "sha": "abc123" }	Commit staged changes
git.checkout	{ "branch": "agent/T-001" }	{ "ok": true }	Switch branch
git.revert	{ "sha": "abc123" }	{ "ok": true }	Revert commit
git.merge	{ "branch": "agent/T-001", "mode": "squash" }	{ "ok": true }	Merge branch
⚙️ shell
Method	Params	Returns	Description
shell.run	{ "cmd": "npm test", "cwd": ".", "timeoutSec": 300 }	{ "exit_code": 0, "stdout": "...", "stderr": "..." }	Run command safely
🧪 tests
Method	Params	Returns	Description
tests.run	{ "framework": "vitest", "args": ["--run"] }	{ "ok": true, "logs": "...", "passed": 24, "failed": 0 }	Run test suite
4.3 Example JSON-RPC Request/Response
Request:

{
  "jsonrpc": "2.0",
  "id": "1",
  "method": "fs.apply_patch",
  "params": {
    "diff": "--- a/api/health.ts\n+++ b/api/health.ts\n@@\n+export default ...\n"
  }
}
Response:

{
  "jsonrpc": "2.0",
  "id": "1",
  "result": { "ok": true, "changed": ["api/health.ts"] }
}
5. Ollama LLM Orchestration
5.1 LLM Client
Endpoint: http://localhost:11434/api/generate

Model: qwen2.5-coder:14b (configurable)

Streaming: enabled via SSE

Completion Schema:

{
  "model": "qwen2.5-coder:14b",
  "prompt": "<system> + <task>",
  "stream": true,
  "temperature": 0.2
}
5.2 Prompt Types
Type	Description	Output Format
plan	Generate task list YAML from spec	YAML string
edit	Produce minimal code diff	JSON: {commit_msg, diff}
fix	Fix test failures	JSON: {commit_msg, diff}
analyze	Context summary only	Markdown summary
doc	Documentation changes	JSON: {commit_msg, diff}
6. Task Lifecycle
6.1 State Machine
State	Description
pending	Step not started
running	Currently executing
success	Completed successfully
failed	Execution failed
skipped	Skipped (dependency failure)
6.2 Failure Strategies
Strategy	Behavior
fix_and_retry	Re-prompt LLM with logs and re-run tests
revert_and_stop	Revert last commit and stop
skip	Mark step skipped and continue
7. File Structure
.coder/
 ├── tasks/
 │   └── T-20251021-042.yaml
 ├── state/
 │   └── T-20251021-042.json
 ├── logs/
 │   └── T-20251021-042.jsonl
 └── artifacts/
     └── T-20251021-042/
         ├── s2.diff
         ├── s3.diff
         └── test.log
8. Logging Specification
8.1 Log Schema (JSON Lines)
{
  "timestamp": "2025-10-21T12:31:04Z",
  "task_id": "T-20251021-042",
  "step_id": "s2",
  "tool": "fs.apply_patch",
  "success": true,
  "duration_ms": 3140,
  "stdout": "...",
  "stderr": ""
}
8.2 Log Types
prompt: serialized input sent to Ollama

tool_call: tool method invocation

commit: git commit details

test_result: test logs summary

merge: branch merge result

9. Security and Safety Rules
Allowlist-based command execution

Only commands in coder.config.json may be executed

Diff preflight checks

git apply --check must succeed before applying patches

Path enforcement

File edits restricted to repo root

Sensitive data redaction

.env, secrets.*, or *.pem excluded from prompts

Timeouts

Each MCP call must respect its declared timeoutSec

Autonomous mode isolation

Runs in dedicated agent/<task_id> branch

Merges only after full success criteria met

10. Example Autonomous Run
coder run --autonomous -f tasks/add-endpoint.yaml --merge-on-success
Steps executed:

Create branch agent/T-20251021-042-health

Analyze project structure

Generate unified diff (step s2)

Apply patch, commit

Run tests (step s3)

Fix-on-fail (retry cycle)

Update README (s4)

Merge branch → main (squash commit)

11. Example Output
🧠 Starting autonomous task: T-20251021-042
📂 Branch created: agent/T-20251021-042-health
✅ Step s1: analyze complete
✅ Step s2: /api/health.ts created
✅ Step s3: tests passed (vitest)
✅ Step s4: README updated
🔀 Merge successful (squash commit on main)
🎉 Task completed successfully
12. Deliverables Checklist
Component	Deliverable	Owner
CLI (commander.js)	coder executable with subcommands	Dev A
MCP Server (Fastify)	JSON-RPC tool endpoints (fs, git, shell, tests)	Dev B
Ollama Bridge	Streaming prompt client + response parser	Dev C
Executor	DAG-based autonomous runner	Dev D
State Manager	JSON persistence layer	Dev E
Logging	Structured JSONL writer	Dev E
Config Loader	coder.config.json parser	Dev F
13. Testing Plan
Test Type	Description
Unit Tests	Validate MCP endpoints and git safety logic
Integration Tests	Run full simulated tasks using sample YAML
Failure Recovery	Simulate failed patch, bad merge, or test failures
Performance Tests	Ensure sub-200ms per tool call baseline
End-to-End Test	Execute real code edit + test + merge using Ollama mock
14. Example Development Timeline
Week	Milestone
1	CLI skeleton + config loader
2	MCP daemon + basic tools
3	Ollama integration
4	Executor & task runner
5	Autonomous mode + fix_and_retry logic
6	Logging, safety, and merge routines
7	Beta release & internal testing
Would you like me to append JSON schemas for each task file (Task, Step, State) and a detailed API contract (OpenAPI-style) for the MCP server next? That would make it ready for code generation and validation.

You said:
Yes
ChatGPT said:
Awesome—here are the machine-validated JSON Schemas (Draft 2020-12) for your Taskfile, Step types, Runtime State, and Log entries, plus a precise API contract for the MCP JSON-RPC server (request/response envelopes, error model, per-tool method specs, and examples). Hand this straight to the dev team.

JSON Schemas
All schemas conform to JSON Schema Draft 2020-12. Use $id to reference between files or embed them inline.

1) Taskfile Schema (Task.schema.json)
{
  "$id": "https://inventivehq.com/schemas/coder/Task.schema.json",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "CoderAgent Taskfile",
  "type": "object",
  "required": ["id", "title", "branch", "base", "model", "graph"],
  "properties": {
    "id": { "type": "string", "pattern": "^T-[0-9]{8}-[0-9]{3,}(-[a-z0-9]{4,8})?$" },
    "title": { "type": "string", "minLength": 3 },
    "branch": { "type": "string", "pattern": "^(agent|feature)/[-a-zA-Z0-9._/]+$" },
    "base": { "type": "string", "default": "main" },
    "model": { "type": "string", "minLength": 1 },
    "created_at": { "type": "string", "format": "date-time" },
    "policies": {
      "type": "object",
      "properties": {
        "approvals": { "enum": ["none", "manual"], "default": "none" },
        "run_tests_after_each_edit": { "type": "boolean", "default": true },
        "allow_network": { "type": "boolean", "default": false },
        "max_parallel": { "type": "integer", "minimum": 1, "default": 1 },
        "retries": { "type": "integer", "minimum": 0, "default": 1 }
      },
      "additionalProperties": false
    },
    "success": {
      "type": "object",
      "properties": {
        "require_green_tests": { "type": "boolean", "default": true },
        "require_no_lint_errors": { "type": "boolean", "default": false },
        "required_files": {
          "type": "array",
          "items": { "type": "string", "minLength": 1 },
          "uniqueItems": true
        }
      },
      "additionalProperties": false
    },
    "graph": {
      "type": "array",
      "minItems": 1,
      "items": { "$ref": "https://inventivehq.com/schemas/coder/Step.schema.json" }
    }
  },
  "additionalProperties": false
}
2) Step Schema (Step.schema.json)
{
  "$id": "https://inventivehq.com/schemas/coder/Step.schema.json",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "CoderAgent Step",
  "type": "object",
  "required": ["id", "kind", "goal"],
  "properties": {
    "id": { "type": "string", "pattern": "^[a-z][a-z0-9_-]*$" },
    "kind": { "enum": ["analyze", "edit", "doc", "shell", "test", "custom"] },
    "goal": { "type": "string", "minLength": 3 },
    "depends_on": {
      "type": "array",
      "items": { "type": "string", "pattern": "^[a-z][a-z0-9_-]*$" },
      "uniqueItems": true,
      "default": []
    },
    "timeout": { "type": "string", "pattern": "^[0-9]+(s|m|h)$" },
    "retries": { "type": "integer", "minimum": 0, "default": 0 },
    "idempotent": { "type": "boolean", "default": false },

    "changes": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["path"],
        "properties": {
          "path": { "type": "string", "minLength": 1 },
          "mode": { "enum": ["create", "patch", "delete"], "default": "patch" }
        },
        "additionalProperties": false
      }
    },

    "cmd": { "type": "string" },
    "cwd": { "type": "string" },
    "allowlist": {
      "type": "array",
      "items": { "type": "string", "minLength": 1 },
      "uniqueItems": true
    },

    "framework": { "type": "string" },
    "args": {
      "type": "array",
      "items": { "type": "string" }
    },

    "assert": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["type"],
        "properties": {
          "type": { "enum": ["file_exists", "file_not_exists", "text_in_file"] },
          "path": { "type": "string" },
          "contains": { "type": "string" }
        },
        "additionalProperties": false
      }
    },

    "on_fail": {
      "type": "object",
      "properties": {
        "strategy": { "enum": ["fix_and_retry", "revert_and_stop", "skip"], "default": "revert_and_stop" },
        "max_cycles": { "type": "integer", "minimum": 1, "default": 1 }
      },
      "additionalProperties": false
    }
  },
  "allOf": [
    {
      "if": { "properties": { "kind": { "const": "shell" } } },
      "then": { "required": ["cmd"] }
    },
    {
      "if": { "properties": { "kind": { "const": "test" } } },
      "then": { "required": ["framework"] }
    }
  ],
  "additionalProperties": false
}
3) Runtime State Schema (State.schema.json)
{
  "$id": "https://inventivehq.com/schemas/coder/State.schema.json",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "CoderAgent Runtime State",
  "type": "object",
  "required": ["id", "branch", "steps"],
  "properties": {
    "id": { "type": "string" },
    "branch": { "type": "string" },
    "created_at": { "type": "string", "format": "date-time" },
    "updated_at": { "type": "string", "format": "date-time" },
    "global": {
      "type": "object",
      "properties": {
        "success": { "type": "boolean" },
        "merge_attempted": { "type": "boolean" },
        "merged_sha": { "type": "string" }
      },
      "additionalProperties": false
    },
    "steps": {
      "type": "object",
      "additionalProperties": {
        "type": "object",
        "required": ["status"],
        "properties": {
          "status": { "enum": ["pending", "running", "success", "failed", "skipped"] },
          "started_at": { "type": "string", "format": "date-time" },
          "ended_at": { "type": "string", "format": "date-time" },
          "commit_sha": { "type": "string" },
          "error": { "type": "string" },
          "retries_used": { "type": "integer", "minimum": 0 }
        },
        "additionalProperties": false
      }
    }
  },
  "additionalProperties": false
}
4) Log Entry Schema (Log.schema.json)
{
  "$id": "https://inventivehq.com/schemas/coder/Log.schema.json",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "CoderAgent Log Entry",
  "type": "object",
  "required": ["timestamp", "task_id", "level", "event"],
  "properties": {
    "timestamp": { "type": "string", "format": "date-time" },
    "task_id": { "type": "string" },
    "step_id": { "type": "string" },
    "level": { "enum": ["debug", "info", "warn", "error"] },
    "event": { "type": "string" },
    "tool": { "type": "string" },
    "duration_ms": { "type": "number", "minimum": 0 },
    "success": { "type": "boolean" },
    "stdout": { "type": "string" },
    "stderr": { "type": "string" },
    "details": { "type": "object", "additionalProperties": true }
  },
  "additionalProperties": false}
MCP Server API Contract (JSON-RPC over HTTP)
Base URL: http://127.0.0.1:3323
Headers: Content-Type: application/json
Transport: POST requests to method-specific endpoints: /tools/{namespace}.{method}
Protocol: JSON-RPC 2.0 envelope

1) Common Envelopes
Request
{
  "jsonrpc": "2.0",
  "id": "9a2d3c4",
  "method": "fs.apply_patch",
  "params": { "...": "..." }
}
Success Response
{
  "jsonrpc": "2.0",
  "id": "9a2d3c4",
  "result": { "...": "..." }
}
Error Response
{
  "jsonrpc": "2.0",
  "id": "9a2d3c4",
  "error": {
    "code": -32000,
    "message": "Patch failed preflight",
    "data": { "stderr": "error: patch failed at 12" }
  }
}
Error Codes

-32600 Invalid Request (malformed JSON-RPC)

-32601 Method not found

-32602 Invalid params (schema validation error)

-32603 Internal error

-32000 Tool failure (domain error; see data)

-32001 Permission denied (violates allowlist/policy)

-32002 Timeout

2) Tools & Method Contracts
2.1 fs.*
fs.read
Params: { "path": "src/index.ts" }

Result: { "content": "<string>", "size": 1234, "mtime": "2025-10-21T18:00:00Z" }

Errors: -32000 if not found or outside repo root

fs.write
Params: { "path": "src/index.ts", "content": "..." }

Result: { "ok": true, "bytes": 2048 }

Notes: must respect write policy (deny .env, secrets.*)

Errors: -32001 on policy violation

fs.apply_patch
Params: { "diff": "<unified diff text>", "dry_run": false }

Result: { "ok": true, "changed": ["src/x.ts","README.md"] }

Flow: always preflight using git apply --check; if dry_run=true, do not modify.

Errors: -32000 on preflight fail; -32001 on path policy violation

fs.glob
Params: { "pattern": "**/*.ts" }

Result: { "files": ["a.ts","b.ts"] }

2.2 git.*
git.status
Params: {}

Result: { "output": " M src/a.ts\n?? newfile.ts" }

git.commit
Params: { "message": "task(s2): add health endpoint" }

Result: { "ok": true, "sha": "abc123def" }

Preconditions: staged changes must exist; otherwise return -32000

git.checkout
Params: { "branch": "agent/T-..." }

Result: { "ok": true }

git.revert
Params: { "sha": "abc123", "no_edit": true }

Result: { "ok": true, "reverted_sha": "abc123" }

git.merge
Params: { "branch": "agent/T-...", "mode": "squash" }

Result: { "ok": true }

mode: squash (default), no-ff, ff-only

2.3 shell.run
Params:

{
  "cmd": "pnpm vitest --run",
  "cwd": ".",
  "timeoutSec": 600,
  "env": { "CI": "1" }
}
Result:

{ "exit_code": 0, "stdout": "...", "stderr": "..." }
Policy: cmd must start with a whitelisted binary (npm, pnpm, pytest, go, git, etc.); enforce timeout; strip ANSI if configured.

Errors: -32001 (not allowed), -32002 (timeout)

2.4 tests.run
Params:

{ "framework": "vitest", "args": ["--run"], "cwd": "." }
Result:

{ "ok": true, "passed": 24, "failed": 0, "skipped": 1, "logs": "..." }
Notes: Autodetect if framework omitted; parse counts where possible; else return passed/failed=null with raw logs.

Executor ↔ MCP Contracts
The Executor is the only client of the MCP server. It must:

Preflight all writes with fs.apply_patch using { dry_run: true }.

Stage & commit only after a successful non-dry-run fs.apply_patch.

Record artifacts (diffs, logs) to .coder/artifacts/{taskId}/{stepId}.*.

Respect policies from coder.config.json (allowlist, network=false, timeouts).

Emit logs in Log.schema.json format.

Prompt I/O Contracts (LLM)
The LLM must produce strict JSON for edit/fix/doc steps.

Edit/Fix Output (strict)
{
  "commit_msg": "task(s2): add /api/health endpoint",
  "diff": "--- a/api/health.ts\n+++ b/api/health.ts\n@@\n+export default function handler(req, res) {...}\n"
}
Validation:

commit_msg: 1 line, <= 72 chars preferred

diff: valid unified diff; file paths must be inside repo root; deny .env, secrets.*, binary blobs

Examples
1) Apply Patch (dry run)
Request

POST /tools/fs.apply_patch
{
  "jsonrpc":"2.0","id":"1",
  "method":"fs.apply_patch",
  "params":{"diff":"--- a/a.txt\n+++ b/a.txt\n@@\n+hello\n", "dry_run": true}
}
Response

{"jsonrpc":"2.0","id":"1","result":{"ok":true,"changed":["a.txt"]}}
2) Commit
Request

{"jsonrpc":"2.0","id":"2","method":"git.commit","params":{"message":"task(s2): greet"}}
Response

{"jsonrpc":"2.0","id":"2","result":{"ok":true,"sha":"4f2a1b7"}}
3) Run Tests
Request

{"jsonrpc":"2.0","id":"3","method":"tests.run","params":{"framework":"vitest","args":["--run"]}}
Response

{"jsonrpc":"2.0","id":"3","result":{"ok":true,"passed":24,"failed":0,"skipped":1,"logs":"..."}}
Validation & Middleware
Input validation: All params must be validated against per-method JSON Schemas before execution. On failure: -32602 Invalid params.

Path guard: Normalize and ensure every path resolves under the repo root (realpath containment check).

Diff guard: Parse diff headers; reject edits targeting forbidden paths; enforce size caps (e.g., max 2000 added lines per step in autonomous mode).

Timeouts: Per method; default 300s; overridable via config but capped (e.g., 1800s).

Resource limits: Child process memory/CPU quotas where supported.

OpenAPI-Style Index (for documentation only)
JSON-RPC isn’t OpenAPI-native, but this table helps doc generation.

Endpoint	Method	Summary	Request Body	Response Body
/tools/fs.read	POST	Read file	JSON-RPC Request (params.path)	JSON-RPC Response (result.content)
/tools/fs.write	POST	Write file	params.path, params.content	{ ok, bytes }
/tools/fs.apply_patch	POST	Apply unified diff	params.diff, params.dry_run?	{ ok, changed[] }
/tools/fs.glob	POST	Glob files	params.pattern	{ files[] }
/tools/git.status	POST	Git status	{}	{ output }
/tools/git.commit	POST	Commit staged changes	{ message }	{ ok, sha }
/tools/git.checkout	POST	Checkout branch	{ branch }	{ ok }
/tools/git.revert	POST	Revert commit	{ sha, no_edit? }	{ ok, reverted_sha }
/tools/git.merge	POST	Merge branch	{ branch, mode }	{ ok }
/tools/shell.run	POST	Run command	{ cmd, cwd?, timeoutSec?, env? }	{ exit_code, stdout, stderr }
/tools/tests.run	POST	Run tests	{ framework?, args?, cwd? }	{ ok, passed?, failed?, skipped?, logs }
Hand-off Checklist for Devs
 Implement the method routers for each /tools/{namespace}.{method}

 Add AJV (or similar) validation for params using schemas above

 Enforce policy guards (paths, allowlist, timeouts)

 Implement Executor to:

topologically sort the DAG

run steps with retries/timeouts

use fs.apply_patch(dry_run) → fs.apply_patch() → git.commit()

call tests.run for test/doc flows, with fix_and_retry loop

persist .coder/state/<id>.json and .coder/logs/<id>.jsonl

 Wire Ollama client to produce strict JSON for edit/fix/doc prompts

 Add merge routine (default squash) + tag creation

 Build unit tests for every tool + E2E for a sample repo

If you want, I can also supply AJV-ready TypeScript type definitions and tiny contract tests (request/response golden files) to drop into the repo so the team can start coding against these specs immediately.



No file chosenNo file chosen
ChatGPT can make mistakes. Check important info.
