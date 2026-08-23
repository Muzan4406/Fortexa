#!/usr/bin/env bash
set -euo pipefail

# Plesk Git deployment hook:
# install dependencies, build both artifacts, then let Plesk restart the API.
bash ./scripts/build-plesk.sh

# The frontend is published from:
#   artifacts/fortexa/public
# The API startup command is:
#   app.js