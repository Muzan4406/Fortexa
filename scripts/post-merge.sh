#!/bin/bash
set -e
pnpm install --frozen-lockfile
pnpm --filter @workspace/db run push
# Seed the admin user if not already present (idempotent)
pnpm --filter @workspace/scripts run seed-admin || true
