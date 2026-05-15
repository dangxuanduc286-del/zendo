import "server-only";

import { getRedis } from "@/lib/redis";

type MemState = { windowStartMs: number; count: number };
const memoryBuckets = new Map<string, MemState>();

function memKey(scope: string, key: string): string {
  return `${scope}::${key}`.slice(0, 240);
}

function applyMemoryFixedWindow(args: {
  scope: string;
  key: string;
  windowMs: number;
  max: number;
}): { ok: true } | { ok: false; retryAfterSec: number } {
  const k = memKey(args.scope, args.key);
  const now = Date.now();
  const cur = memoryBuckets.get(k);
  if (!cur || now - cur.windowStartMs >= args.windowMs) {
    memoryBuckets.set(k, { windowStartMs: now, count: 1 });
    return { ok: true } as const;
  }
  if (cur.count >= args.max) {
    const leftMs = Math.max(0, args.windowMs - (now - cur.windowStartMs));
    return { ok: false as const, retryAfterSec: Math.ceil(leftMs / 1000) };
  }
  cur.count += 1;
  return { ok: true } as const;
}

/**
 * Rate limit cửa sổ cố định: Redis INCR + EXPIRE khi có Redis; fallback Map (multi-instance không đồng bộ).
 */
export async function applySharedRateLimit(args: {
  scope: string;
  key: string;
  windowMs: number;
  max: number;
}): Promise<{ ok: true } | { ok: false; retryAfterSec: number }> {
  const redis = getRedis();
  const rkey = `zendo:rl:v1:${args.scope}:${args.key}`.slice(0, 250);
  if (!redis) {
    return applyMemoryFixedWindow(args);
  }
  try {
    await redis.connect().catch(() => {});
    const n = await redis.incr(rkey);
    if (n === 1) {
      await redis.pexpire(rkey, Math.max(1000, Math.min(args.windowMs, 86_400_000)));
    }
    if (n > args.max) {
      const ttl = await redis.pttl(rkey);
      const retryAfterSec = Math.max(1, Math.ceil((ttl > 0 ? ttl : args.windowMs) / 1000));
      return { ok: false, retryAfterSec } as const;
    }
    return { ok: true } as const;
  } catch {
    return applyMemoryFixedWindow(args);
  }
}

export function rateLimitRetryAfter(rl: { ok: true } | { ok: false; retryAfterSec: number }): number {
  return "retryAfterSec" in rl ? rl.retryAfterSec : 1;
}
