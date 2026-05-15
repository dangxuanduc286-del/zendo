import "server-only";

import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { rangeStart, type FunnelStep, type RangeKey } from "@/lib/affiliate-analytics";
import type { TimelineBucket } from "@/lib/affiliate-traffic-analytics";

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


export type CampaignAggRow = {
  campaignId: string;
  clicks: number;
  visitors: number;
  orders: number;
  revenue: number;
  commission: number;
};

/**
 * Một query: thống kê theo campaign qua trackingLinkId (không N+1).
 */
export async function getAffiliateCampaignStatsByCampaign(args: {
  db: PrismaClient;
  affiliateProfileId: string;
  range: RangeKey;
}): Promise<Map<string, CampaignAggRow>> {
  const since = rangeStart(args.range);
  const key = `campagg:${args.affiliateProfileId}:${args.range}`;
  const hit = cacheGet<Map<string, CampaignAggRow>>(key);
  if (hit) return hit;

  const rows = await args.db.$queryRaw<
    {
      campaignId: string;
      clicks: bigint;
      visitors: bigint;
      orders: bigint;
      revenue: string | null;
      commission: string | null;
    }[]
  >(Prisma.sql`
    SELECT
      tl."campaignId" AS "campaignId",
      SUM(CASE WHEN e."eventType" = 'AFFILIATE_CLICK' THEN 1 ELSE 0 END)::bigint AS clicks,
      COUNT(DISTINCT CASE WHEN e."eventType" = 'AFFILIATE_CLICK' AND e."sessionId" IS NOT NULL AND e."sessionId" != '' THEN e."sessionId" END)::bigint AS visitors,
      SUM(CASE WHEN e."eventType" = 'ORDER_PAID' THEN 1 ELSE 0 END)::bigint AS orders,
      SUM(CASE WHEN e."eventType" = 'ORDER_PAID' THEN COALESCE(e."revenue", 0) ELSE 0 END)::text AS revenue,
      SUM(CASE WHEN e."eventType" = 'ORDER_PAID' THEN COALESCE(e."commission", 0) ELSE 0 END)::text AS commission
    FROM "AffiliateTrafficEvent" e
    INNER JOIN "AffiliateTrackingLink" tl ON tl."id" = e."trackingLinkId"
    WHERE e."affiliateProfileId" = ${args.affiliateProfileId}
      AND tl."campaignId" IS NOT NULL
      AND e."createdAt" >= ${since}
    GROUP BY tl."campaignId"
  `);

  const out = new Map<string, CampaignAggRow>();
  for (const r of rows) {
    const clicks = Number(r.clicks);
    out.set(String(r.campaignId), {
      campaignId: String(r.campaignId),
      clicks,
      visitors: Number(r.visitors),
      orders: Number(r.orders),
      revenue: Number(r.revenue ?? 0),
      commission: Number(r.commission ?? 0),
    });
  }
  cacheSet(key, out);  return out;
}

export async function getAffiliateCampaignTimeline(args: {
  db: PrismaClient;
  affiliateProfileId: string;
  campaignId: string;
  range: RangeKey;
}): Promise<TimelineBucket[]> {
  const since = rangeStart(args.range);
  const key = `camptl:${args.affiliateProfileId}:${args.campaignId}:${args.range}`;
  const hit = cacheGet<TimelineBucket[]>(key);
  if (hit) return hit;

  const vnDay = Prisma.sql`date_trunc('day', e."createdAt" + interval '7 hour')`;
  const rows = await args.db.$queryRaw<
    { day: Date; clicks: bigint; orders: bigint; revenue: string | null; commission: string | null }[]
  >(Prisma.sql`
    SELECT
      ${vnDay} AS day,
      SUM(CASE WHEN e."eventType" = 'AFFILIATE_CLICK' THEN 1 ELSE 0 END)::bigint AS clicks,
      SUM(CASE WHEN e."eventType" = 'ORDER_PAID' THEN 1 ELSE 0 END)::bigint AS orders,
      SUM(CASE WHEN e."eventType" = 'ORDER_PAID' THEN COALESCE(e."revenue", 0) ELSE 0 END)::text AS revenue,
      SUM(CASE WHEN e."eventType" = 'ORDER_PAID' THEN COALESCE(e."commission", 0) ELSE 0 END)::text AS commission
    FROM "AffiliateTrafficEvent" e
    INNER JOIN "AffiliateTrackingLink" tl ON tl."id" = e."trackingLinkId"
    WHERE e."affiliateProfileId" = ${args.affiliateProfileId}
      AND tl."campaignId" = ${args.campaignId}
      AND e."createdAt" >= ${since}
    GROUP BY 1
    ORDER BY 1 ASC
  `);

  const out: TimelineBucket[] = rows.map((r) => {
    const t = new Date(r.day.getTime());
    const y = t.getUTCFullYear();
    const m = String(t.getUTCMonth() + 1).padStart(2, "0");
    const d = String(t.getUTCDate()).padStart(2, "0");
    const clicks = Number(r.clicks);
    const orders = Number(r.orders);
    return {
      label: `${y}-${m}-${d}`,
      clicks,
      orders,
      revenue: Number(r.revenue ?? 0),
      commission: Number(r.commission ?? 0),
      conversionRate: clicks > 0 ? orders / clicks : 0,
    };
  });
  cacheSet(key, out);  return out;
}

const FUNNEL_STEPS: FunnelStep[] = [
  "AFFILIATE_CLICK",
  "PRODUCT_VIEW",
  "ADD_TO_CART",
  "CHECKOUT_STARTED",
  "CHECKOUT_COMPLETED",
  "ORDER_PAID",
];

export async function getAffiliateCampaignConversionFunnel(args: {
  db: PrismaClient;
  affiliateProfileId: string;
  campaignId: string;
  range: RangeKey;
}): Promise<Array<{ step: FunnelStep; count: number; dropoff: number; conversionPct: number }>> {
  const since = rangeStart(args.range);
  const linkIds = await args.db.affiliateTrackingLink.findMany({
    where: { affiliateProfileId: args.affiliateProfileId, campaignId: args.campaignId },
    select: { id: true },
  });
  const ids = linkIds.map((l) => l.id);
  if (!ids.length) {
    return FUNNEL_STEPS.map((step) => ({ step, count: 0, dropoff: 0, conversionPct: 0 }));
  }

  const counts = await args.db.affiliateTrafficEvent.groupBy({
    by: ["eventType"],
    where: {
      affiliateProfileId: args.affiliateProfileId,
      createdAt: { gte: since },
      trackingLinkId: { in: ids },
      eventType: { in: FUNNEL_STEPS },
    },
    _count: { _all: true },
  });
  const map = new Map(counts.map((r) => [r.eventType as FunnelStep, Number(r._count._all ?? 0)]));
  const series = FUNNEL_STEPS.map((s) => ({ step: s, count: map.get(s) ?? 0 }));
  const out = series.map((cur, idx) => {
    const prev = idx === 0 ? null : series[idx - 1]!;
    const dropoff = prev ? Math.max(0, prev.count - cur.count) : 0;
    const conversionPct = prev && prev.count > 0 ? cur.count / prev.count : idx === 0 ? 1 : 0;
    return { step: cur.step, count: cur.count, dropoff, conversionPct };
  });  return out;
}

export async function assertAffiliateCampaignOwned(args: {
  db: PrismaClient;
  affiliateProfileId: string;
  campaignId: string;
}): Promise<{ id: string; name: string } | null> {
  const row = await args.db.affiliateCampaign.findFirst({
    where: { id: args.campaignId, affiliateProfileId: args.affiliateProfileId },
    select: { id: true, name: true },
  });
  return row;
}
