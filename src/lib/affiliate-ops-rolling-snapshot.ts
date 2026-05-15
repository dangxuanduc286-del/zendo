import "server-only";

import type { PrismaClient } from "@prisma/client";
import type { OpsRollingCounts } from "@/lib/affiliate-ops-anomaly-types";
import { fetchAffiliateOpsRollingCounts } from "@/lib/affiliate-ops-rolling-counts";
import { readAffiliateOpsRollingFromRedis, shouldAffiliateOpsUseRedisRolling } from "@/lib/affiliate-ops-redis-rolling";

/**
 * Prefer Redis minute buckets (worker-maintained). Falls back to DB aggregates when Redis is off or unreadable.
 */
export async function fetchAffiliateOpsRollingSnapshot(args: {
  db: PrismaClient;
  affiliateProfileId: string;
}): Promise<OpsRollingCounts> {
  if (shouldAffiliateOpsUseRedisRolling()) {
    const redis = await readAffiliateOpsRollingFromRedis(args.affiliateProfileId);
    if (redis) return redis;
  }
  const dbRow = await fetchAffiliateOpsRollingCounts(args);
  return { ...dbRow, source: "db" };
}
