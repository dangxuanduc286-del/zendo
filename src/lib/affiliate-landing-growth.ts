import "server-only";

import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { rangeStart, type RangeKey } from "@/lib/affiliate-analytics";
import type { AffiliateTrafficQueryFilters } from "@/lib/affiliate-traffic-filters";
import { getAffiliateLandingAnalytics, sqlTrafficSourceBucket } from "@/lib/affiliate-traffic-analytics";

const CACHE_TTL_MS = 45_000;
const cache = new Map<string, { at: number; value: unknown }>();

function cacheGet<T>(key: string): T | null {
  const h = cache.get(key);
  if (!h || Date.now() - h.at > CACHE_TTL_MS) return null;
  return h.value as T;
}

function cacheSet(key: string, value: unknown): void {
  cache.set(key, { at: Date.now(), value });
}


export type LandingGrowthRow = {
  pathname: string;
  visits: number;
  clicks: number;
  orders: number;
  revenue: number;
  commission: number;
  conversionRate: number;
  epc: number;
  topSource: string | null;
};

async function fetchTopSourceByPathname(args: {
  db: PrismaClient;
  affiliateProfileId: string;
  since: Date;
  range: RangeKey;
}): Promise<Map<string, string>> {
  const key = `landsrc:${args.affiliateProfileId}:${args.range}`;
  const hit = cacheGet<Map<string, string>>(key);
  if (hit) return hit;

  const bucket = sqlTrafficSourceBucket();
  const rows = await args.db.$queryRaw<{ pathname: string; src: string }[]>(Prisma.sql`
    WITH src_counts AS (
      SELECT
        e.pathname AS pathname,
        (${bucket}) AS src,
        COUNT(*)::bigint AS cnt
      FROM "AffiliateTrafficEvent" e
      WHERE e."affiliateProfileId" = ${args.affiliateProfileId}
        AND e."createdAt" >= ${args.since}
        AND e."eventType" = 'AFFILIATE_CLICK'
        AND e.pathname IS NOT NULL
      GROUP BY e.pathname, (${bucket})
    ),
    ranked AS (
      SELECT
        pathname,
        src,
        cnt,
        ROW_NUMBER() OVER (PARTITION BY pathname ORDER BY cnt DESC) AS rn
      FROM src_counts
    )
    SELECT pathname, src FROM ranked WHERE rn = 1
    LIMIT 200
  `);

  const map = new Map<string, string>();
  for (const r of rows) {
    map.set(String(r.pathname), String(r.src));
  }
  cacheSet(key, map);
  return map;
}

/**
 * Landing tối ưu: EPC (commission/click) + nguồn mạnh nhất theo pathname — 2 query, không N+1.
 */
export async function getAffiliateLandingGrowthRows(args: {
  db: PrismaClient;
  affiliateProfileId: string;
  range: RangeKey;
  filters: AffiliateTrafficQueryFilters;
  take: number;
}): Promise<LandingGrowthRow[]> {
  const since = rangeStart(args.range);
  const key = `landgrow:${args.affiliateProfileId}:${args.range}:${JSON.stringify(args.filters)}:${args.take}`;
  const hit = cacheGet<LandingGrowthRow[]>(key);
  if (hit) return hit;

  const [landings, topSrc] = await Promise.all([
    getAffiliateLandingAnalytics({
      db: args.db,
      affiliateProfileId: args.affiliateProfileId,
      range: args.range,
      filters: args.filters,
      take: Math.min(60, Math.max(1, args.take)),
      skip: 0,
    }),
    fetchTopSourceByPathname({ db: args.db, affiliateProfileId: args.affiliateProfileId, since, range: args.range }),
  ]);

  const rows: LandingGrowthRow[] = landings.map((r) => {
    const epc = r.clicks > 0 ? r.commission / r.clicks : 0;
    return {
      ...r,
      epc,
      topSource: topSrc.get(r.pathname) ?? null,
    };
  });
  rows.sort((a, b) => b.epc - a.epc);
  cacheSet(key, rows);  return rows;
}
