import "server-only";

import type { PrismaClient } from "@prisma/client";

type CacheEntry<T> = { atMs: number; value: T };

const cache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string, ttlMs: number): T | null {
  const hit = cache.get(key) as CacheEntry<T> | undefined;
  if (!hit) return null;
  if (Date.now() - hit.atMs > ttlMs) return null;
  return hit.value;
}

function setCached<T>(key: string, value: T): void {
  cache.set(key, { atMs: Date.now(), value });
}

export function clearAffiliateRealtimeMetricsCache(): void {
  cache.clear();
}

export function getAffiliateRealtimeMetricsCacheSize(): number {
  return cache.size;
}

export type AffiliateRealtimeMetrics = {
  onlineVisitors: number;
  activeSessions: number;
  clicksLast5m: number;
  conversionsLast5m: number;
  revenueLast5m: number;
};

export async function getAffiliateRealtimeMetrics(args: {
  db: PrismaClient;
  affiliateProfileId: string;
}): Promise<AffiliateRealtimeMetrics> {
  const key = `rt:${args.affiliateProfileId}`;
  const cached = getCached<AffiliateRealtimeMetrics>(key, 14_000);
  if (cached) return cached;

  const now = Date.now();
  const activeWindow = new Date(now - 5 * 60_000);

  const [sessionRows, metricRows] = await Promise.all([
    args.db.$queryRaw<{ activeSessions: bigint }[]>`
      SELECT COUNT(*)::bigint AS "activeSessions"
      FROM "AffiliateRealtimeSession"
      WHERE "affiliateProfileId" = ${args.affiliateProfileId}
        AND "lastSeenAt" >= ${activeWindow}
    `,
    args.db.$queryRaw<{ clicksLast5m: bigint; conversionsLast5m: bigint; revenueLast5m: string | null }[]>`
      SELECT
        COUNT(*) FILTER (WHERE "eventType" = 'AFFILIATE_CLICK')::bigint AS "clicksLast5m",
        COUNT(*) FILTER (WHERE "eventType" = 'ORDER_PAID')::bigint AS "conversionsLast5m",
        SUM(CASE WHEN "eventType" = 'ORDER_PAID' THEN COALESCE("revenue", 0) ELSE 0 END)::text AS "revenueLast5m"
      FROM "AffiliateTrafficEvent"
      WHERE "affiliateProfileId" = ${args.affiliateProfileId}
        AND "createdAt" >= ${activeWindow}
        AND "eventType" IN ('AFFILIATE_CLICK', 'ORDER_PAID')
    `,
  ]);
  const activeSessions = Number(sessionRows[0]?.activeSessions ?? 0);
  const metric = metricRows[0];

  const out: AffiliateRealtimeMetrics = {
    // visitorKey chưa bắt buộc ở phase 1, nên onlineVisitors tạm dùng sessions
    onlineVisitors: activeSessions,
    activeSessions,
    clicksLast5m: Number(metric?.clicksLast5m ?? 0),
    conversionsLast5m: Number(metric?.conversionsLast5m ?? 0),
    revenueLast5m: Number(metric?.revenueLast5m ?? 0),
  };

  setCached(key, out);
  return out;
}

