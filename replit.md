# Fortexa

Investment platform where users deposit funds, accumulate gains, and earn referral commissions — managed by an admin panel.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/fortexa/` — React + Vite frontend (port `$PORT` / 19420 in dev)
- `artifacts/api-server/` — Express 5 API server (port 8080 in dev)
- `lib/db/src/schema/` — Drizzle ORM schema (source of truth for DB shape)
- `lib/api-spec/` — OpenAPI spec (source of truth for API contract)
- `lib/api-client-react/` — generated React Query hooks (run codegen after spec changes)
- `scripts/seed-admin.mjs` — seeds the admin user into a fresh DB

## Architecture decisions

- JWT tokens stored in localStorage; gains computed server-side on each request
- 3-level referral commission tree tracked in `referral_commissions` table
- API codegen via Orval — edit `lib/api-spec/` then run codegen, never edit generated files directly
- esbuild bundles the API server into `artifacts/api-server/dist/` for production

## Product

- Users register, deposit investment capital, and watch gains accumulate over time
- Referral system: users earn commissions across 3 levels of their referral tree
- Admin panel: approve/reject deposits & withdrawals, manage users, post announcements, configure platform settings

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- `pnpm --filter @workspace/db run push` must be run after any schema change (dev only)
- `pnpm --filter @workspace/api-spec run codegen` must be run after any OpenAPI spec change
- Admin user seed: `pnpm --filter @workspace/scripts run seed-admin` (admin@fortexa.com / admin123 — change password before going live)
- `SESSION_SECRET` env secret is available and used by the API server for session signing

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
