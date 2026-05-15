import "server-only";

import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import type { RangeKey } from "@/lib/affiliate-analytics";
import { rangeStart } from "@/lib/affiliate-analytics";

export type ShortLinkStatRow = {
  id: string;
  slug: string | null;
  label: string | null;
  targetPathname: string;
  isActive: boolean;
  clicks: number;
  visitors: number;
  orders: number;
  revenue: number;
  commission: number;
  topSource: string | null;
};

export async function getAffiliateShortLinkStats(args: {
  db: PrismaClient;
  affiliateProfileId: string;
  range: RangeKey;
}): Promise<ShortLinkStatRow[]> {
  const since = rangeStart(args.range);
  const links = await args.db.affiliateTrackingLink.findMany({
    where: { affiliateProfileId: args.affiliateProfileId },
    orderBy: { createdAt: "desc" },
    take: 80,
    select: {
      id: true,
      slug: true,
      label: true,
      targetPathname: true,
      isActive: true,
      utmSource: true,
    },
  });
  if (!links.length) return [];

  const rows = await args.db.$queryRaw<
    {
      trackingLinkId: string;
      clicks: bigint;
      visitors: bigint;
      orders: bigint;
      revenue: string | null;
      commission: string | null;
    }[]
  >(Prisma.sql`
    SELECT
      e."trackingLinkId" AS "trackingLinkId",
      SUM(CASE WHEN e."eventType" = 'AFFILIATE_CLICK' THEN 1 ELSE 0 END)::bigint AS clicks,
      COUNT(DISTINCT CASE WHEN e."eventType" = 'AFFILIATE_CLICK' AND e."sessionId" IS NOT NULL THEN e."sessionId" END)::bigint AS visitors,
      SUM(CASE WHEN e."eventType" = 'ORDER_PAID' THEN 1 ELSE 0 END)::bigint AS orders,
      SUM(CASE WHEN e."eventType" = 'ORDER_PAID' THEN COALESCE(e."revenue", 0) ELSE 0 END)::text AS revenue,
      SUM(CASE WHEN e."eventType" = 'ORDER_PAID' THEN COALESCE(e."commission", 0) ELSE 0 END)::text AS commission
    FROM "AffiliateTrafficEvent" e
    WHERE e."affiliateProfileId" = ${args.affiliateProfileId}
      AND e."createdAt" >= ${since}
      AND e."trackingLinkId" IS NOT NULL
    GROUP BY e."trackingLinkId"
  `);

  const agg = new Map(
    rows.map((r) => [
      r.trackingLinkId,
      {
        clicks: Number(r.clicks),
        visitors: Number(r.visitors),
        orders: Number(r.orders),
        revenue: Number(r.revenue ?? 0),
        commission: Number(r.commission ?? 0),
      },
    ]),
  );

  return links.map((l) => {
    const a = agg.get(l.id) ?? { clicks: 0, visitors: 0, orders: 0, revenue: 0, commission: 0 };
    return {
      id: l.id,
      slug: l.slug,
      label: l.label,
      targetPathname: l.targetPathname,
      isActive: l.isActive,
      clicks: a.clicks,
      visitors: a.visitors,
      orders: a.orders,
      revenue: a.revenue,
      commission: a.commission,
      topSource: l.utmSource?.trim() || null,
    };
  });
}
