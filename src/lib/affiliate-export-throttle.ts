import "server-only";

import { getRedis } from "@/lib/redis";

const mem = new Map<string, number>();

function hourBucket(): string {
  return String(Math.floor(Date.now() / 3600000));
}

/**
 * Giới hạn export theo affiliateProfileId theo giờ (chống spam / abuse). Redis + fallback bộ nhớ.
 */
export async function checkAffiliateExportThrottle(args: {
  affiliateProfileId: string;
  maxPerHour: number;
}): Promise<{ ok: true } | { ok: false; retryAfterSec: number }> {
  const key = `zendo:ex:v1:${args.affiliateProfileId}:${hourBucket()}`.slice(0, 200);
  const r = getRedis();
  if (r) {
    try {
      await r.connect().catch(() => {});
      const n = await r.incr(key);
      if (n === 1) await r.expire(key, 4000);
      if (n > args.maxPerHour) {
        const ttl = await r.ttl(key);
        return { ok: false, retryAfterSec: Math.max(60, ttl > 0 ? ttl : 3600) } as const;
      }
      return { ok: true } as const;
    } catch {
      /* memory */
    }
  }
  const cur = mem.get(key) ?? 0;
  if (cur >= args.maxPerHour) {
    return { ok: false, retryAfterSec: 3600 } as const;
  }
  mem.set(key, cur + 1);
  return { ok: true } as const;
}
