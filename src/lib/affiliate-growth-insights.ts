import "server-only";

import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { rangeStart, type RangeKey } from "@/lib/affiliate-analytics";
import { getAffiliateCampaignStatsByCampaign } from "@/lib/affiliate-campaign-analytics";
import { getAffiliateLandingGrowthRows } from "@/lib/affiliate-landing-growth";
import { getAffiliateRevenueInsights } from "@/lib/affiliate-revenue-insights";
import { getAffiliateTrafficSources } from "@/lib/affiliate-traffic-analytics";
import { parseAffiliateTrafficFilters } from "@/lib/affiliate-traffic-filters";


export type AffiliateGrowthInsightsPayload = {
  bestSource: string | null;
  bestCampaign: { id: string; name: string; commission: number } | null;
  bestLanding: { pathname: string; epc: number; topSource: string | null } | null;
  strongestHourLabel: string | null;
  trendingProductName: string | null;
};

export async function getAffiliateGrowthInsightsPack(args: {
  db: PrismaClient;
  affiliateProfileId: string;
  range: RangeKey;
}): Promise<AffiliateGrowthInsightsPayload> {
  const emptyFilters = parseAffiliateTrafficFilters(new URLSearchParams());
  const since = rangeStart(args.range);

  const [revenue, sources, campStats, landings, hourRow, campaignNames] = await Promise.all([
    getAffiliateRevenueInsights({ db: args.db, affiliateProfileId: args.affiliateProfileId, range: args.range }),
    getAffiliateTrafficSources({
      db: args.db,
      affiliateProfileId: args.affiliateProfileId,
      range: args.range,
      filters: emptyFilters,
    }),
    getAffiliateCampaignStatsByCampaign({
      db: args.db,
      affiliateProfileId: args.affiliateProfileId,
      range: args.range,
    }),
    getAffiliateLandingGrowthRows({
      db: args.db,
      affiliateProfileId: args.affiliateProfileId,
      range: args.range,
      filters: emptyFilters,
      take: 40,
    }),
    args.db.$queryRaw<{ h: number; c: bigint }[]>(Prisma.sql`
      SELECT EXTRACT(HOUR FROM ("createdAt" + interval '7 hour'))::int AS h, COUNT(*)::bigint AS c
      FROM "AffiliateTrafficEvent"
      WHERE "affiliateProfileId" = ${args.affiliateProfileId}
        AND "createdAt" >= ${since}
        AND "eventType" = 'ORDER_PAID'
      GROUP BY 1
      ORDER BY c DESC
      LIMIT 1
    `),
    args.db.affiliateCampaign.findMany({
      where: { affiliateProfileId: args.affiliateProfileId },
      select: { id: true, name: true },
      take: 300,
    }),
  ]);

  const srcSorted = [...sources].sort((a, b) => b.orders * 10 + b.clicks - (a.orders * 10 + a.clicks));
  const bestSource = srcSorted[0]?.source ? String(srcSorted[0].source) : null;

  const nameById = new Map(campaignNames.map((c) => [c.id, c.name]));
  let bestCampaign: AffiliateGrowthInsightsPayload["bestCampaign"] = null;
  for (const [id, s] of campStats) {
    if (s.clicks <= 0 && s.orders <= 0 && s.commission <= 0) continue;
    if (!bestCampaign || s.commission > bestCampaign.commission) {
      bestCampaign = { id, name: nameById.get(id) ?? "Campaign", commission: s.commission };
    }
  }

  const topLand = landings[0] ?? null;
  const bestLanding = topLand
    ? { pathname: topLand.pathname, epc: topLand.epc, topSource: topLand.topSource }
    : null;

  const h = hourRow[0]?.h;
  const strongestHourLabel =
    typeof h === "number" && Number.isFinite(h)
      ? `${h}h–${h + 1}h (VN)`
      : null;  return {
    bestSource,
    bestCampaign,
    bestLanding,
    strongestHourLabel,
    trendingProductName: revenue.trendingProductName ?? null,
  };
}
