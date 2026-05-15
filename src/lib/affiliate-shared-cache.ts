import "server-only";

import { getRedis } from "@/lib/redis";

type MemEntry = { at: number; value: string };
const memoryL2 = new Map<string, MemEntry>();

const DEFAULT_MEMORY_TTL_MS = 120_000;

export type AffiliateSharedCacheReadResult<T> = {
  data: T | null;
  source: "redis" | "memory" | "miss";
  /** true nếu Redis được cấu hình nhưng lệnh đọc lỗi (đã thử L2). */
  redisHadError: boolean;
};

/**
 * Đọc cache kèm nguồn (Redis vs memory) cho observability.
 */
export async function affiliateSharedCacheReadJson<T>(args: {
  key: string;
  memoryTtlMs?: number;
}): Promise<AffiliateSharedCacheReadResult<T>> {
  const redis = getRedis();
  const memTtl = args.memoryTtlMs ?? DEFAULT_MEMORY_TTL_MS;
  const fullKey = `zendo:cache:v1:${args.key}`.slice(0, 250);
  let redisHadError = false;
  if (redis) {
    try {
      await redis.connect().catch(() => {});
      const raw = await redis.get(fullKey);
      if (raw) {
        try {
          return { data: JSON.parse(raw) as T, source: "redis", redisHadError: false };
        } catch {
          redisHadError = true;
        }
      }
    } catch {
      redisHadError = true;
    }
  }
  const m = memoryL2.get(fullKey);
  if (m && Date.now() - m.at < memTtl) {
    try {
      return { data: JSON.parse(m.value) as T, source: "memory", redisHadError };
    } catch {
      return { data: null, source: "miss", redisHadError };
    }
  }
  return { data: null, source: "miss", redisHadError };
}

/**
 * Cache JSON: Redis string + TTL; fallback bộ nhớ khi Redis lỗi / tắt.
 */
export async function affiliateSharedCacheGetJson<T>(args: {
  key: string;
  memoryTtlMs?: number;
}): Promise<T | null> {
  const r = await affiliateSharedCacheReadJson<T>(args);
  return r.data;
}

export async function affiliateSharedCacheSetJson(args: {
  key: string;
  value: unknown;
  ttlMs: number;
  memoryTtlMs?: number;
}): Promise<void> {
  const redis = getRedis();
  const fullKey = `zendo:cache:v1:${args.key}`.slice(0, 250);
  const str = JSON.stringify(args.value);
  const memTtl = args.memoryTtlMs ?? Math.min(DEFAULT_MEMORY_TTL_MS, args.ttlMs);
  memoryL2.set(fullKey, { at: Date.now(), value: str });
  if (memoryL2.size > 5000) {
    const now = Date.now();
    for (const [k, v] of memoryL2) {
      if (now - v.at > memTtl) memoryL2.delete(k);
    }
  }
  if (!redis) return;
  try {
    await redis.connect().catch(() => {});
    const ttl = Math.max(1000, Math.min(args.ttlMs, 86_400_000));
    await redis.set(fullKey, str, "PX", ttl);
  } catch {
    /* Redis không ghi được — dữ liệu vẫn ở L2 memory */
  }
}

export function affiliateSharedCacheMemorySize(): number {
  return memoryL2.size;
}
