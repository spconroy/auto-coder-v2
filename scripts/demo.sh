#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

CLI="npx tsx src/cli/index.ts"
SPEC="examples/sample-task/spec.md"
PATCH_SOURCE="examples/sample-task/patches/s2.diff"

USE_LLM=0
if [[ "${1:-}" == "--use-llm" ]]; then
  USE_LLM=1
  shift
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Git working tree is dirty. Commit or stash changes before running the demo." >&2
  exit 1
fi

if [[ ! -f "$SPEC" ]]; then
  echo "Spec not found at $SPEC" >&2
  exit 1
fi

if [[ ! -f "$PATCH_SOURCE" ]]; then
  echo "Sample patch not found at $PATCH_SOURCE" >&2
  exit 1
fi

TASK_ID="$($CLI plan "$SPEC" --quiet | tail -n 1)"

echo "Planned task: $TASK_ID"

PATCH_DEST=".coder/patches/$TASK_ID"
if [[ "$USE_LLM" -eq 0 ]]; then
  mkdir -p "$PATCH_DEST"
  cp "$PATCH_SOURCE" "$PATCH_DEST/s2.diff"
  echo "Copied demo diff to $PATCH_DEST/s2.diff"
else
  echo "Skipping diff copy; relying on Ollama model to generate patch."
fi

echo "Running task..."
$CLI run --task "$TASK_ID"

echo
echo "Demo complete. Check .coder/state/$TASK_ID.json and .coder/logs/$TASK_ID.jsonl for details."
