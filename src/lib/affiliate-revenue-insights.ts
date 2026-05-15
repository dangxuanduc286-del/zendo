import "server-only";

import type { PrismaClient } from "@prisma/client";
import type { RangeKey } from "@/lib/affiliate-analytics";
import {
  getAffiliateConversionTimeline,
  getAffiliateTopLinks,
  getAffiliateTopProductsEnhanced,
  getAffiliateTrafficSources,
} from "@/lib/affiliate-traffic-analytics";
import { parseAffiliateTrafficFilters } from "@/lib/affiliate-traffic-filters";

export type RevenueInsights = {
  /** Ngày (theo bucket VN) có tổng đơn + click tốt nhất trong kỳ — gợi ý lịch đăng bài. */
  strongestDayLabel: string | null;
  bestSourceLabel: string | null;
  trendingProductName: string | null;
  topLandingPath: string | null;
};

export async function getAffiliateRevenueInsights(args: {
  db: PrismaClient;
  affiliateProfileId: string;
  range: RangeKey;
}): Promise<RevenueInsights> {
  const emptyFilters = parseAffiliateTrafficFilters(new URLSearchParams());
  const [timeline, sources, topProducts, topLinks] = await Promise.all([
    getAffiliateConversionTimeline({
      db: args.db,
      affiliateProfileId: args.affiliateProfileId,
      range: args.range,
      filters: emptyFilters,
    }),
    getAffiliateTrafficSources({
      db: args.db,
      affiliateProfileId: args.affiliateProfileId,
      range: args.range,
      filters: emptyFilters,
    }),
    getAffiliateTopProductsEnhanced({
      db: args.db,
      affiliateProfileId: args.affiliateProfileId,
      range: args.range,
      filters: emptyFilters,
      take: 5,
      sort: "clicks",
    }),
    getAffiliateTopLinks({
      db: args.db,
      affiliateProfileId: args.affiliateProfileId,
      range: args.range,
      filters: emptyFilters,
      take: 8,
      skip: 0,
    }),
  ]);

  let strongestDayLabel: string | null = null;
  if (timeline.length) {
    let best = timeline[0]!;
    let bestScore = best.orders * 5 + best.clicks;
    for (const b of timeline) {
      const score = b.orders * 5 + b.clicks;
      if (score > bestScore) {
        best = b;
        bestScore = score;
      }
    }
    const [y, m, d] = best.label.split("-").map((x) => Number(x));
    if (Number.isFinite(y) && Number.isFinite(m) && Number.isFinite(d)) {
      const dt = new Date(y!, m! - 1, d!);
      strongestDayLabel = dt.toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "numeric" });
    } else {
      strongestDayLabel = best.label;
    }
  }

  const srcSorted = [...sources].sort((a, b) => b.orders * 12 + b.clicks - (a.orders * 12 + a.clicks));
  const bestSourceLabel = srcSorted[0]?.source ? String(srcSorted[0].source) : null;

  return {
    strongestDayLabel,
    bestSourceLabel,
    trendingProductName: topProducts[0]?.productName ?? null,
    topLandingPath: topLinks[0]?.pathname ?? null,
  };
}
