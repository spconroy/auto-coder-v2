#!/usr/bin/env bash
# Run the full unit test suite for auto-coder-v2.
# Accepts additional arguments and forwards them to Vitest (e.g., scripts/run-tests.sh --runInBand).

set -euo pipefail

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required to run tests." >&2
  exit 1
fi

npm test -- "$@"
