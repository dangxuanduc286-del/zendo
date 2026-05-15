# Zendo — Deployment guide

This document covers production deployment checks for the storefront, admin, and affiliate analytics stack.

## Environment validation

Before deploying, confirm at least:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection (required at runtime for DB routes). |
| `AUTH_SECRET` or `NEXTAUTH_SECRET` | Session signing; **required in production** (see `src/lib/auth.ts`). |
| `AUTH_URL` / `NEXTAUTH_URL` | Canonical site URL for auth callbacks; set explicitly on Vercel if auto-detection is wrong. |
| `NEXT_PUBLIC_R2_PUBLIC_BASE_URL` | Public asset base URL; used for `next/image` `remotePatterns` and `SafeProductThumbnail` host allowlist. |

Optional but important for affiliate jobs and dangerous maintenance:

| Variable | Purpose |
|----------|---------|
| `AFFILIATE_PURGE_RAW_EVENTS` | Must be `1` to allow raw event purge from admin system actions. |

Invalid `NEXT_PUBLIC_R2_PUBLIC_BASE_URL` at build time can make `next.config.mjs` fall back to `media.zendo.vn` only; fix the URL before release if you use a different R2 hostname.

## Pre-deploy checklist

1. Run `npm run lint`, `npx tsc --noEmit`, and `npm run build` on the same Node version as production.
2. Apply pending Prisma migrations against the target database.
3. Verify admin health: `GET /api/admin/system/health` (authenticated admin) shows DB ok and acceptable aggregation lag.
4. Smoke-test CTV affiliate dashboard: overview metrics, traffic chart, realtime badge, export links (CSV).
5. Confirm cron or external scheduler is calling aggregate endpoints (see `docs/analytics-operations.md`).

## Build notes

- Production builds use `compiler.removeConsole` in `next.config.mjs`; avoid relying on `console` in client bundles for debugging production.
- Chart-heavy pages use dynamic imports (`ssr: false`) for Recharts to reduce main-thread work on first paint.

## Health and monitoring

- Prefer uptime checks against a lightweight route (e.g. public health if exposed, or authenticated admin health behind auth).
- Watch queue pending/delayed counts and `aggregationLagMs` from the admin health payload.

## Rollback

1. Revert the deployment to the previous build artifact or Git revision.
2. If a migration was applied, use your database backup/restore procedure — do **not** assume Prisma migrate can safely “undo” data migrations without a plan.

For analytics-specific operations, retention, and backup, see `docs/analytics-operations.md`.
