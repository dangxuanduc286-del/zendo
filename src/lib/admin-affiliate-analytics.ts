import "server-only";

import type { AffiliateStatus, PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";
import {
  getAffiliateAnalyticsOverview,
  getAffiliateConversionFunnel,
  getAffiliateTopLandingPages,
  rangeStart,
  type RangeKey,
} from "@/lib/affiliate-analytics";
import { classifyTrafficSourcePublic, getAffiliateTopProductsEnhanced } from "@/lib/affiliate-traffic-analytics";

type CacheEntry<T> = { atMs: number; value: T };
const overviewCache = new Map<string, CacheEntry<AdminSystemOverview>>();

export function clearAdminAffiliateOverviewCache(): void {
  overviewCache.clear();
}

export function getAdminAffiliateOverviewCacheSize(): number {
  return overviewCache.size;
}

export type AdminSystemOverview = {
  range: RangeKey;
  since: string;
  totalClicks: number;
  uniqueVisitors: number;
  totalOrders: number;
  paidOrders: number;
  totalRevenue: number;
  totalCommission: number;
  activeAffiliates: number;
  onlineAffiliates: number;
  conversionRate: number;
  RPM: number;
  EPC: number;
  topCampaign: { label: string; clicks: number; conversions: number; revenue: number; commission: number } | null;
};

export type AdminChartBucket = {
  label: string;
  clicks: number;
  orders: number;
  revenue: number;
  commission: number;
};

export type AdminTopAffiliateRow = {
  affiliateProfileId: string;
  refCode: string;
  displayName: string | null;
  status: AffiliateStatus;
  clicks: number;
  paidOrders: number;
  revenue: number;
  commission: number;
  conversionRate: number;
  EPC: number;
  RPM: number;
  online: boolean;
};

export type AdminCampaignRow = {
  key: string;
  kind: "utm_source" | "subid" | "landing";
  clicks: number;
  conversions: number;
  revenue: number;
  commission: number;
};


export async function getAdminSystemOverview(args: {
  db: PrismaClient;
  range: RangeKey;
  useCache?: boolean;
}): Promise<AdminSystemOverview> {
  const cacheKey = args.range;
  if (args.useCache !== false) {
    const hit = overviewCache.get(cacheKey);
    if (hit && Date.now() - hit.atMs < 45_000) {
      return hit.value;
    }
  }

  const since = rangeStart(args.range);

  const [
    totalClicks,
    uniqueVisitorsRow,
    totalOrders,
    paidOrders,
    revenueAgg,
    commissionAgg,
    activeAffiliates,
    onlineAffiliates,
    topCampRows,
  ] = await Promise.all([
    args.db.affiliateTrafficEvent.count({
      where: { eventType: "AFFILIATE_CLICK", createdAt: { gte: since } },
    }),
    args.db.$queryRaw<{ n: bigint }[]>`
      SELECT COUNT(*)::bigint AS n
      FROM (
        SELECT "visitorKey"
        FROM "AffiliateRealtimeSession"
        WHERE "firstSeenAt" >= ${since}
          AND "visitorKey" IS NOT NULL
        GROUP BY "visitorKey"
      ) t
    `,
    args.db.order.count({ where: { affiliateProfileId: { not: null }, createdAt: { gte: since } } }),
    args.db.order.count({
      where: { affiliateProfileId: { not: null }, paymentStatus: "PAID", paidAt: { gte: since } },
    }),
    args.db.order.aggregate({
      where: { affiliateProfileId: { not: null }, paymentStatus: "PAID", paidAt: { gte: since } },
      _sum: { totalAmount: true },
    }),
    args.db.affiliateCommission.aggregate({
      where: { createdAt: { gte: since } },
      _sum: { amount: true },
    }),
    args.db.affiliateProfile.count({ where: { status: "ACTIVE" } }),
    args.db.$queryRaw<{ n: bigint }[]>`
      SELECT COUNT(DISTINCT "affiliateProfileId")::bigint AS n
      FROM "AffiliateRealtimeSession"
      WHERE "lastSeenAt" >= NOW() - interval '5 minutes'
    `,
    args.db.$queryRaw<
      { label: string; clicks: bigint; conversions: bigint; revenue: string | null; commission: string | null }[]
    >`
      SELECT
        COALESCE(NULLIF(TRIM(e.metadata->>'utm_source'), ''), '(direct)') AS label,
        SUM(CASE WHEN e."eventType" = 'AFFILIATE_CLICK' THEN 1 ELSE 0 END)::bigint AS clicks,
        SUM(CASE WHEN e."eventType" = 'ORDER_PAID' THEN 1 ELSE 0 END)::bigint AS conversions,
        SUM(CASE WHEN e."eventType" = 'ORDER_PAID' THEN COALESCE(e."revenue", 0) ELSE 0 END)::text AS revenue,
        SUM(CASE WHEN e."eventType" = 'ORDER_PAID' THEN COALESCE(e."commission", 0) ELSE 0 END)::text AS commission
      FROM "AffiliateTrafficEvent" e
      WHERE e."createdAt" >= ${since}
      GROUP BY 1
      ORDER BY clicks DESC
      LIMIT 1
    `,
  ]);

  const uniqueVisitors = Number(uniqueVisitorsRow[0]?.n ?? 0);
  const totalRevenue = Number(revenueAgg._sum.totalAmount ?? 0);
  const totalCommission = Number(commissionAgg._sum.amount ?? 0);
  const online = Number(onlineAffiliates[0]?.n ?? 0);
  const conversionRate = totalClicks > 0 ? paidOrders / totalClicks : 0;
  const epc = totalClicks > 0 ? totalCommission / totalClicks : 0;
  const rpm = totalClicks > 0 ? (totalRevenue / totalClicks) * 1000 : 0;

  const tc = topCampRows[0];
  const topCampaign = tc
    ? {
        label: String(tc.label),
        clicks: Number(tc.clicks),
        conversions: Number(tc.conversions),
        revenue: Number(tc.revenue ?? 0),
        commission: Number(tc.commission ?? 0),
      }
    : null;

  const out: AdminSystemOverview = {
    range: args.range,
    since: since.toISOString(),
    totalClicks,
    uniqueVisitors,
    totalOrders,
    paidOrders,
    totalRevenue,
    totalCommission,
    activeAffiliates,
    onlineAffiliates: online,
    conversionRate,
    RPM: rpm,
    EPC: epc,
    topCampaign,
  };

  overviewCache.set(cacheKey, { atMs: Date.now(), value: out });  return out;
}

export async function getAdminSystemChart(args: { db: PrismaClient; range: RangeKey }): Promise<{
  labels: string[];
  totals: { clicks: number; orders: number; revenue: number; commission: number };
  buckets: AdminChartBucket[];
}> {
  const since = rangeStart(args.range);
  type BucketRow = { day: Date; clicks: bigint; paid: bigint; revenue: string | null; commission: string | null };
  const vnDay = Prisma.sql`date_trunc('day', "createdAt" + interval '7 hour')`;
  const rows = (await args.db.$queryRaw(
    Prisma.sql`
      SELECT
        ${vnDay} AS day,
        SUM(CASE WHEN "eventType" = 'AFFILIATE_CLICK' THEN 1 ELSE 0 END) AS clicks,
        SUM(CASE WHEN "eventType" = 'ORDER_PAID' THEN 1 ELSE 0 END) AS paid,
        SUM(CASE WHEN "eventType" = 'ORDER_PAID' THEN COALESCE("revenue", 0) ELSE 0 END) AS revenue,
        SUM(CASE WHEN "eventType" = 'ORDER_PAID' THEN COALESCE("commission", 0) ELSE 0 END) AS commission
      FROM "AffiliateTrafficEvent"
      WHERE "createdAt" >= ${since}
      GROUP BY 1
      ORDER BY 1 ASC
    `,
  )) as BucketRow[];

  const labels = rows.map((r) => {
    const t = new Date(r.day.getTime());
    const y = t.getUTCFullYear();
    const m = String(t.getUTCMonth() + 1).padStart(2, "0");
    const d = String(t.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  });

  const totals = rows.reduce(
    (acc, r) => {
      acc.clicks += Number(r.clicks);
      acc.orders += Number(r.paid);
      acc.revenue += Number(r.revenue ?? 0);
      acc.commission += Number(r.commission ?? 0);
      return acc;
    },
    { clicks: 0, orders: 0, revenue: 0, commission: 0 },
  );

  const buckets: AdminChartBucket[] = rows.map((r, idx) => ({
    label: labels[idx]!,
    clicks: Number(r.clicks),
    orders: Number(r.paid),
    revenue: Number(r.revenue ?? 0),
    commission: Number(r.commission ?? 0),
  }));  return { labels, totals, buckets };
}

function buildTopAffiliateOrderBy(sort: string, dir: "asc" | "desc"): Prisma.Sql {
  const desc = dir === "desc";
  switch (sort) {
    case "revenue":
      return desc
        ? Prisma.sql`ORDER BY COALESCE(m.revenue, 0) DESC NULLS LAST`
        : Prisma.sql`ORDER BY COALESCE(m.revenue, 0) ASC NULLS LAST`;
    case "commission":
      return desc
        ? Prisma.sql`ORDER BY COALESCE(m.commission, 0) DESC NULLS LAST`
        : Prisma.sql`ORDER BY COALESCE(m.commission, 0) ASC NULLS LAST`;
    case "orders":
      return desc
        ? Prisma.sql`ORDER BY COALESCE(m.paid_orders, 0) DESC NULLS LAST`
        : Prisma.sql`ORDER BY COALESCE(m.paid_orders, 0) ASC NULLS LAST`;
    case "conversion":
      return desc
        ? Prisma.sql`ORDER BY (CASE WHEN COALESCE(m.clicks, 0) > 0 THEN COALESCE(m.paid_orders, 0)::float / m.clicks ELSE 0 END) DESC NULLS LAST`
        : Prisma.sql`ORDER BY (CASE WHEN COALESCE(m.clicks, 0) > 0 THEN COALESCE(m.paid_orders, 0)::float / m.clicks ELSE 0 END) ASC NULLS LAST`;
    case "epc":
      return desc
        ? Prisma.sql`ORDER BY (CASE WHEN COALESCE(m.clicks, 0) > 0 THEN COALESCE(m.commission, 0)::float / m.clicks ELSE 0 END) DESC NULLS LAST`
        : Prisma.sql`ORDER BY (CASE WHEN COALESCE(m.clicks, 0) > 0 THEN COALESCE(m.commission, 0)::float / m.clicks ELSE 0 END) ASC NULLS LAST`;
    case "rpm":
      return desc
        ? Prisma.sql`ORDER BY (CASE WHEN COALESCE(m.clicks, 0) > 0 THEN (COALESCE(m.revenue, 0)::float / m.clicks) * 1000 ELSE 0 END) DESC NULLS LAST`
        : Prisma.sql`ORDER BY (CASE WHEN COALESCE(m.clicks, 0) > 0 THEN (COALESCE(m.revenue, 0)::float / m.clicks) * 1000 ELSE 0 END) ASC NULLS LAST`;
    case "refCode":
      return desc ? Prisma.sql`ORDER BY p."refCode" DESC` : Prisma.sql`ORDER BY p."refCode" ASC`;
    case "clicks":
    default:
      return desc
        ? Prisma.sql`ORDER BY COALESCE(m.clicks, 0) DESC NULLS LAST`
        : Prisma.sql`ORDER BY COALESCE(m.clicks, 0) ASC NULLS LAST`;
  }
}

export async function getAdminTopAffiliates(args: {
  db: PrismaClient;
  range: RangeKey;
  page: number;
  pageSize: number;
  sort: string;
  dir: "asc" | "desc";
  q: string;
  status: "ALL" | AffiliateStatus;
  online: "ALL" | "YES" | "NO";
}): Promise<{ rows: AdminTopAffiliateRow[]; total: number }> {
  const since = rangeStart(args.range);
  const take = Math.min(100, Math.max(1, args.pageSize));
  const page = Math.max(1, args.page);
  const skip = Math.min(10_000, (page - 1) * take);
  const q = args.q.trim().slice(0, 80);
  const pct = q ? `%${q.replace(/%/g, "").replace(/_/g, "")}%` : "";

  const statusFilter =
    args.status === "ALL"
      ? Prisma.sql`TRUE`
      : args.status === "ACTIVE"
        ? Prisma.sql`p.status = 'ACTIVE'`
        : args.status === "PAUSED"
          ? Prisma.sql`p.status = 'PAUSED'`
          : Prisma.sql`p.status = 'LOCKED'`;

  const searchFilter =
    q.length === 0
      ? Prisma.sql`TRUE`
      : Prisma.sql`(p."refCode" ILIKE ${pct} OR COALESCE(c."fullName", '') ILIKE ${pct})`;

  const onlineFilter =
    args.online === "ALL"
      ? Prisma.sql`TRUE`
      : args.online === "YES"
        ? Prisma.sql`o."affiliateProfileId" IS NOT NULL`
        : Prisma.sql`o."affiliateProfileId" IS NULL`;

  const orderBy = buildTopAffiliateOrderBy(args.sort, args.dir);

  type RawRow = {
    id: string;
    refCode: string;
    fullName: string | null;
    status: AffiliateStatus;
    clicks: bigint | null;
    paid_orders: bigint | null;
    revenue: string | null;
    commission: string | null;
    online: boolean | null;
  };

  const rows = (await args.db.$queryRaw(
    Prisma.sql`
      WITH m AS (
        SELECT
          e."affiliateProfileId" AS affiliate_profile_id,
          SUM(CASE WHEN e."eventType" = 'AFFILIATE_CLICK' THEN 1 ELSE 0 END)::bigint AS clicks,
          SUM(CASE WHEN e."eventType" = 'ORDER_PAID' THEN 1 ELSE 0 END)::bigint AS paid_orders,
          SUM(CASE WHEN e."eventType" = 'ORDER_PAID' THEN COALESCE(e."revenue", 0) ELSE 0 END)::numeric AS revenue,
          SUM(CASE WHEN e."eventType" = 'ORDER_PAID' THEN COALESCE(e."commission", 0) ELSE 0 END)::numeric AS commission
        FROM "AffiliateTrafficEvent" e
        WHERE e."createdAt" >= ${since}
        GROUP BY 1
      ),
      online AS (
        SELECT DISTINCT s."affiliateProfileId"
        FROM "AffiliateRealtimeSession" s
        WHERE s."lastSeenAt" >= NOW() - interval '5 minutes'
      )
      SELECT
        p.id,
        p."refCode",
        p.status,
        c."fullName",
        m.clicks,
        m.paid_orders,
        m.revenue::text,
        m.commission::text,
        (o."affiliateProfileId" IS NOT NULL) AS online
      FROM "AffiliateProfile" p
      LEFT JOIN "Customer" c ON c.id = p."customerId"
      LEFT JOIN m ON m.affiliate_profile_id = p.id
      LEFT JOIN online o ON o."affiliateProfileId" = p.id
      WHERE ${statusFilter}
        AND ${searchFilter}
        AND ${onlineFilter}
      ${orderBy}
      LIMIT ${take} OFFSET ${skip}
    `,
  )) as RawRow[];

  const countRows = (await args.db.$queryRaw(
    Prisma.sql`
      WITH m AS (
        SELECT e."affiliateProfileId" AS affiliate_profile_id
        FROM "AffiliateTrafficEvent" e
        WHERE e."createdAt" >= ${since}
        GROUP BY 1
      ),
      online AS (
        SELECT DISTINCT s."affiliateProfileId"
        FROM "AffiliateRealtimeSession" s
        WHERE s."lastSeenAt" >= NOW() - interval '5 minutes'
      )
      SELECT COUNT(*)::bigint AS n
      FROM "AffiliateProfile" p
      LEFT JOIN "Customer" c ON c.id = p."customerId"
      LEFT JOIN m ON m.affiliate_profile_id = p.id
      LEFT JOIN online o ON o."affiliateProfileId" = p.id
      WHERE ${statusFilter}
        AND ${searchFilter}
        AND ${onlineFilter}
    `,
  )) as { n: bigint }[];

  const total = Number(countRows[0]?.n ?? 0);

  const mapped: AdminTopAffiliateRow[] = rows.map((r) => {
    const clicks = Number(r.clicks ?? 0);
    const paidOrders = Number(r.paid_orders ?? 0);
    const revenue = Number(r.revenue ?? 0);
    const commission = Number(r.commission ?? 0);
    const conversionRate = clicks > 0 ? paidOrders / clicks : 0;
    const EPC = clicks > 0 ? commission / clicks : 0;
    const RPM = clicks > 0 ? (revenue / clicks) * 1000 : 0;
    return {
      affiliateProfileId: r.id,
      refCode: r.refCode,
      displayName: r.fullName,
      status: r.status,
      clicks,
      paidOrders,
      revenue,
      commission,
      conversionRate,
      EPC,
      RPM,
      online: Boolean(r.online),
    };
  });  return { rows: mapped, total };
}

export async function getAdminCampaignBreakdown(args: {
  db: PrismaClient;
  range: RangeKey;
  take: number;
}): Promise<{ utmSources: AdminCampaignRow[]; subIds: AdminCampaignRow[]; landings: AdminCampaignRow[] }> {
  const since = rangeStart(args.range);
  const take = Math.min(25, Math.max(5, args.take));

  const [utmSources, subIds, landings] = await Promise.all([
    args.db.$queryRaw<
      { key: string; clicks: bigint; conversions: bigint; revenue: string | null; commission: string | null }[]
    >`
      SELECT
        COALESCE(NULLIF(TRIM(e.metadata->>'utm_source'), ''), '(direct)') AS key,
        SUM(CASE WHEN e."eventType" = 'AFFILIATE_CLICK' THEN 1 ELSE 0 END)::bigint AS clicks,
        SUM(CASE WHEN e."eventType" = 'ORDER_PAID' THEN 1 ELSE 0 END)::bigint AS conversions,
        SUM(CASE WHEN e."eventType" = 'ORDER_PAID' THEN COALESCE(e."revenue", 0) ELSE 0 END)::text AS revenue,
        SUM(CASE WHEN e."eventType" = 'ORDER_PAID' THEN COALESCE(e."commission", 0) ELSE 0 END)::text AS commission
      FROM "AffiliateTrafficEvent" e
      WHERE e."createdAt" >= ${since}
      GROUP BY 1
      ORDER BY clicks DESC
      LIMIT ${take}
    `,
    args.db.$queryRaw<
      { key: string; clicks: bigint; conversions: bigint; revenue: string | null; commission: string | null }[]
    >`
      SELECT
        COALESCE(NULLIF(TRIM(e.metadata->>'subid'), ''), '(none)') AS key,
        SUM(CASE WHEN e."eventType" = 'AFFILIATE_CLICK' THEN 1 ELSE 0 END)::bigint AS clicks,
        SUM(CASE WHEN e."eventType" = 'ORDER_PAID' THEN 1 ELSE 0 END)::bigint AS conversions,
        SUM(CASE WHEN e."eventType" = 'ORDER_PAID' THEN COALESCE(e."revenue", 0) ELSE 0 END)::text AS revenue,
        SUM(CASE WHEN e."eventType" = 'ORDER_PAID' THEN COALESCE(e."commission", 0) ELSE 0 END)::text AS commission
      FROM "AffiliateTrafficEvent" e
      WHERE e."createdAt" >= ${since}
      GROUP BY 1
      ORDER BY clicks DESC
      LIMIT ${take}
    `,
    args.db.$queryRaw<
      { key: string; clicks: bigint; conversions: bigint; revenue: string | null; commission: string | null }[]
    >`
      SELECT
        COALESCE(NULLIF(TRIM(e.pathname), ''), '/') AS key,
        SUM(CASE WHEN e."eventType" = 'AFFILIATE_CLICK' THEN 1 ELSE 0 END)::bigint AS clicks,
        SUM(CASE WHEN e."eventType" = 'ORDER_PAID' THEN 1 ELSE 0 END)::bigint AS conversions,
        SUM(CASE WHEN e."eventType" = 'ORDER_PAID' THEN COALESCE(e."revenue", 0) ELSE 0 END)::text AS revenue,
        SUM(CASE WHEN e."eventType" = 'ORDER_PAID' THEN COALESCE(e."commission", 0) ELSE 0 END)::text AS commission
      FROM "AffiliateTrafficEvent" e
      WHERE e."createdAt" >= ${since}
        AND e.pathname IS NOT NULL
      GROUP BY 1
      ORDER BY clicks DESC
      LIMIT ${take}
    `,
  ]);

  const mapRows = (kind: AdminCampaignRow["kind"], rs: typeof utmSources): AdminCampaignRow[] =>
    rs.map((r) => ({
      kind,
      key: String(r.key),
      clicks: Number(r.clicks),
      conversions: Number(r.conversions),
      revenue: Number(r.revenue ?? 0),
      commission: Number(r.commission ?? 0),
    }));

  return {
    utmSources: mapRows("utm_source", utmSources),
    subIds: mapRows("subid", subIds),
    landings: mapRows("landing", landings),
  };
}

export async function getAdminSystemRealtime(args: {
  db: PrismaClient;
  affiliateProfileId?: string | null;
}): Promise<{
  onlineAffiliates: number;
  clicksLast5m: number;
  conversionsLast5m: number;
  revenueLast5m: number;
  activeSessions: number;
  recentClicks: Array<{
    id: string;
    createdAt: string;
    pathname: string | null;
    refCode: string;
    affiliateProfileId: string;
    trafficSource: string;
  }>;
  recentConversions: Array<{
    id: string;
    createdAt: string;
    orderId: string | null;
    revenue: number;
    commission: number;
    refCode: string;
  }>;
}> {
  const now = Date.now();
  const activeWindow = new Date(now - 5 * 60_000);
  const since30 = new Date(now - 30 * 60_000);

  const scopeWhere = args.affiliateProfileId
    ? Prisma.sql`e."affiliateProfileId" = ${args.affiliateProfileId}`
    : Prisma.sql`TRUE`;

  const [
    onlineAffiliates,
    clicksLast5m,
    conversionsLast5m,
    revenueLast5m,
    activeSessions,
    recentClicks,
    recentConversions,
  ] = await Promise.all([
    args.affiliateProfileId
      ? Promise.resolve(0)
      : args.db.$queryRaw<{ n: bigint }[]>`
          SELECT COUNT(DISTINCT "affiliateProfileId")::bigint AS n
          FROM "AffiliateRealtimeSession"
          WHERE "lastSeenAt" >= ${activeWindow}
        `.then((r) => Number(r[0]?.n ?? 0)),
    args.db.affiliateTrafficEvent.count({
      where: {
        createdAt: { gte: activeWindow },
        eventType: "AFFILIATE_CLICK",
        ...(args.affiliateProfileId ? { affiliateProfileId: args.affiliateProfileId } : {}),
      },
    }),
    args.db.affiliateTrafficEvent.count({
      where: {
        createdAt: { gte: activeWindow },
        eventType: "ORDER_PAID",
        ...(args.affiliateProfileId ? { affiliateProfileId: args.affiliateProfileId } : {}),
      },
    }),
    args.db.affiliateTrafficEvent
      .aggregate({
        where: {
          createdAt: { gte: activeWindow },
          eventType: "ORDER_PAID",
          ...(args.affiliateProfileId ? { affiliateProfileId: args.affiliateProfileId } : {}),
        },
        _sum: { revenue: true },
      })
      .then((a) => Number(a._sum.revenue ?? 0)),
    args.db.affiliateRealtimeSession.count({
      where: {
        lastSeenAt: { gte: activeWindow },
        ...(args.affiliateProfileId ? { affiliateProfileId: args.affiliateProfileId } : {}),
      },
    }),
    args.db.$queryRaw<
      {
        id: string;
        createdAt: Date;
        pathname: string | null;
        referrer: string | null;
        metadata: unknown;
        refCode: string;
        affiliateProfileId: string;
      }[]
    >`
      SELECT e.id, e."createdAt", e.pathname, e.referrer, e.metadata, p."refCode", e."affiliateProfileId"
      FROM "AffiliateTrafficEvent" e
      JOIN "AffiliateProfile" p ON p.id = e."affiliateProfileId"
      WHERE ${scopeWhere}
        AND e."eventType" = 'AFFILIATE_CLICK'
        AND e."createdAt" >= ${since30}
      ORDER BY e."createdAt" DESC
      LIMIT 20
    `,
    args.db.$queryRaw<
      { id: string; createdAt: Date; orderId: string | null; revenue: unknown; commission: unknown; refCode: string }[]
    >`
      SELECT e.id, e."createdAt", e."orderId", e.revenue, e.commission, p."refCode"
      FROM "AffiliateTrafficEvent" e
      JOIN "AffiliateProfile" p ON p.id = e."affiliateProfileId"
      WHERE ${scopeWhere}
        AND e."eventType" = 'ORDER_PAID'
        AND e."createdAt" >= ${since30}
      ORDER BY e."createdAt" DESC
      LIMIT 20
    `,
  ]);  return {
    onlineAffiliates: args.affiliateProfileId ? 0 : onlineAffiliates,
    clicksLast5m,
    conversionsLast5m,
    revenueLast5m,
    activeSessions,
    recentClicks: recentClicks.map((r) => {
      const meta = r.metadata as Record<string, unknown> | null;
      const utm = typeof meta?.utm_source === "string" ? meta.utm_source : null;
      return {
        id: r.id,
        createdAt: r.createdAt.toISOString(),
        pathname: r.pathname,
        refCode: r.refCode,
        affiliateProfileId: r.affiliateProfileId,
        trafficSource: classifyTrafficSourcePublic(r.referrer, utm),
      };
    }),
    recentConversions: recentConversions.map((r) => ({
      id: r.id,
      createdAt: r.createdAt.toISOString(),
      orderId: r.orderId,
      revenue: Number(r.revenue ?? 0),
      commission: Number(r.commission ?? 0),
      refCode: r.refCode,
    })),
  };
}

export async function getAdminAffiliateDetailBundle(args: {
  db: PrismaClient;
  affiliateProfileId: string;
  range: RangeKey;
}): Promise<
  | { ok: false; status: 404 }
  | {
      ok: true;
      profile: { id: string; refCode: string; status: AffiliateStatus; displayName: string | null };
      overview: Awaited<ReturnType<typeof getAffiliateAnalyticsOverview>>;
      chart: { labels: string[]; totals: { clicks: number; orders: number; revenue: number; commission: number }; buckets: AdminChartBucket[] };
      topProducts: Awaited<ReturnType<typeof getAffiliateTopProductsEnhanced>>;
      topPages: Awaited<ReturnType<typeof getAffiliateTopLandingPages>>;
      funnel: Awaited<ReturnType<typeof getAffiliateConversionFunnel>>;
      orders: Array<{
        id: string;
        code: string;
        createdAt: string;
        totalAmount: number;
        paymentStatus: string;
        orderStatus: string;
      }>;
    }
> {
  const profile = await args.db.affiliateProfile.findUnique({
    where: { id: args.affiliateProfileId },
    select: { id: true, refCode: true, status: true, customer: { select: { fullName: true } } },
  });
  if (!profile) return { ok: false, status: 404 } as const;

  const since = rangeStart(args.range);
  type BucketRow = { day: Date; clicks: bigint; paid: bigint; revenue: string | null; commission: string | null };
  const vnDay = Prisma.sql`date_trunc('day', "createdAt" + interval '7 hour')`;
  const chartRows = (await args.db.$queryRaw(
    Prisma.sql`
      SELECT
        ${vnDay} AS day,
        SUM(CASE WHEN "eventType" = 'AFFILIATE_CLICK' THEN 1 ELSE 0 END) AS clicks,
        SUM(CASE WHEN "eventType" = 'ORDER_PAID' THEN 1 ELSE 0 END) AS paid,
        SUM(CASE WHEN "eventType" = 'ORDER_PAID' THEN COALESCE("revenue", 0) ELSE 0 END) AS revenue,
        SUM(CASE WHEN "eventType" = 'ORDER_PAID' THEN COALESCE("commission", 0) ELSE 0 END) AS commission
      FROM "AffiliateTrafficEvent"
      WHERE "affiliateProfileId" = ${args.affiliateProfileId}
        AND "createdAt" >= ${since}
      GROUP BY 1
      ORDER BY 1 ASC
    `,
  )) as BucketRow[];

  const labels = chartRows.map((r) => {
    const t = new Date(r.day.getTime());
    const y = t.getUTCFullYear();
    const m = String(t.getUTCMonth() + 1).padStart(2, "0");
    const d = String(t.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  });
  const buckets: AdminChartBucket[] = chartRows.map((r, idx) => ({
    label: labels[idx]!,
    clicks: Number(r.clicks),
    orders: Number(r.paid),
    revenue: Number(r.revenue ?? 0),
    commission: Number(r.commission ?? 0),
  }));
  const totals = buckets.reduce(
    (acc, b) => {
      acc.clicks += b.clicks;
      acc.orders += b.orders;
      acc.revenue += b.revenue;
      acc.commission += b.commission;
      return acc;
    },
    { clicks: 0, orders: 0, revenue: 0, commission: 0 },
  );

  const [overview, topProducts, topPages, funnel, orders] = await Promise.all([
    getAffiliateAnalyticsOverview({ db: args.db, affiliateProfileId: args.affiliateProfileId, range: args.range }),
    getAffiliateTopProductsEnhanced({
      db: args.db,
      affiliateProfileId: args.affiliateProfileId,
      range: args.range,
      filters: { source: "ALL", device: "ALL", pathnameContains: null, productId: null },
      take: 30,
      sort: "clicks",
    }),
    getAffiliateTopLandingPages({ db: args.db, affiliateProfileId: args.affiliateProfileId, range: args.range, take: 30 }),
    getAffiliateConversionFunnel({ db: args.db, affiliateProfileId: args.affiliateProfileId, range: args.range }),
    args.db.order.findMany({
      where: { affiliateProfileId: args.affiliateProfileId, createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 40,
      select: { id: true, code: true, createdAt: true, totalAmount: true, paymentStatus: true, orderStatus: true },
    }),
  ]);  return {
    ok: true,
    profile: {
      id: profile.id,
      refCode: profile.refCode,
      status: profile.status,
      displayName: profile.customer?.fullName ?? null,
    },
    overview,
    chart: { labels, totals, buckets },
    topProducts,
    topPages,
    funnel,
    orders: orders.map((o) => ({
      id: o.id,
      code: o.code,
      createdAt: o.createdAt.toISOString(),
      totalAmount: Number(o.totalAmount),
      paymentStatus: o.paymentStatus,
      orderStatus: o.orderStatus,
    })),
  };
}
