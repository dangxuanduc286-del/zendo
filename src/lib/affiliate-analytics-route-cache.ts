import "server-only";

import { createHash } from "crypto";
import { profileAffiliateQuery } from "@/lib/affiliate-query-profiler";
import {
  affiliateSharedCacheReadJson,
  affiliateSharedCacheSetJson,
} from "@/lib/affiliate-shared-cache";
import { recordAffiliateCacheLayer } from "@/lib/affiliate-observability";

/** TTL (ms) theo loại dữ liệu affiliate analytics. */
export const AFFILIATE_ANALYTICS_CACHE_TTL_MS = {
  realtime: 20_000,
  overview: 52_000,
  chart: 75_000,
  growthInsights: 90_000,
  topList: 60_000,
  campaignAnalytics: 60_000,
} as const;

function hashParts(parts: Record<string, string | number | undefined | null>): string {
  const entries = Object.entries(parts)
    .filter(([, v]) => v != null && v !== "")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${String(v)}`);
  return createHash("sha256").update(entries.join("&")).digest("hex").slice(0, 22);
}

/**
 * Cache Redis + L2 memory; key scoped theo affiliateProfileId (chống lộ tenant).
 */
export async function withAffiliateAnalyticsCache<T>(args: {
  affiliateProfileId: string;
  segment: string;
  parts: Record<string, string | number | undefined | null>;
  ttlMs: number;
  memoryTtlMs?: number;
  obsLabel: string;
  compute: () => Promise<T>;
}): Promise<T> {
  const h = hashParts(args.parts);
  const key = `aff:a:${args.affiliateProfileId}:${args.segment}:${h}`;
  const memTtl = args.memoryTtlMs ?? Math.min(120_000, args.ttlMs + 20_000);
  const read = await affiliateSharedCacheReadJson<T>({ key, memoryTtlMs: memTtl });
  if (read.data != null) {
    if (read.source === "redis") recordAffiliateCacheLayer("redis", args.obsLabel);
    else if (read.redisHadError) recordAffiliateCacheLayer("memory_fallback", args.obsLabel);
    else recordAffiliateCacheLayer("memory", args.obsLabel);
    return read.data;
  }
  recordAffiliateCacheLayer("miss", args.obsLabel);
  const built = await profileAffiliateQuery(args.obsLabel, args.compute);
  await affiliateSharedCacheSetJson({ key, value: built as unknown, ttlMs: args.ttlMs, memoryTtlMs: memTtl });
  return built;
}
