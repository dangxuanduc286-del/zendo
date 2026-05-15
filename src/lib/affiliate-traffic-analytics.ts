import "server-only";

import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { rangeStart, type RangeKey } from "@/lib/affiliate-analytics";
import type { AffiliateTrafficQueryFilters, DeviceBucket, TrafficSourceBucket } from "@/lib/affiliate-traffic-filters";

export type { AffiliateTrafficQueryFilters, DeviceBucket, TrafficSourceBucket } from "@/lib/affiliate-traffic-filters";

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

export function clearAffiliateTrafficAnalyticsCache(): void {
  cache.clear();
}

export function getAffiliateTrafficAnalyticsCacheSize(): number {
  return cache.size;
}


/** SQL expression: traffic source bucket for row alias `e`. */
export function sqlTrafficSourceBucket(): Prisma.Sql {
  return Prisma.sql`
    CASE
      WHEN LOWER(COALESCE(e.referrer, '')) LIKE '%tiktok.com%'
        OR LOWER(COALESCE(e.metadata->>'utm_source','')) LIKE '%tiktok%' THEN 'TIKTOK'
      WHEN LOWER(COALESCE(e.referrer, '')) LIKE '%facebook.com%'
        OR LOWER(COALESCE(e.referrer, '')) LIKE '%fb.com%'
        OR LOWER(COALESCE(e.metadata->>'utm_source','')) LIKE '%facebook%' THEN 'FACEBOOK'
      WHEN LOWER(COALESCE(e.referrer, '')) LIKE '%youtube.com%'
        OR LOWER(COALESCE(e.metadata->>'utm_source','')) LIKE '%youtube%' THEN 'YOUTUBE'
      WHEN LOWER(COALESCE(e.referrer, '')) LIKE '%instagram.com%'
        OR LOWER(COALESCE(e.metadata->>'utm_source','')) LIKE '%instagram%' THEN 'INSTAGRAM'
      WHEN (COALESCE(e.referrer, '') = '' AND COALESCE(e.metadata->>'utm_source','') = '') THEN 'DIRECT'
      ELSE 'UNKNOWN'
    END
  `;
}

export function sqlDeviceBucket(): Prisma.Sql {
  return Prisma.sql`
    CASE
      WHEN LOWER(COALESCE(e.device, '')) LIKE '%tablet%' OR LOWER(COALESCE(e.device, '')) LIKE '%ipad%' THEN 'tablet'
      WHEN LOWER(COALESCE(e.device, '')) LIKE '%mobile%' OR LOWER(COALESCE(e.device, '')) LIKE '%phone%' THEN 'mobile'
      ELSE 'desktop'
    END
  `;
}

export function classifyTrafficSourcePublic(referrer: string | null, utmSource: string | null): TrafficSourceBucket {
  const r = (referrer ?? "").toLowerCase();
  const u = (utmSource ?? "").toLowerCase();
  if (r.includes("tiktok.com") || u.includes("tiktok")) return "TIKTOK";
  if (r.includes("facebook.com") || r.includes("fb.com") || u.includes("facebook")) return "FACEBOOK";
  if (r.includes("youtube.com") || u.includes("youtube")) return "YOUTUBE";
  if (r.includes("instagram.com") || u.includes("instagram")) return "INSTAGRAM";
  if (!referrer?.trim() && !utmSource?.trim()) return "DIRECT";
  return "UNKNOWN";
}

function buildScopedWhere(args: {
  affiliateProfileId: string | null;
  since: Date;
  filters: AffiliateTrafficQueryFilters;
}): Prisma.Sql {
  const parts: Prisma.Sql[] = [Prisma.sql`e."createdAt" >= ${args.since}`];
  if (args.affiliateProfileId) {
    parts.push(Prisma.sql`e."affiliateProfileId" = ${args.affiliateProfileId}`);
  }
  if (args.filters.pathnameContains?.trim()) {
    const p = `%${args.filters.pathnameContains.trim().slice(0, 200).replace(/%/g, "")}%`;
    parts.push(Prisma.sql`e.pathname IS NOT NULL AND e.pathname ILIKE ${p}`);
  }
  if (args.filters.productId?.trim()) {
    parts.push(Prisma.sql`e."productId" = ${args.filters.productId.trim()}`);
  }
  if (args.filters.source !== "ALL") {
    parts.push(Prisma.sql`(${sqlTrafficSourceBucket()}) = ${args.filters.source}`);
  }
  if (args.filters.device !== "ALL") {
    parts.push(Prisma.sql`(${sqlDeviceBucket()}) = ${args.filters.device}`);
  }
  return Prisma.join(parts, " AND ");
}

export type TopAffiliateLinkRow = {
  pathname: string;
  clicks: number;
  visitors: number;
  orders: number;
  revenue: number;
  commission: number;
  conversionRate: number;
};

export async function getAffiliateTopLinks(args: {
  db: PrismaClient;
  affiliateProfileId: string | null;
  range: RangeKey;
  filters: AffiliateTrafficQueryFilters;
  take: number;
  skip?: number;
}): Promise<TopAffiliateLinkRow[]> {
  const since = rangeStart(args.range);
  const take = Math.min(80, Math.max(1, Math.floor(args.take)));
  const skip = Math.min(500, Math.max(0, Math.floor(args.skip ?? 0)));
  const key = `tl:${args.affiliateProfileId ?? "all"}:${args.range}:${JSON.stringify(args.filters)}:${take}:${skip}`;
  const hit = cacheGet<TopAffiliateLinkRow[]>(key);
  if (hit) return hit;

  const whereSql = buildScopedWhere({ affiliateProfileId: args.affiliateProfileId, since, filters: args.filters });
  const rows = await args.db.$queryRaw<
    {
      pathname: string;
      clicks: bigint;
      visitors: bigint;
      orders: bigint;
      revenue: string | null;
      commission: string | null;
    }[]
  >(Prisma.sql`
    SELECT
      e.pathname AS pathname,
      SUM(CASE WHEN e."eventType" = 'AFFILIATE_CLICK' THEN 1 ELSE 0 END)::bigint AS clicks,
      COUNT(DISTINCT CASE WHEN e."eventType" = 'AFFILIATE_CLICK' AND e."sessionId" IS NOT NULL THEN e."sessionId" END)::bigint AS visitors,
      SUM(CASE WHEN e."eventType" = 'ORDER_PAID' THEN 1 ELSE 0 END)::bigint AS orders,
      SUM(CASE WHEN e."eventType" = 'ORDER_PAID' THEN COALESCE(e."revenue", 0) ELSE 0 END)::text AS revenue,
      SUM(CASE WHEN e."eventType" = 'ORDER_PAID' THEN COALESCE(e."commission", 0) ELSE 0 END)::text AS commission
    FROM "AffiliateTrafficEvent" e
    WHERE ${whereSql}
      AND e.pathname IS NOT NULL
    GROUP BY e.pathname
    ORDER BY clicks DESC
    LIMIT ${take} OFFSET ${skip}
  `);

  const out: TopAffiliateLinkRow[] = rows.map((r) => {
    const clicks = Number(r.clicks);
    const orders = Number(r.orders);
    return {
      pathname: String(r.pathname),
      clicks,
      visitors: Number(r.visitors),
      orders,
      revenue: Number(r.revenue ?? 0),
      commission: Number(r.commission ?? 0),
      conversionRate: clicks > 0 ? orders / clicks : 0,
    };
  });
  cacheSet(key, out);  return out;
}

export type SourceAggRow = {
  source: TrafficSourceBucket;
  clicks: number;
  visitors: number;
  orders: number;
  revenue: number;
  commission: number;
  conversionRate: number;
};

export async function getAffiliateTrafficSources(args: {
  db: PrismaClient;
  affiliateProfileId: string | null;
  range: RangeKey;
  filters: AffiliateTrafficQueryFilters;
}): Promise<SourceAggRow[]> {
  const since = rangeStart(args.range);
  const filtersNoSource: AffiliateTrafficQueryFilters = { ...args.filters, source: "ALL" };
  const key = `src:${args.affiliateProfileId ?? "all"}:${args.range}:${JSON.stringify(filtersNoSource)}`;
  const hit = cacheGet<SourceAggRow[]>(key);
  if (hit) return hit;

  const whereSql = buildScopedWhere({
    affiliateProfileId: args.affiliateProfileId,
    since,
    filters: filtersNoSource,
  });
  const bucket = sqlTrafficSourceBucket();
  const rows = await args.db.$queryRaw<
    { bucket: string; clicks: bigint; visitors: bigint; orders: bigint; revenue: string | null; commission: string | null }[]
  >(Prisma.sql`
    SELECT
      (${bucket})::text AS bucket,
      SUM(CASE WHEN e."eventType" = 'AFFILIATE_CLICK' THEN 1 ELSE 0 END)::bigint AS clicks,
      COUNT(DISTINCT CASE WHEN e."eventType" = 'AFFILIATE_CLICK' AND e."sessionId" IS NOT NULL THEN e."sessionId" END)::bigint AS visitors,
      SUM(CASE WHEN e."eventType" = 'ORDER_PAID' THEN 1 ELSE 0 END)::bigint AS orders,
      SUM(CASE WHEN e."eventType" = 'ORDER_PAID' THEN COALESCE(e."revenue", 0) ELSE 0 END)::text AS revenue,
      SUM(CASE WHEN e."eventType" = 'ORDER_PAID' THEN COALESCE(e."commission", 0) ELSE 0 END)::text AS commission
    FROM "AffiliateTrafficEvent" e
    WHERE ${whereSql}
    GROUP BY 1
    ORDER BY clicks DESC
  `);

  const out: SourceAggRow[] = rows.map((r) => {
    const clicks = Number(r.clicks);
    const orders = Number(r.orders);
    const b = String(r.bucket).toUpperCase();
    const source = (["TIKTOK", "FACEBOOK", "YOUTUBE", "INSTAGRAM", "DIRECT", "UNKNOWN"].includes(b) ? b : "UNKNOWN") as TrafficSourceBucket;
    return {
      source,
      clicks,
      visitors: Number(r.visitors),
      orders,
      revenue: Number(r.revenue ?? 0),
      commission: Number(r.commission ?? 0),
      conversionRate: clicks > 0 ? orders / clicks : 0,
    };
  });
  cacheSet(key, out);  return out;
}

export type DeviceAggRow = {
  device: DeviceBucket;
  visitors: number;
  orders: number;
  clicks: number;
  conversionRate: number;
};

export async function getAffiliateDeviceBreakdown(args: {
  db: PrismaClient;
  affiliateProfileId: string | null;
  range: RangeKey;
  filters: AffiliateTrafficQueryFilters;
}): Promise<DeviceAggRow[]> {
  const since = rangeStart(args.range);
  const filtersNoDevice: AffiliateTrafficQueryFilters = { ...args.filters, device: "ALL" };
  const key = `dev:${args.affiliateProfileId ?? "all"}:${args.range}:${JSON.stringify(filtersNoDevice)}`;
  const hit = cacheGet<DeviceAggRow[]>(key);
  if (hit) return hit;

  const whereSql = buildScopedWhere({
    affiliateProfileId: args.affiliateProfileId,
    since,
    filters: filtersNoDevice,
  });
  const devBucket = sqlDeviceBucket();
  const rows = await args.db.$queryRaw<
    { bucket: string; visitors: bigint; orders: bigint; clicks: bigint }[]
  >(Prisma.sql`
    SELECT
      (${devBucket})::text AS bucket,
      COUNT(DISTINCT CASE WHEN e."eventType" = 'AFFILIATE_CLICK' AND e."sessionId" IS NOT NULL THEN e."sessionId" END)::bigint AS visitors,
      SUM(CASE WHEN e."eventType" = 'ORDER_PAID' THEN 1 ELSE 0 END)::bigint AS orders,
      SUM(CASE WHEN e."eventType" = 'AFFILIATE_CLICK' THEN 1 ELSE 0 END)::bigint AS clicks
    FROM "AffiliateTrafficEvent" e
    WHERE ${whereSql}
    GROUP BY 1
    ORDER BY clicks DESC
  `);

  const out: DeviceAggRow[] = rows.map((r) => {
    const clicks = Number(r.clicks);
    const orders = Number(r.orders);
    const d = String(r.bucket) as DeviceBucket;
    return {
      device: d === "tablet" || d === "mobile" ? d : "desktop",
      visitors: Number(r.visitors),
      orders,
      clicks,
      conversionRate: clicks > 0 ? orders / clicks : 0,
    };
  });
  cacheSet(key, out);  return out;
}

export type LandingAggRow = {
  pathname: string;
  visits: number;
  clicks: number;
  orders: number;
  revenue: number;
  commission: number;
  conversionRate: number;
};

export async function getAffiliateLandingAnalytics(args: {
  db: PrismaClient;
  affiliateProfileId: string | null;
  range: RangeKey;
  filters: AffiliateTrafficQueryFilters;
  take: number;
  skip?: number;
}): Promise<LandingAggRow[]> {
  const since = rangeStart(args.range);
  const take = Math.min(80, Math.max(1, Math.floor(args.take)));
  const skip = Math.min(500, Math.max(0, Math.floor(args.skip ?? 0)));
  const key = `land:${args.affiliateProfileId ?? "all"}:${args.range}:${JSON.stringify(args.filters)}:${take}:${skip}`;
  const hit = cacheGet<LandingAggRow[]>(key);
  if (hit) return hit;

  const whereSql = buildScopedWhere({ affiliateProfileId: args.affiliateProfileId, since, filters: args.filters });
  const rows = await args.db.$queryRaw<
    {
      pathname: string;
      clicks: bigint;
      visits: bigint;
      orders: bigint;
      revenue: string | null;
      commission: string | null;
    }[]
  >(Prisma.sql`
    SELECT
      e.pathname AS pathname,
      SUM(CASE WHEN e."eventType" = 'AFFILIATE_CLICK' THEN 1 ELSE 0 END)::bigint AS clicks,
      SUM(CASE WHEN e."eventType" = 'AFFILIATE_CLICK' THEN 1 ELSE 0 END)::bigint AS visits,
      SUM(CASE WHEN e."eventType" = 'ORDER_PAID' THEN 1 ELSE 0 END)::bigint AS orders,
      SUM(CASE WHEN e."eventType" = 'ORDER_PAID' THEN COALESCE(e."revenue", 0) ELSE 0 END)::text AS revenue,
      SUM(CASE WHEN e."eventType" = 'ORDER_PAID' THEN COALESCE(e."commission", 0) ELSE 0 END)::text AS commission
    FROM "AffiliateTrafficEvent" e
    WHERE ${whereSql}
      AND e.pathname IS NOT NULL
    GROUP BY e.pathname
    ORDER BY clicks DESC
    LIMIT ${take} OFFSET ${skip}
  `);

  const out: LandingAggRow[] = rows.map((r) => {
    const clicks = Number(r.clicks);
    const orders = Number(r.orders);
    return {
      pathname: String(r.pathname),
      visits: Number(r.visits),
      clicks,
      orders,
      revenue: Number(r.revenue ?? 0),
      commission: Number(r.commission ?? 0),
      conversionRate: clicks > 0 ? orders / clicks : 0,
    };
  });
  cacheSet(key, out);  return out;
}

export type TimelineBucket = {
  label: string;
  clicks: number;
  orders: number;
  revenue: number;
  commission: number;
  conversionRate: number;
};

export async function getAffiliateConversionTimeline(args: {
  db: PrismaClient;
  affiliateProfileId: string | null;
  range: RangeKey;
  filters: AffiliateTrafficQueryFilters;
}): Promise<TimelineBucket[]> {
  const since = rangeStart(args.range);
  const key = `tl:${args.affiliateProfileId ?? "all"}:${args.range}:${JSON.stringify(args.filters)}`;
  const hit = cacheGet<TimelineBucket[]>(key);
  if (hit) return hit;

  const whereSql = buildScopedWhere({ affiliateProfileId: args.affiliateProfileId, since, filters: args.filters });
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
    WHERE ${whereSql}
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

export type TopProductEnhancedRow = {
  productId: string;
  productName: string;
  imageUrl: string | null;
  clicks: number;
  visitors: number;
  paidOrders: number;
  revenue: number;
  commission: number;
  conversionRate: number;
};

export async function getAffiliateTopProductsEnhanced(args: {
  db: PrismaClient;
  affiliateProfileId: string;
  range: RangeKey;
  filters: AffiliateTrafficQueryFilters;
  take: number;
  sort: "clicks" | "revenue" | "commission" | "conversion" | "orders" | "visitors" | "epc";
}): Promise<TopProductEnhancedRow[]> {
  const since = rangeStart(args.range);
  const take = Math.min(50, Math.max(1, Math.floor(args.take)));
  const whereBase = buildScopedWhere({
    affiliateProfileId: args.affiliateProfileId,
    since,
    filters: args.filters,
  });

  const sortColWhitelist: Record<typeof args.sort, string> = {
    clicks: "clicks",
    revenue: "(NULLIF(revenue, '')::numeric)",
    commission: "(NULLIF(commission, '')::numeric)",
    conversion: "(CASE WHEN clicks > 0 THEN paid_orders::float / NULLIF(clicks, 0) ELSE 0 END)",
    orders: "paid_orders",
    visitors: "visitors",
    epc: "(CASE WHEN clicks > 0 THEN (NULLIF(commission, '0')::numeric) / NULLIF(clicks::numeric, 0) ELSE 0 END)",
  };
  const orderCol = sortColWhitelist[args.sort] ?? "clicks";

  const rows = await args.db.$queryRaw<
    {
      productId: string;
      clicks: bigint;
      visitors: bigint;
      paid_orders: bigint;
      revenue: string | null;
      commission: string | null;
    }[]
  >(Prisma.sql`
    WITH pv AS (
      SELECT
        e."productId" AS pid,
        COUNT(*)::bigint AS clicks,
        COUNT(DISTINCT e."sessionId")::bigint AS visitors
      FROM "AffiliateTrafficEvent" e
      WHERE ${whereBase}
        AND e."eventType" = 'PRODUCT_VIEW'
        AND e."productId" IS NOT NULL
      GROUP BY e."productId"
    ),
    po AS (
      SELECT
        e."productId" AS pid,
        COUNT(*)::bigint AS paid_orders,
        SUM(COALESCE(e."revenue", 0))::text AS revenue,
        SUM(COALESCE(e."commission", 0))::text AS commission
      FROM "AffiliateTrafficEvent" e
      WHERE ${whereBase}
        AND e."eventType" = 'ORDER_PAID'
        AND e."productId" IS NOT NULL
      GROUP BY e."productId"
    ),
    merged AS (
      SELECT
        COALESCE(pv.pid, po.pid) AS "productId",
        COALESCE(pv.clicks, 0::bigint) AS clicks,
        COALESCE(pv.visitors, 0::bigint) AS visitors,
        COALESCE(po.paid_orders, 0::bigint) AS paid_orders,
        COALESCE(po.revenue, '0')::text AS revenue,
        COALESCE(po.commission, '0')::text AS commission
      FROM pv
      FULL OUTER JOIN po ON pv.pid = po.pid
    )
    SELECT * FROM merged
    WHERE "productId" IS NOT NULL
    ORDER BY ${Prisma.raw(`${orderCol} DESC NULLS LAST`)}
    LIMIT ${take}
  `);

  const pids = rows.map((r) => String(r.productId));
  const products = pids.length
    ? await args.db.product.findMany({
        where: { id: { in: pids } },
        select: {
          id: true,
          name: true,
          images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
        },
      })
    : [];
  const meta = new Map(
    products.map((p) => [p.id, { name: p.name, imageUrl: p.images[0]?.url ?? null }]),
  );

  const out: TopProductEnhancedRow[] = rows.map((r) => {
    const productId = String(r.productId);
    const clicks = Number(r.clicks);
    const paidOrders = Number(r.paid_orders);
    const m = meta.get(productId);
    return {
      productId,
      productName: m?.name ?? "Sản phẩm",
      imageUrl: m?.imageUrl ?? null,
      clicks,
      visitors: Number(r.visitors),
      paidOrders,
      revenue: Number(r.revenue ?? 0),
      commission: Number(r.commission ?? 0),
      conversionRate: clicks > 0 ? paidOrders / clicks : 0,
    };
  });  return out;
}
