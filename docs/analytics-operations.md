# Zendo — Affiliate analytics operations

Operations guide for hourly/daily aggregates, in-process job queue, caches, admin tools, and backups.

## Architecture (short)

1. **Raw events** — Affiliate traffic events are written at capture time.
2. **Aggregates** — Hourly and daily rollups power dashboards and admin analytics without scanning all raw rows per request.
3. **APIs** — CTV routes under `/api/account/affiliate/analytics/*`; admin analytics and system routes under `/api/admin/*`.
4. **Caching** — Lightweight in-memory caches for overview, traffic SQL summaries, admin overview, and realtime metrics (per Node process).
5. **Client** — CTV dashboard polls on an interval when the tab is visible; polling slows when the document is hidden.

For UI behavior (error boundaries, lazy charts, `next/image` thumbnails), see code under `src/components/storefront` and `src/components/analytics`.

## Cron and aggregation

- Cron (or a worker) should call your deployed **aggregate** endpoints on a fixed schedule (e.g. hourly for hourly rollup, nightly for daily). Exact paths depend on your API layout; align with the `jobHint` string returned by `GET /api/admin/system/health`.
- After deploys or long outages, use **Rebuild aggregate** from **Admin → Vận hành hệ thống** (with confirmation phrase) or enqueue the same job via your ops pipeline.

## Queue system

- Jobs are processed by an **in-memory** queue in the Node process (not a separate microservice).
- **Drain queue** runs a bounded number of steps — use after bulk enqueues or deploys.
- Watch **pending**, **delayed**, **failed** in the admin system operations UI or health JSON.

## Admin operations (mutations)

From **Vận hành hệ thống** (requires mutate permission):

- **Clear caches** — Drops analytics-related in-memory cache entries (safe).
- **Rebuild aggregate** — Enqueues hourly/daily rebuild windows (CPU/DB heavy; avoid spamming).
- **Cleanup realtime** — Trims stale realtime session rows per configured retention.
- **Cleanup orphan events** — Removes traffic events with no affiliate profile.
- **Purge raw events** — **Dangerous**; requires `AFFILIATE_PURGE_RAW_EVENTS=1` and typed confirmation.

All destructive actions use typed confirmation phrases to reduce accidents.

## Retention and storage

- Raw event retention vs aggregate retention is a product/ops decision; document your chosen **purge** window next to `purgeDays` in the admin UI.
- Prefer keeping aggregates longer than raw events once you trust rollup correctness.

## Backup and recovery

### Analytics backup (logical)

1. **Database**: regular snapshots of PostgreSQL including tables for traffic events, aggregates, and affiliate profiles.
2. **Exports**: CTV and admin CSV/Excel exports are **on-demand** backups of a slice of data — not a full substitute for DB backup.

### Export backup

- Schedule occasional manual exports for audit, or automate `curl` to export endpoints with a service token if you add one later (not shipped by default).

### Recovery checklist

1. Restore DB from last known-good snapshot to a staging instance first.
2. Run health + rebuild aggregates on staging; verify charts and totals.
3. Cut traffic to production, restore, run migrations if needed, rebuild aggregates, then restore traffic.
4. Invalidate CDN/browser caches if you serve stale static dashboards.

### Cleanup / rollback after bad deploy

1. Revert application version.
2. If a bad migration ran, restore DB from pre-migrate snapshot or apply a forward fix migration — coordinate with DBA.
3. Clear analytics caches and drain the job queue from admin UI once the app is healthy.

## Troubleshooting

| Symptom | Things to check |
|---------|------------------|
| Dashboard empty but no error | Session / affiliate profile ACTIVE; network tab for 401/403 on analytics APIs. |
| Charts stuck loading | Client dynamic import failed (JS error); check error boundary message; verify API returns `{ ok: true }`. |
| Stale numbers | Aggregation lag in health; run rebuild; verify cron still hits aggregate endpoints. |
| Queue growing | Failed jobs table in admin UI; DB connectivity; reduce rebuild frequency. |
| High DB load | Narrow rebuild windows; ensure indexes on aggregate query paths (see Prisma schema / migrations). |

## Security notes

- All `/api/admin/*` and destructive actions must remain **admin-authenticated** and **role-checked** in route handlers.
- CTV analytics routes must scope data to the authenticated affiliate only.
- Rate-limit or monitor **export** and **rebuild** usage to prevent operational abuse.

For generic deploy steps, see `docs/deployment.md`.
