#!/usr/bin/env bash
set -euo pipefail

export BASE_PATH="${BASE_PATH:-/}"

if command -v pnpm >/dev/null 2>&1; then
  pnpm install --frozen-lockfile
  pnpm run typecheck
  pnpm --filter @workspace/api-server run build
  pnpm --filter @workspace/fortexa run build
else
  npx --yes pnpm@10.12.4 install --frozen-lockfile
  npx --yes pnpm@10.12.4 run typecheck
  npx --yes pnpm@10.12.4 --filter @workspace/api-server run build
  npx --yes pnpm@10.12.4 --filter @workspace/fortexa run build
fi