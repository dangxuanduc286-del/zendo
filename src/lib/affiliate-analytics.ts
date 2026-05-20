import "server-only";

import type { PrismaClient } from "@prisma/client";

export type RangeKey = "today" | "7d" | "30d" | "month";

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

function vnWallClockParts(d: Date): { y: number; m: number; day: number } {
  const t = new Date(d.getTime() + VN_OFFSET_MS);
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, day: t.getUTCDate() };
}

function vnStartOfDay(d: Date): Date {
  const { y, m, day } = vnWallClockParts(d);
  const utcMid = Date.UTC(y, m - 1, day, 0, 0, 0, 0);
  return new Date(utcMid - VN_OFFSET_MS);
}

function vnStartOfMonth(d: Date): Date {
  const { y, m } = vnWallClockParts(d);
  const utcMid = Date.UTC(y, m - 1, 1, 0, 0, 0, 0);
  return new Date(utcMid - VN_OFFSET_MS);
}

export function rangeStart(range: RangeKey, now = new Date()): Date {
  if (range === "today") return vnStartOfDay(now);
  if (range === "month") return vnStartOfMonth(now);
  const day = 86400000;
  if (range === "7d") return new Date(now.getTime() - 7 * day);
  return new Date(now.getTime() - 30 * day);
}

export type AffiliateAnalyticsOverview = {
  totalClicks: number;
  uniqueVisitors: number;
  sessions: number;
  orders: number;
  paidOrders: number;
  cancelledOrders: number;
  conversionRate: number;
  totalRevenue: number;
  totalCommission: number;
  pendingCommission: number;
  approvedCommission: number;
  EPC: number;
  RPM: number;
  AOV: number;
  returningVisitors: number;
};

const overviewServiceCache = new Map<string, { at: number; value: AffiliateAnalyticsOverview }>();
const OVERVIEW_SERVICE_CACHE_MS = 45_000;

export function clearAffiliateAnalyticsOverviewServiceCache(): void {
  overviewServiceCache.clear();
}

export function getAffiliateAnalyticsOverviewCacheSize(): number {
  return overviewServiceCache.size;
}

export async function getAffiliateAnalyticsOverview(args: {
  db: PrismaClient;
  affiliateProfileId: string;
  range: RangeKey;
}): Promise<AffiliateAnalyticsOverview> {
  const cacheKey = `${args.affiliateProfileId}:${args.range}`;
  const hit = overviewServiceCache.get(cacheKey);
  if (hit && Date.now() - hit.at < OVERVIEW_SERVICE_CACHE_MS) {
    return hit.value;
  }

  const since = rangeStart(args.range);

  const [clicks, sessions, orderAgg, commAgg, visitorAgg] = await Promise.all([
    args.db.affiliateTrafficEvent.count({
      where: { affiliateProfileId: args.affiliateProfileId, eventType: "AFFILIATE_CLICK", createdAt: { gte: since } },
    }),
    args.db.affiliateRealtimeSession.count({
      where: { affiliateProfileId: args.affiliateProfileId, firstSeenAt: { gte: since } },
    }),
    args.db.$queryRaw<{
      paidOrders: bigint;
      cancelledOrders: bigint;
      orders: bigint;
      totalRevenue: string | null;
    }[]>`
      SELECT
        COUNT(*) FILTER (
          WHERE "paymentStatus" = 'PAID'
            AND "paidAt" >= ${since}
        )::bigint AS "paidOrders",
        COUNT(*) FILTER (
          WHERE "orderStatus" = 'CANCELED'
            AND "canceledAt" >= ${since}
        )::bigint AS "cancelledOrders",
        COUNT(*) FILTER (
          WHERE "createdAt" >= ${since}
        )::bigint AS "orders",
        SUM("totalAmount") FILTER (
          WHERE "paymentStatus" = 'PAID'
            AND "paidAt" >= ${since}
        )::text AS "totalRevenue"
      FROM "Order"
      WHERE "affiliateProfileId" = ${args.affiliateProfileId}
    `,
    args.db.$queryRaw<{
      totalCommission: string | null;
      pendingCommission: string | null;
      approvedCommission: string | null;
    }[]>`
      SELECT
        SUM("amount") FILTER (WHERE "createdAt" >= ${since})::text AS "totalCommission",
        SUM("amount") FILTER (WHERE "status" = 'PENDING')::text AS "pendingCommission",
        SUM("amount") FILTER (WHERE "status" = 'AVAILABLE')::text AS "approvedCommission"
      FROM "AffiliateCommission"
      WHERE "affiliateProfileId" = ${args.affiliateProfileId}
    `,
    args.db.$queryRaw<{ uniqueVisitors: bigint; returningVisitors: bigint }[]>`
      SELECT
        COUNT(*)::bigint AS "uniqueVisitors",
        COALESCE(SUM(CASE WHEN x.cnt >= 2 THEN 1 ELSE 0 END), 0)::bigint AS "returningVisitors"
      FROM (
        SELECT "visitorKey", COUNT(*)::int AS cnt
        FROM "AffiliateRealtimeSession"
        WHERE "affiliateProfileId" = ${args.affiliateProfileId}
          AND "firstSeenAt" >= ${since}
          AND "visitorKey" IS NOT NULL
        GROUP BY "visitorKey"
      ) x
    `,
  ]);

  const orderRow = orderAgg[0];
  const commRow = commAgg[0];
  const visitorRow = visitorAgg[0];

  const paidOrders = Number(orderRow?.paidOrders ?? 0);
  const cancelledOrders = Number(orderRow?.cancelledOrders ?? 0);
  const orders = Number(orderRow?.orders ?? 0);
  const totalRevenue = Number(orderRow?.totalRevenue ?? 0);
  const totalCommission = Number(commRow?.totalCommission ?? 0);
  const pendingCommission = Number(commRow?.pendingCommission ?? 0);
  const approvedCommission = Number(commRow?.approvedCommission ?? 0);

  const uniqueVisitorsCount = Number(visitorRow?.uniqueVisitors ?? 0);
  const uniqueVisitors = uniqueVisitorsCount || sessions;
  const returningVisitors = Number(visitorRow?.returningVisitors ?? 0);

  const conversionRate = clicks > 0 ? paidOrders / clicks : 0;
  const epc = clicks > 0 ? totalCommission / clicks : 0;
  const rpm = clicks > 0 ? (totalRevenue / clicks) * 1000 : 0;
  const aov = paidOrders > 0 ? totalRevenue / paidOrders : 0;

  const out: AffiliateAnalyticsOverview = {
    totalClicks: clicks,
    uniqueVisitors,
    sessions,
    orders,
    paidOrders,
    cancelledOrders,
    conversionRate,
    totalRevenue,
    totalCommission,
    pendingCommission,
    approvedCommission,
    EPC: epc,
    RPM: rpm,
    AOV: aov,
    returningVisitors,
  };

  overviewServiceCache.set(cacheKey, { at: Date.now(), value: out });
  return out;
}

export type ChartSeries = {
  labels: string[];
  totals: { clicks: number; visitors: number; orders: number; revenue: number; commission: number };
  buckets: Array<{
    label: string;
    clicks: number;
    visitors: number;
    orders: number;
    revenue: number;
    commission: number;
  }>;
};

export async function getAffiliateTrafficChart(args: {
  db: PrismaClient;
  affiliateProfileId: string;
  range: RangeKey;
}): Promise<ChartSeries> {
  // chart API uses raw SQL buckets for performance; keep service surface stable.
  void args;
  return { labels: [], buckets: [], totals: { clicks: 0, visitors: 0, orders: 0, revenue: 0, commission: 0 } };
}

export async function getAffiliateConversionChart(): Promise<ChartSeries> {
  return { labels: [], buckets: [], totals: { clicks: 0, visitors: 0, orders: 0, revenue: 0, commission: 0 } };
}

export async function getAffiliateTopProducts(args: {
  db: PrismaClient;
  affiliateProfileId: string;
  range: RangeKey;
  take: number;
}): Promise<
  Array<{
    productId: string;
    productName: string;
    clicks: number;
    paidOrders: number;
    revenue: number;
    commission: number;
    conversionRate: number;
  }>
> {
  const since = rangeStart(args.range);
  const take = Math.min(50, Math.max(1, Math.floor(args.take)));

  const [views, paid] = await Promise.all([
    args.db.$queryRaw<{ productId: string; views: bigint }[]>`
      SELECT "productId", COUNT(*)::bigint AS views
      FROM "AffiliateTrafficEvent"
      WHERE "affiliateProfileId" = ${args.affiliateProfileId}
        AND "createdAt" >= ${since}
        AND "eventType" = 'PRODUCT_VIEW'
        AND "productId" IS NOT NULL
      GROUP BY "productId"
      ORDER BY views DESC
      LIMIT ${take}
    `,
    args.db.$queryRaw<{ productId: string; paidOrders: bigint; revenue: string | null; commission: string | null }[]>`
      SELECT
        "productId",
        COUNT(*)::bigint AS "paidOrders",
        SUM(COALESCE("revenue", 0))::text AS revenue,
        SUM(COALESCE("commission", 0))::text AS commission
      FROM "AffiliateTrafficEvent"
      WHERE "affiliateProfileId" = ${args.affiliateProfileId}
        AND "createdAt" >= ${since}
        AND "eventType" = 'ORDER_PAID'
        AND "productId" IS NOT NULL
      GROUP BY "productId"
      ORDER BY "paidOrders" DESC
      LIMIT ${take}
    `,
  ]);

  const productIds = Array.from(new Set([...views, ...paid].map((r) => String(r.productId))));
  const products = productIds.length
    ? await args.db.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true } })
    : [];
  const nameMap = new Map(products.map((p) => [p.id, p.name]));

  const paidMap = new Map<string, { paidOrders: number; revenue: number; commission: number }>(
    paid.map((r) => [
      String(r.productId),
      { paidOrders: Number(r.paidOrders), revenue: Number(r.revenue ?? 0), commission: Number(r.commission ?? 0) },
    ]),
  );

  return views.map((r) => {
    const productId = String(r.productId);
    const clicksCount = Number(r.views);
    const paidRow = paidMap.get(productId) ?? { paidOrders: 0, revenue: 0, commission: 0 };
    const conv = clicksCount > 0 ? paidRow.paidOrders / clicksCount : 0;
    return {
      productId,
      productName: nameMap.get(productId) ?? "Sản phẩm",
      clicks: clicksCount,
      paidOrders: paidRow.paidOrders,
      revenue: paidRow.revenue,
      commission: paidRow.commission,
      conversionRate: conv,
    };
  });
}

export async function getAffiliateTopLandingPages(args: {
  db: PrismaClient;
  affiliateProfileId: string;
  range: RangeKey;
  take: number;
}): Promise<
  Array<{
    pathname: string;
    visits: number;
    paidOrders: number;
    revenue: number;
    conversionRate: number;
    bounceProxy: number;
    avgSessionProxySec: number;
  }>
> {
  const since = rangeStart(args.range);
  const take = Math.min(50, Math.max(1, Math.floor(args.take)));

  const rows = await args.db.$queryRaw<{ pathname: string; visits: bigint; paidOrders: bigint; revenue: string | null }[]>`
    SELECT
      "pathname",
      SUM(CASE WHEN "eventType" = 'AFFILIATE_CLICK' THEN 1 ELSE 0 END)::bigint AS visits,
      SUM(CASE WHEN "eventType" = 'ORDER_PAID' THEN 1 ELSE 0 END)::bigint AS "paidOrders",
      SUM(CASE WHEN "eventType" = 'ORDER_PAID' THEN COALESCE("revenue", 0) ELSE 0 END)::text AS revenue
    FROM "AffiliateTrafficEvent"
    WHERE "affiliateProfileId" = ${args.affiliateProfileId}
      AND "createdAt" >= ${since}
      AND "pathname" IS NOT NULL
      AND "eventType" IN ('AFFILIATE_CLICK', 'ORDER_PAID')
    GROUP BY "pathname"
    ORDER BY visits DESC
    LIMIT ${take}
  `;

  // proxies: bounce/avg session require pageview stream; approximate with clicks-only data.
  return rows.map((r) => {
    const pathname = String(r.pathname);
    const visitCount = Number(r.visits);
    const paidOrders = Number(r.paidOrders);
    const revenue = Number(r.revenue ?? 0);
    const conv = visitCount > 0 ? paidOrders / visitCount : 0;
    return {
      pathname,
      visits: visitCount,
      paidOrders,
      revenue,
      conversionRate: conv,
      bounceProxy: 0,
      avgSessionProxySec: 0,
    };
  });
}

export type FunnelStep = "AFFILIATE_CLICK" | "PRODUCT_VIEW" | "ADD_TO_CART" | "CHECKOUT_STARTED" | "CHECKOUT_COMPLETED" | "ORDER_PAID";

export async function getAffiliateConversionFunnel(args: {
  db: PrismaClient;
  affiliateProfileId: string;
  range: RangeKey;
}): Promise<
  Array<{
    step: FunnelStep;
    count: number;
    dropoff: number;
    conversionPct: number;
  }>
> {
  const since = rangeStart(args.range);
  const steps: FunnelStep[] = [
    "AFFILIATE_CLICK",
    "PRODUCT_VIEW",
    "ADD_TO_CART",
    "CHECKOUT_STARTED",
    "CHECKOUT_COMPLETED",
    "ORDER_PAID",
  ];

  const counts = await args.db.affiliateTrafficEvent.groupBy({
    by: ["eventType"],
    where: { affiliateProfileId: args.affiliateProfileId, createdAt: { gte: since }, eventType: { in: steps } },
    _count: { _all: true },
  });
  const map = new Map(counts.map((r) => [r.eventType as FunnelStep, Number(r._count._all ?? 0)]));
  const series = steps.map((s) => ({ step: s, count: map.get(s) ?? 0 }));

  const out = series.map((cur, idx) => {
    const prev = idx === 0 ? null : series[idx - 1]!;
    const dropoff = prev ? Math.max(0, prev.count - cur.count) : 0;
    const conversionPct = prev && prev.count > 0 ? cur.count / prev.count : idx === 0 ? 1 : 0;
    return { step: cur.step, count: cur.count, dropoff, conversionPct };
  });

  return out;
}

