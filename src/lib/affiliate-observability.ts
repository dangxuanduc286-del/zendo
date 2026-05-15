import "server-only";

import { affiliateSharedCacheMemorySize } from "@/lib/affiliate-shared-cache";
import { getRedis } from "@/lib/redis";
import { redisPing } from "@/lib/redis";

type Counter = { n: number; sumMs: number; maxMs: number };

const slowRequests = new Map<string, Counter>();
const cacheHits = { hit: 0, miss: 0 };

let cacheRedisLayer = 0;
/** Đọc từ L2 khi Redis không lỗi (miss Redis hoặc không cấu hình). */
let cacheMemoryCleanLayer = 0;
/** Đọc từ L2 sau khi Redis lỗi. */
let cacheMemoryFallbackLayer = 0;
let cacheMissLayer = 0;

const labelHits = new Map<string, number>();
const MAX_LABEL_KEYS = 50;

export function recordAffiliateSlowRequest(args: { route: string; ms: number; thresholdMs?: number }): void {
  const th = args.thresholdMs ?? 1500;
  if (args.ms < th) return;
  const cur = slowRequests.get(args.route) ?? { n: 0, sumMs: 0, maxMs: 0 };
  cur.n += 1;
  cur.sumMs += args.ms;
  cur.maxMs = Math.max(cur.maxMs, args.ms);
  slowRequests.set(args.route, cur);
}

/** @deprecated Dùng recordAffiliateCacheLayer khi có nguồn; vẫn cập nhật tổng hit/miss. */
export function recordAffiliateCacheHit(hit: boolean): void {
  if (hit) cacheHits.hit += 1;
  else cacheHits.miss += 1;
}

export function recordAffiliateCacheLayer(
  layer: "redis" | "memory" | "memory_fallback" | "miss",
  label?: string,
): void {
  if (layer === "miss") {
    cacheMissLayer += 1;
    recordAffiliateCacheHit(false);
    return;
  }
  recordAffiliateCacheHit(true);
  if (layer === "redis") cacheRedisLayer += 1;
  else if (layer === "memory_fallback") cacheMemoryFallbackLayer += 1;
  else cacheMemoryCleanLayer += 1;
  if (label) bumpAffiliateCacheLabel(label);
}

function bumpAffiliateCacheLabel(label: string): void {
  const k = label.trim().slice(0, 64);
  if (!k) return;
  labelHits.set(k, (labelHits.get(k) ?? 0) + 1);
  if (labelHits.size <= MAX_LABEL_KEYS) return;
  let minK = "";
  let minV = Infinity;
  for (const [lk, v] of labelHits) {
    if (v < minV) {
      minV = v;
      minK = lk;
    }
  }
  if (minK) labelHits.delete(minK);
}

export type AffiliateObservabilitySnapshot = {
  redisConfigured: boolean;
  redisPing: { ok: boolean; ms: number; error?: string } | null;
  sharedCacheMemoryEntries: number;
  cacheHitMiss: { hit: number; miss: number };
  cacheLayers: {
    redis: number;
    memory: number;
    memoryFallback: number;
    miss: number;
    /** memory + memoryFallback */
    memoryTotal: number;
  };
  cacheHitRatio: number | null;
  topCacheLabels: Array<{ label: string; hits: number }>;
  slowRequestBuckets: Array<{ route: string; count: number; avgMs: number; maxMs: number }>;
};

export async function getAffiliateObservabilitySnapshot(): Promise<AffiliateObservabilitySnapshot> {
  const redisConfigured = Boolean(process.env.REDIS_URL?.trim());
  let redisPingResult: AffiliateObservabilitySnapshot["redisPing"] = null;
  if (getRedis() || redisConfigured) {
    redisPingResult = await redisPing();
  }
  const buckets = [...slowRequests.entries()].map(([route, c]) => ({
    route,
    count: c.n,
    avgMs: c.n > 0 ? Math.round(c.sumMs / c.n) : 0,
    maxMs: c.maxMs,
  }));
  const memoryTotal = cacheMemoryCleanLayer + cacheMemoryFallbackLayer;
  const hits = cacheRedisLayer + memoryTotal;
  const denom = hits + cacheMissLayer;
  const topCacheLabels = [...labelHits.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([label, hitsN]) => ({ label, hits: hitsN }));
  return {
    redisConfigured,
    redisPing: redisPingResult,
    sharedCacheMemoryEntries: affiliateSharedCacheMemorySize(),
    cacheHitMiss: { ...cacheHits },
    cacheLayers: {
      redis: cacheRedisLayer,
      memory: cacheMemoryCleanLayer,
      memoryFallback: cacheMemoryFallbackLayer,
      miss: cacheMissLayer,
      memoryTotal,
    },
    cacheHitRatio: denom > 0 ? Math.round((hits / denom) * 1000) / 1000 : null,
    topCacheLabels,
    slowRequestBuckets: buckets.sort((a, b) => b.count - a.count).slice(0, 30),
  };
}
