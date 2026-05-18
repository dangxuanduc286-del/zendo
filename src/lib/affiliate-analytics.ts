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

  const [
    clicks,
    sessions,
    paidOrders,
    cancelledOrders,
    revenueAgg,
    commAgg,
    pendingAgg,
    approvedAgg,
    uniqueVisitorsRaw,
    returningVisitorsRaw,
    orders,
  ] = await Promise.all([
    args.db.affiliateTrafficEvent.count({
      where: { affiliateProfileId: args.affiliateProfileId, eventType: "AFFILIATE_CLICK", createdAt: { gte: since } },
    }),
    args.db.affiliateRealtimeSession.count({
      where: { affiliateProfileId: args.affiliateProfileId, firstSeenAt: { gte: since } },
    }),
    args.db.order.count({
      where: { affiliateProfileId: args.affiliateProfileId, paymentStatus: "PAID", paidAt: { gte: since } },
    }),
    args.db.order.count({
      where: { affiliateProfileId: args.affiliateProfileId, orderStatus: "CANCELED", canceledAt: { gte: since } },
    }),
    args.db.order.aggregate({
      where: { affiliateProfileId: args.affiliateProfileId, paymentStatus: "PAID", paidAt: { gte: since } },
      _sum: { totalAmount: true },
    }),
    args.db.affiliateCommission.aggregate({
      where: { affiliateProfileId: args.affiliateProfileId, createdAt: { gte: since } },
      _sum: { amount: true },
    }),
    args.db.affiliateCommission.aggregate({
      where: { affiliateProfileId: args.affiliateProfileId, status: "PENDING" },
      _sum: { amount: true },
    }),
    args.db.affiliateCommission.aggregate({
      where: { affiliateProfileId: args.affiliateProfileId, status: "AVAILABLE" },
      _sum: { amount: true },
    }),
    // uniqueVisitors: distinct visitorKey (fallback sessionId) trong range
    args.db.affiliateRealtimeSession.groupBy({
      by: ["visitorKey"],
      where: { affiliateProfileId: args.affiliateProfileId, firstSeenAt: { gte: since }, visitorKey: { not: null } },
      _count: { _all: true },
    }),
    // returningVisitors: visitorKey xuất hiện >=2 session (range) — raw để tránh having type nặng
    args.db.$queryRaw<{ visitorKey: string }[]>`
      SELECT "visitorKey"
      FROM "AffiliateRealtimeSession"
      WHERE "affiliateProfileId" = ${args.affiliateProfileId}
        AND "firstSeenAt" >= ${since}
        AND "visitorKey" IS NOT NULL
      GROUP BY "visitorKey"
      HAVING COUNT(*) >= 2
    `,
    args.db.order.count({ where: { affiliateProfileId: args.affiliateProfileId, createdAt: { gte: since } } }),
  ]);

  const totalRevenue = Number(revenueAgg._sum.totalAmount ?? 0);
  const totalCommission = Number(commAgg._sum.amount ?? 0);
  const pendingCommission = Number(pendingAgg._sum.amount ?? 0);
  const approvedCommission = Number(approvedAgg._sum.amount ?? 0);

  const uniqueVisitors = uniqueVisitorsRaw.length || sessions;
  const returningVisitors = returningVisitorsRaw.length;

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

  const [visits, paid] = await Promise.all([
    args.db.$queryRaw<{ pathname: string; visits: bigint }[]>`
      SELECT "pathname", COUNT(*)::bigint AS visits
      FROM "AffiliateTrafficEvent"
      WHERE "affiliateProfileId" = ${args.affiliateProfileId}
        AND "createdAt" >= ${since}
        AND "eventType" = 'AFFILIATE_CLICK'
        AND "pathname" IS NOT NULL
      GROUP BY "pathname"
      ORDER BY visits DESC
      LIMIT ${take}
    `,
    args.db.$queryRaw<{ pathname: string; paidOrders: bigint; revenue: string | null }[]>`
      SELECT "pathname", COUNT(*)::bigint AS "paidOrders", SUM(COALESCE("revenue", 0))::text AS revenue
      FROM "AffiliateTrafficEvent"
      WHERE "affiliateProfileId" = ${args.affiliateProfileId}
        AND "createdAt" >= ${since}
        AND "eventType" = 'ORDER_PAID'
        AND "pathname" IS NOT NULL
      GROUP BY "pathname"
      ORDER BY "paidOrders" DESC
      LIMIT ${take}
    `,
  ]);

  const paidMap = new Map<string, { paidOrders: number; revenue: number }>(
    paid.map((r) => [String(r.pathname), { paidOrders: Number(r.paidOrders), revenue: Number(r.revenue ?? 0) }]),
  );

  // proxies: bounce/avg session require pageview stream; approximate with clicks-only data.
  return visits.map((r) => {
    const pathname = String(r.pathname);
    const visitCount = Number(r.visits);
    const p = paidMap.get(pathname) ?? { paidOrders: 0, revenue: 0 };
    const conv = visitCount > 0 ? p.paidOrders / visitCount : 0;
    return {
      pathname,
      visits: visitCount,
      paidOrders: p.paidOrders,
      revenue: p.revenue,
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

