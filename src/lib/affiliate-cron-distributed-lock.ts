import "server-only";

import { getRedis } from "@/lib/redis";

const LOCK_KEY = "zendo:cron:v1:affiliate-analytics";
const DEFAULT_TTL_SEC = 300;

/**
 * Khóa cron phân tán (multi-instance). TTL mặc định 5 phút.
 */
export async function acquireAffiliateCronLock(args?: { ttlSec?: number }): Promise<boolean> {
  const r = getRedis();
  if (!r) return true;
  const ttl = Math.min(3600, Math.max(30, args?.ttlSec ?? DEFAULT_TTL_SEC));
  try {
    await r.connect().catch(() => {});
    const ok = await r.set(LOCK_KEY, String(Date.now()), "EX", ttl, "NX");
    return ok === "OK";
  } catch {
    return true;
  }
}

export async function releaseAffiliateCronLock(): Promise<void> {
  const r = getRedis();
  if (!r) return;
  try {
    await r.del(LOCK_KEY);
  } catch {
    /* ignore */
  }
}
