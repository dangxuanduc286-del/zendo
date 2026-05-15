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

  const [activeSessions, clicksLast5m, conversionsLast5m, revenueAgg] = await Promise.all([
    args.db.affiliateRealtimeSession.count({
      where: { affiliateProfileId: args.affiliateProfileId, lastSeenAt: { gte: activeWindow } },
    }),
    args.db.affiliateTrafficEvent.count({
      where: {
        affiliateProfileId: args.affiliateProfileId,
        createdAt: { gte: activeWindow },
        eventType: "AFFILIATE_CLICK",
      },
    }),
    args.db.affiliateTrafficEvent.count({
      where: {
        affiliateProfileId: args.affiliateProfileId,
        createdAt: { gte: activeWindow },
        eventType: "ORDER_PAID",
      },
    }),
    args.db.affiliateTrafficEvent.aggregate({
      where: {
        affiliateProfileId: args.affiliateProfileId,
        createdAt: { gte: activeWindow },
        eventType: "ORDER_PAID",
      },
      _sum: { revenue: true },
    }),
  ]);

  const out: AffiliateRealtimeMetrics = {
    // visitorKey chưa bắt buộc ở phase 1, nên onlineVisitors tạm dùng sessions
    onlineVisitors: activeSessions,
    activeSessions,
    clicksLast5m,
    conversionsLast5m,
    revenueLast5m: Number(revenueAgg._sum.revenue ?? 0),
  };

  setCached(key, out);
  return out;
}

