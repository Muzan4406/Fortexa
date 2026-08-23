#!/usr/bin/env bash
set -euo pipefail

# Plesk Git deployment hook:
# install dependencies, build both artifacts, then let Plesk restart the API.
corepack enable
pnpm install --frozen-lockfile
pnpm run build:plesk

# The frontend is published from:
#   artifacts/fortexa/dist/public
# The API startup command is:
#   pnpm start:plesk