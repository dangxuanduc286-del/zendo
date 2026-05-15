# Database migrations — Prisma workflow (dev / prod / shadow)

This document stabilizes how we use **Prisma Migrate** for a production-scale analytics stack: separate dev databases, immutable migration history on production, shadow replay safety, and how we handle **checksum mismatch** and **schema drift** without resetting production.

---

## 1. Principles

| Environment | Command | Purpose |
|---------------|---------|---------|
| **Development** | `prisma migrate dev` | Create/apply migrations, **shadow DB** full replay from empty |
| **Production / staging** | `prisma migrate deploy` | Apply **only** pending migrations; **no** shadow; **no** reset |

- **Never** run `prisma migrate reset` against production Neon.
- **Never** edit SQL in a migration folder that is **already recorded** as applied in production `_prisma_migrations` unless you intentionally run a coordinated checksum repair (see §6).
- **Commerce baseline gap**: core tables such as `"Order"` and `"Product"` historically existed outside this repo’s migration chain. Migration `20260510181500_order_product_fk_prerequisites` creates minimal `IF NOT EXISTS` stubs so shadow replay and `20260511092000_affiliate_analytics_foundation` FKs remain valid. Production with full tables is unaffected.

---

## 2. Dev vs prod strategy

### Development (`migrate dev`)

1. Use a **dedicated database** for `DATABASE_URL` (local Postgres, Docker, or a **Neon branch** — not production).
2. Set **`SHADOW_DATABASE_URL`** to a second empty database on the same provider (local second DB or Neon branch). `prisma.config.ts` passes this to Prisma 7 as `shadowDatabaseUrl` when the variable is set.
3. Run:
   ```bash
   npx prisma migrate dev
   ```
4. Shadow DB is created, **all** migrations in `prisma/migrations/` are replayed in order, then pending migrations apply. This catches ordering/FK mistakes early.

### Production (`migrate deploy`)

1. CI/CD or release job sets `DATABASE_URL` to **production** (or staging) credentials.
2. Run:
   ```bash
   npx prisma migrate deploy
   ```
3. Only migrations not yet in `_prisma_migrations` are applied. History is **append-only**.

**Naming:** `.env.example` documents `DATABASE_URL_DEV` as a *logical* dev URL; Prisma only reads `DATABASE_URL`. Copy your dev connection string into `DATABASE_URL` for local work, or use separate `.env` / `.env.local` files per machine.

---

## 3. Shadow database (stability)

- **Empty**: shadow starts from an empty schema each `migrate dev` run (or uses dedicated `SHADOW_DATABASE_URL`).
- **Replayable**: every file under `prisma/migrations/*/migration.sql` runs in **lexicographic order** by migration folder name.
- **Deterministic**: same repo state → same replay; avoid machine-specific SQL.

Configure in `.env`:

```env
DATABASE_URL=postgresql://.../zendo_dev
SHADOW_DATABASE_URL=postgresql://.../zendo_shadow
```

If `SHADOW_DATABASE_URL` is omitted, Prisma may create a shadow database on the same server as `DATABASE_URL` (provider-dependent). Prefer an explicit empty DB for Neon.

---

## 4. Baseline strategy (production-safe)

### Current reality

- **Drift**: Production schema can be **larger** than “replay migrations only” because of historical `db push`, manual SQL, or migrations created outside this folder.
- **Checksum mismatch**: Local `migration.sql` files were edited after being applied; Prisma reports *“migration … was modified after it was applied”*.

### What we **do not** do on production

- Squash or delete applied migrations in place.
- `migrate reset` on production.
- Blind `migrate resolve` without understanding state.

### Recommended paths

| Situation | Action |
|-----------|--------|
| **New engineer / new env** | Clone repo, point `DATABASE_URL` at **empty dev DB**, run `migrate deploy` (or `migrate dev`) until history matches; use seed if needed. |
| **Checksum mismatch** (file changed after deploy) | Restore each listed migration file to the **exact bytes** that were deployed (from git tag/commit that ran on prod), **or** follow Prisma’s official repair: update `_prisma_migrations.checksum` only with extreme care and team sign-off (usually revert file instead). |
| **Long-term drift** (commerce not in migrations) | **Option A**: Add forward-only migrations that reflect real columns/FKs (safe, incremental). **Option B**: One-time **introspected baseline** on a *new* empty database for greenfield only — **not** a drop on production. **Option C**: Document drift, keep using `migrate deploy` for new tables only; use `prisma db pull` on a scratch DB to diff, then craft migrations — never pull over prod. |

**Decision for this repo:** Keep **append-only** SQL migrations for affiliate/analytics/tracking. Treat commerce drift as **documented** until optional future “commerce baseline” migration is prioritized; production stays on **`migrate deploy`**.

---

## 5. Checksum policy

1. **After a migration is deployed to production**, treat its `migration.sql` as **immutable**.
2. If you must change behavior, add a **new** migration with a later timestamp (`YYYYMMDDHHMMSS_name`).
3. If Prisma lists modified migrations (examples once seen in dev: `20260205180000_support_ticket_metadata`, `20260509012000_affiliate_payout_account`, `20260509013500_affiliate_payout_account_verified_by_admin`, `20260509130000_customer_account_notification`, `20260510180000_affiliate_payout_account_change_request`, `20260510220000_notification_category_commission`, `20260511120000_partial_unique_pending_payout_change_request`), run `migrate dev` against a **non-production** DB to refresh the list, then fix by **reverting file content** to match the checksum stored in prod (query below) or restore from the deploy commit.

**Inspect applied checksums (read-only):**

```sql
SELECT migration_name, checksum, finished_at
FROM "_prisma_migrations"
ORDER BY finished_at;
```

Compare with `prisma migrate diff` or team git history for the migration file at deploy time.

---

## 6. Rollback notes

- Prisma Migrate does **not** provide automatic down migrations. Rollback is **forward**: write a new migration that reverses schema changes (drop column, restore old constraint, etc.).
- For failed **mid-migration** apply on production, follow [Prisma troubleshooting — failed migration](https://www.prisma.io/docs/guides/migrate/troubleshooting-development) and use `migrate resolve` only with a written runbook.

---

## 7. CI/CD safety (recommended jobs)

Run against a **throwaway Postgres** or Neon **branch** with `DATABASE_URL` set (same migrations applied or empty + `migrate deploy`):

```bash
npm run db:ci
```

Which expands to:

```bash
prisma validate && prisma generate && prisma migrate status
```

- **`prisma validate`**: schema syntax.
- **`prisma generate`**: client builds (catches schema errors).
- **`prisma migrate status`**: ensures migration history matches DB (fails if pending or failed migration state).

**Do not** run `migrate dev` in unattended production CI (interactive / shadow side effects). Use **`migrate deploy`** in deploy pipelines only.

Optional extended pipeline:

1. Spin ephemeral Postgres.
2. `npx prisma migrate deploy`
3. `npm run build` (includes `prisma generate`).

---

## 8. Future analytics / large tables

When adding **realtime events**, **queues**, **attribution**, **AI analytics**:

1. Prefer **new** migrations; avoid widening hot tables in the same migration as heavy backfills.
2. Use **concurrent** index creation where PostgreSQL supports it for large tables (`CREATE INDEX CONCURRENTLY` in raw SQL migrations with care).
3. Separate **schema migration** from **data backfill** jobs (scripts / workers) when rows are huge.
4. Keep **FK order** explicit: referenced table must exist in an **earlier** migration (or idempotent stub like `Order`/`Product` prerequisites).

---

## 9. Quick reference

| Goal | Command |
|------|---------|
| Check schema | `npm run prisma:validate` |
| Check migration state | `npm run db:migrate:status` |
| CI trio | `npm run db:ci` |
| Apply pending (prod) | `npx prisma migrate deploy` |
| Create migration (dev) | `npx prisma migrate dev --name descriptive_name` |

---

## 10. Drift & checksum status (operational)

- **Drift**: Expected on Neon production until optional baseline or incremental migrations close the gap with `schema.prisma`. **Deploy** remains the source of truth for *new* migrations; drift does not block `migrate deploy` by itself unless Prisma reports failed migrations.
- **Checksum**: Resolve on **dev clone** first by aligning files with production’s `_prisma_migrations`; do not mutate production rows except under runbook.

For questions, pair with whoever last ran production deploy and compare git SHAs of `prisma/migrations` to `_prisma_migrations`.

---

## 11. Affiliate public ingest logs (Phase 1.7)

Migration `20260512160000_affiliate_ingest_log_metrics` adds optional observability columns on `AffiliateTrackingIngestLog`: `latencyMs`, `payloadBytes`, `eventCount`. Apply with `migrate deploy` on each environment. Public routes `/api/affiliate/track`, `/api/affiliate/tracking/event`, and `/api/affiliate/tracking/session` write audit rows (best-effort, never blocks the HTTP response on log failure).
