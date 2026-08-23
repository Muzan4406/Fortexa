---
name: Fortexa architecture
description: Key architectural decisions for the Fortexa investment platform
---

## Auth
- JWT stored in `localStorage` as `fortexa_token`
- `lib/api-client-react/src/custom-fetch.ts` already patched to read it automatically (no `setAuthTokenGetter` needed)
- Backend: `lib/auth.ts` with `requireAuth` / `requireAdmin` middleware; extends `Request` via `artifacts/api-server/src/types/express.d.ts`

## Gains Model
- Server stores `gainBalance` + `lastGainUpdate` timestamp in users table
- On each API call, server calls `updateGainBalance(userId)` which computes elapsed seconds and credits gains to DB
- Client fetches `/gains/snapshot` every N seconds and interpolates in real time (1s interval in `GainsCounter`)

## Referral Commissions
- 3 levels: 5% / 2% / 1% (configurable in platform_settings)
- Credited server-side in `lib/referral.ts` when a deposit is **approved** (not created)
- `referredById` is 0 when no referrer (serial type, not null) — all logic checks `!user.referredById` which correctly handles 0

## DB
- Drizzle ORM + PostgreSQL (Replit built-in)
- `lib/db/src/schema/` — users, transactions, platform_settings, announcements, referral_commissions
- `phone` column on users is NOT NULL (pass empty string `''` for admin seed)
- Run `pnpm run typecheck:libs` after schema changes to rebuild declarations

## Country values
- User country selections are stored as localized country names (for example `Togo` and `Bénin`), not ISO codes; payment rules should accept or normalize both forms.

## Admin user
- Email: admin@fortexa.com / Password: admin123
- Created via direct SQL with bcrypt hash (cost 10)

**Why:** JWT + localStorage chosen over sessions for mobile-first SPA compatibility; gains interpolated client-side to avoid server polling every second.
