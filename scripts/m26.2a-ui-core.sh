#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "========================================"
echo "M26.2-A — NEVO UI CORE"
echo "========================================"

test -f pnpm-workspace.yaml || {
  echo "ERROR: Nevo workspace not found"
  exit 1
}

mkdir -p \
  packages/ui/src/theme \
  packages/ui/src/primitives \
  packages/ui/src/forms \
  packages/ui/src/overlays \
  packages/ui/tests

echo
echo "--- VERIFY FOUNDATION ---"

pnpm --filter @nevo/ui build

echo
echo "--- UI SOURCE ---"

find packages/ui/src -type f | sort

echo
echo "--- BUILD CORE ---"

pnpm --filter @nevo/ui build

echo
echo "--- FRONTEND REGRESSION BUILD ---"

pnpm --filter nevo-builder-frontend build

echo
echo "--- DIFF CHECK ---"

git diff --check

echo
echo "========================================"
echo "M26.2-A CORE BUILD PASS"
echo "========================================"
