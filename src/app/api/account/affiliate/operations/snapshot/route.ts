import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { applyAffiliateOpsAlertSuppression } from "@/lib/affiliate-ops-alert-suppression";
import { computeAffiliateOpsAnomalies } from "@/lib/affiliate-ops-anomaly-engine";
import { isAffiliateBullMqEnabled } from "@/lib/affiliate-bullmq-queue";
import { fetchAffiliateOpsRollingSnapshot } from "@/lib/affiliate-ops-rolling-snapshot";
import { fetchAttributionStateBreakdown } from "@/lib/affiliate-attribution-account-queries";
import { getAffiliateTrackingSseMetrics } from "@/lib/affiliate-tracking-sse";
import { getTrackingQueueCounts } from "@/lib/affiliate-tracking-bullmq";
import { getConversionDispatchQueueCounts } from "@/lib/affiliate-conversion-dispatch-bullmq";
import { redisPing } from "@/lib/redis";
import {
  applyAnalyticsRateLimit,
  isAffiliateAuthErr,
  rateLimitRetryAfter,
  requireActiveAffiliateProfileId,
} from "../../analytics/_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const auth = await requireActiveAffiliateProfileId();
  if (isAffiliateAuthErr(auth)) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status });
  }

  const rl = await applyAnalyticsRateLimit({ key: `ops:${auth.customerId}`, windowMs: 60_000, max: 40 });
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, message: "Quá nhanh." },
      { status: 429, headers: { "Retry-After": String(rateLimitRetryAfter(rl)) } },
    );
  }

  const since24 = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const since1h = new Date(Date.now() - 60 * 60 * 1000);
  const since2h = new Date(Date.now() - 2 * 60 * 60 * 1000);

  try {
    const [
      redis,
      queues,
      dlqCount24,
      dlqCount1h,
      ingestSamples,
      sse,
      rolling,
      pixels,
      convTraffic2h,
      attrLastClick2h,
      attribution24h,
      capiQueue,
      capiJobs24,
      fraudOpenCases24h,
    ] = await Promise.all([
      redisPing(),
      isAffiliateBullMqEnabled() ? getTrackingQueueCounts() : Promise.resolve(null),
      db.affiliateTrackingIngestLog.count({
        where: {
          affiliateProfileId: auth.affiliateProfileId,
          success: false,
          createdAt: { gte: since24 },
          message: { contains: "dlq:", mode: "insensitive" },
        },
      }),
      db.affiliateTrackingIngestLog.count({
        where: {
          affiliateProfileId: auth.affiliateProfileId,
          success: false,
          createdAt: { gte: since1h },
          message: { contains: "dlq:", mode: "insensitive" },
        },
      }),
      db.affiliateTrackingIngestLog.findMany({
        where: {
          affiliateProfileId: auth.affiliateProfileId,
          success: true,
          route: "/api/affiliate/track",
          latencyMs: { not: null },
          createdAt: { gte: since24 },
        },
        orderBy: { createdAt: "desc" },
        take: 48,
        select: { latencyMs: true },
      }),
      Promise.resolve(getAffiliateTrackingSseMetrics()),
      fetchAffiliateOpsRollingSnapshot({ db, affiliateProfileId: auth.affiliateProfileId }),
      db.affiliatePixelIntegration.findMany({
        where: { affiliateProfileId: auth.affiliateProfileId },
        select: { provider: true, status: true, lastEventAt: true, lastHealthAt: true },
      }),
      db.affiliateTrafficEvent.count({
        where: {
          affiliateProfileId: auth.affiliateProfileId,
          eventType: "ORDER_PAID",
          createdAt: { gte: since2h },
        },
      }),
      db.affiliateAttribution.count({
        where: {
          affiliateProfileId: auth.affiliateProfileId,
          OR: [{ model: "last_click" }, { model: "last_touch" }],
          createdAt: { gte: since2h },
        },
      }),
      fetchAttributionStateBreakdown({ db, affiliateProfileId: auth.affiliateProfileId, since: since24 }),
      isAffiliateBullMqEnabled() ? getConversionDispatchQueueCounts() : Promise.resolve(null),
      db.conversionDispatchJob.groupBy({
        by: ["status"],
        where: { affiliateProfileId: auth.affiliateProfileId, createdAt: { gte: since24 } },
        _count: { _all: true },
      }),
      db.affiliateFraudCase.count({
        where: {
          affiliateProfileId: auth.affiliateProfileId,
          status: "OPEN",
          openedAt: { gte: since24 },
        },
      }),
    ]);

    const latencies = ingestSamples.map((r) => r.latencyMs).filter((n): n is number => n != null && n >= 0);
    const sorted = [...latencies].sort((a, b) => a - b);
    const ingestLatencyP50 =
      sorted.length === 0 ? null : sorted[Math.floor(sorted.length / 2)] ?? null;
    const ingestLatencyP90 =
      sorted.length === 0 ? null : sorted[Math.floor(sorted.length * 0.9)] ?? sorted[sorted.length - 1] ?? null;

    const qIn = queues?.ingest;
    const qAt = queues?.attribution;
    const qCapi = capiQueue;

    const capiDlq24 = capiJobs24.find((r) => r.status === "DLQ")?._count._all ?? 0;
    const capiFailed24 = capiJobs24.find((r) => r.status === "FAILED")?._count._all ?? 0;

    const rawAlerts = computeAffiliateOpsAnomalies({
      rolling,
      redisOk: redis.ok,
      ingestLatencyP50Ms: ingestLatencyP50,
      ingestLatencyP90Ms: ingestLatencyP90,
      dlq24h: dlqCount24,
      dlq1h: dlqCount1h,
      queueIngestWaiting: qIn?.waiting ?? null,
      queueAttrWaiting: qAt?.waiting ?? null,
      queueIngestFailed: qIn?.failed ?? null,
      queueAttrFailed: qAt?.failed ?? null,
      convTraffic2h,
      attrLastClick2h,
      attribution24h,
      pixels: pixels.map((p) => ({
        provider: p.provider,
        status: p.status,
        lastEventAt: p.lastEventAt?.toISOString() ?? null,
        lastHealthAt: p.lastHealthAt?.toISOString() ?? null,
      })),
      conversionDispatchQueueWaiting: qCapi?.waiting ?? null,
      conversionDispatchQueueFailed: qCapi?.failed ?? null,
      capiJobDlq24h: capiDlq24,
      capiJobFailed24h: capiFailed24,
      fraudOpenCases24h: fraudOpenCases24h,
    });

    const { alerts, suppressedCount } = await applyAffiliateOpsAlertSuppression({
      affiliateProfileId: auth.affiliateProfileId,
      alerts: rawAlerts,
    });

    return NextResponse.json(
      {
        ok: true as const,
        redis: { ok: redis.ok, ms: redis.ms },
        bullMqEnabled: isAffiliateBullMqEnabled(),
        trackingQueues: queues,
        conversionDispatchQueue: capiQueue,
        capiJobs24h: Object.fromEntries(capiJobs24.map((r) => [r.status, r._count._all])) as Record<string, number>,
        fraudOpenCases24h,
        sse,
        dlq24h: dlqCount24,
        dlq1h: dlqCount1h,
        ingestLatencyP50Ms: ingestLatencyP50,
        ingestLatencyP90Ms: ingestLatencyP90,
        rolling,
        alerts,
        alertsSuppressedCount: suppressedCount,
        attribution24h,
      },
      { status: 200, headers: { "Cache-Control": "private, no-store, max-age=0" } },
    );
  } catch {
    return NextResponse.json({ ok: false, message: "Không đọc được snapshot vận hành." }, { status: 500 });
  }
}
