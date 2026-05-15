# Phase 12 — Scale & infrastructure (affiliate / analytics)

Tài liệu tóm tắt cho production: Redis, BullMQ, cache, cron, deploy và vận hành.

## Redis

- Biến: `REDIS_URL` (ioredis singleton trong `src/lib/redis.ts`).
- Dùng cho: rate limit chung (`rate-limit-shared`), cache JSON (`affiliate-shared-cache`), khóa cron (`affiliate-cron-distributed-lock`), audit ops (Redis list + fallback bộ nhớ), BullMQ (connection riêng trong `affiliate-bullmq-queue.ts`).
- Khi Redis lỗi hoặc không cấu hình: fallback bộ nhớ cục bộ (multi-instance không đồng bộ — cần Redis cho production scale-out).

## BullMQ

- Bật khi: `REDIS_URL` có giá trị và `AFFILIATE_BULLMQ !== "0"`.
- Queue: `affiliate-analytics` (`src/lib/affiliate-bullmq-queue.ts`).
- Worker tách process: `npm run affiliate:worker` (`scripts/affiliate-bullmq-worker.ts`). Có thể tăng `AFFILIATE_WORKER_CONCURRENCY` (1–8).
- API vẫn gọi `enqueueAffiliateJob` / `drainAffiliateJobQueue` (`affiliate-job-queue.ts`); enqueue thử Bull trước, lỗi thì in-memory.

## Cron

- `npm run affiliate:cron` — trước khi chạy task, lấy khóa Redis `acquireAffiliateCronLock` (TTL mặc định 5 phút trong lib; script cron dùng TTL 900s). Nếu không chiếm được khóa: thoát với `skipped: cron_lock_held`.
- Không Redis: lock luôn “pass” (nhiều instance có thể chạy trùng — chỉ dùng cho dev hoặc chấp nhận rủi ro).

## Cache & rate limit

- Cache: `affiliate-shared-cache` (Redis + L2 memory).
- **Analytics API (Redis shared):** `withAffiliateAnalyticsCache` trong `affiliate-analytics-route-cache.ts` — key theo `affiliateProfileId` + segment + hash tham số (chống lộ tenant / poisoning). TTL: realtime panel ~12s, overview ~52s, chart ~75s, top lists ~60s, growth insights ~90s, campaign analytics ~60s; overview vẫn gọi realtime metrics tươi qua `getAffiliateRealtimeMetrics` (cache ngắn nội bộ).
- Rate limit: `applySharedRateLimit` — analytics API, admin system ops, `POST /api/affiliate/track`.
- Export: `checkAffiliateExportThrottle` + `applyAnalyticsRateLimit` trên route export.

## Observability & admin

- `src/lib/affiliate-observability.ts` — slow routes, Redis ping, **tầng cache** (redis / memory / fallback sau lỗi Redis / miss), **hit ratio**, **top label** (nhãn route cache), kích thước L2.
- Admin: `/admin/system-operations` gọi `/api/admin/system/health`, `jobs`, `cache`, `affiliate-infra` (infra hiển thị hit ratio, tầng cache, top labels, queue lag heuristic).

## Database

- `AffiliateTrafficEvent` đã có index theo `affiliateProfileId + createdAt`, `eventType + createdAt`, v.v. (xem migrations).
- Purge raw events: thao tác admin + job `PURGE_OLD_RAW_EVENTS` (cần env an toàn theo code hiện tại).

## Deployment checklist

1. `DATABASE_URL`, `REDIS_URL` production.
2. `AFFILIATE_BULLMQ` không đặt `0` nếu muốn queue Redis.
3. Chạy worker: `affiliate:worker` (PM2 / systemd / container riêng).
4. Cron: một lịch `affiliate:cron` (khóa Redis tránh chạy song song).
5. `NEXT_PUBLIC_R2_PUBLIC_BASE_URL` cho `next/image` remote patterns.

## Rollback checklist

1. Tắt worker BullMQ (dừng process).
2. Đặt `AFFILIATE_BULLMQ=0` — app fallback in-memory queue (không phù hợp multi-instance lâu dài).
3. Giữ `REDIS_URL` nếu vẫn cần rate limit/cache chung; hoặc gỡ Redis và chấp nhận fallback cục bộ.

## Backup & DR (gợi ý)

- Backup Postgres theo lịch (snapshot + PITR nếu có).
- Redis: persistence tùy nhà cung (AOF/RDB) nếu queue/critical; queue Bull có thể tái enqueue từ cron/rebuild.
- Tài liệu RTO/RPO theo chính sách nội bộ.

## Build verify

```bash
npm run lint
npx tsc --noEmit
npm run build
```
