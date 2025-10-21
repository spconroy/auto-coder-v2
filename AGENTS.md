# Repository Guidelines

## Project Structure & Module Organization
- Keep all runtime code under `src/`, split by responsibility: `src/executor/` for the task runner, `src/tools/` for JSON-RPC method handlers, and `src/shared/` for utilities and type guards shared across modules.
- Store tests next to code when they are small (`src/**/__tests__`), and use `tests/e2e/` for workflow-level coverage of the agent loop described in `spec.md`.
- Persist runtime artifacts under `.coder/` exactly as mandated in the spec (`.coder/artifacts/`, `.coder/state/`, `.coder/logs/`) so the Executor can replay sessions.
- Treat the root-level `spec.md` as the single source of truth; update it or add `docs/` supplements when behavior changes.

## Build, Test, and Development Commands
- `npm install` — install TypeScript, Vitest, and contract-testing dependencies.
- `npm run build` — compile `src/` to `dist/` using `tsc`; run before shipping patches to ensure JSON schemas stay in sync.
- `npm run lint` — execute ESLint/Prettier to enforce formatting and safe JSON-RPC typing.
- `npm test` — run the Vitest suite (unit + contract). For focused debugging use `npm run test -- --runInBand path/to/spec.test.ts`.

## Coding Style & Naming Conventions
- Use TypeScript with strict mode and 2-space indentation; prefer explicit return types on public functions.
- File names follow kebab-case for modules (`task-runner.ts`) and PascalCase for classes.
- Keep diffs RFC-style: include a short rationale up top as comments only when logic is non-obvious.
- Format with Prettier and lint with ESLint before opening a PR (`npm run lint -- --fix` is acceptable locally).

## Testing Guidelines
- Write Vitest unit tests for each JSON-RPC handler and Executor branch; mock shell/git calls so tests stay deterministic.
- Place contract tests under `tests/contracts/` to validate request/response schemas via AJV as required in `spec.md`.
- Name test files `<feature>.spec.ts` and ensure suites cover success, validation failure, and guardrails (path containment, timeout handling).
- Target ≥90 % statement coverage; emit coverage with `npm test -- --coverage` before merging.

## Commit & Pull Request Guidelines
- Existing history (`Initial commit`, `Create spec.md`) shows short, descriptive subjects—continue using imperative, ≤72-character summaries plus optional body context.
- For PRs, include: task summary, linked issue or spec section, manual test evidence (commands + results), and screenshots or logs when changing executor output.
- Attach generated artifacts (`.coder/artifacts/*`) as PR uploads rather than committing them; keep the repo clean for reviewers.

## Security & Configuration Tips
- Keep the default “network off” stance: do not add code that reaches external services unless explicitly toggled through configuration.
- Scrub secrets before logging or prompt-stuffing; follow the spec’s requirement to redact env tokens and `.npmrc` data.
- Document any new config flags in `spec.md` and ship sane defaults in `config/agent.config.json`.
