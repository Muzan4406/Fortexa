#!/usr/bin/env bash
set -euo pipefail

# Plesk Git deployment hook:
# install dependencies, build both artifacts, then let Plesk restart the API.
# Plesk installations do not always expose pnpm in the Node.js selector, so
# bootstrap a pinned pnpm version through npx when it is not already present.
export BASE_PATH="${BASE_PATH:-/}"
if command -v pnpm >/dev/null 2>&1; then
  pnpm install --frozen-lockfile
  pnpm run build:plesk
else
  npx --yes pnpm@10.12.4 install --frozen-lockfile
  npx --yes pnpm@10.12.4 run build:plesk
fi

# The frontend is published from:
#   artifacts/fortexa/public
# The API startup command is:
#   app.js