import "server-only";

import type { PrismaClient } from "@prisma/client";
import type { OpsRollingCounts } from "@/lib/affiliate-ops-anomaly-types";

function range(gte: Date, lt: Date) {
  return { gte, lt };
}

/**
 * DB fallback for rolling windows (heavier than Redis minute buckets — avoid when `AFFILIATE_OPS_REDIS_ROLLING` is on).
 */
export async function fetchAffiliateOpsRollingCounts(args: {
  db: PrismaClient;
  affiliateProfileId: string;
}): Promise<OpsRollingCounts> {
  const now = Date.now();
  const t = (ms: number) => new Date(now - ms);

  const w1cur = range(t(60_000), new Date(now));
  const w1base = range(t(120_000), t(60_000));
  const w5cur = range(t(5 * 60_000), new Date(now));
  const w5base = range(t(15 * 60_000), t(10 * 60_000));
  const w15cur = range(t(15 * 60_000), new Date(now));
  const w15base = range(t(30 * 60_000), t(15 * 60_000));
  const w1hcur = range(t(60 * 60_000), new Date(now));
  const w1hbase = range(t(180 * 60_000), t(120 * 60_000));

  const oldest = t(180 * 60_000);
  const rows = await args.db.$queryRaw<
    {
      clicks1m: bigint;
      clicks1mBaseline: bigint;
      clicks5m: bigint;
      clicks5mBaseline: bigint;
      clicks15m: bigint;
      clicks15mBaseline: bigint;
      clicks1h: bigint;
      clicks1hBaseline: bigint;
      conv1m: bigint;
      conv1mBaseline: bigint;
      conv5m: bigint;
      conv5mBaseline: bigint;
      conv15m: bigint;
      conv15mBaseline: bigint;
      conv1h: bigint;
      conv1hBaseline: bigint;
      clicks5mAffiliateClick: bigint;
      sessions5mEstimate: bigint;
      revenue5mMinor: bigint;
      revenue5mBaselineMinor: bigint;
      revenue1hMinor: bigint;
    }[]
  >`
    SELECT
      COUNT(*) FILTER (
        WHERE "createdAt" >= ${w1cur.gte}
          AND "createdAt" < ${w1cur.lt}
          AND "eventType" IN ('AFFILIATE_CLICK', 'PAGE_VIEW', 'PRODUCT_VIEW', 'ADD_TO_CART', 'CHECKOUT_STARTED')
      )::bigint AS "clicks1m",
      COUNT(*) FILTER (
        WHERE "createdAt" >= ${w1base.gte}
          AND "createdAt" < ${w1base.lt}
          AND "eventType" IN ('AFFILIATE_CLICK', 'PAGE_VIEW', 'PRODUCT_VIEW', 'ADD_TO_CART', 'CHECKOUT_STARTED')
      )::bigint AS "clicks1mBaseline",
      COUNT(*) FILTER (
        WHERE "createdAt" >= ${w5cur.gte}
          AND "createdAt" < ${w5cur.lt}
          AND "eventType" IN ('AFFILIATE_CLICK', 'PAGE_VIEW', 'PRODUCT_VIEW', 'ADD_TO_CART', 'CHECKOUT_STARTED')
      )::bigint AS "clicks5m",
      COUNT(*) FILTER (
        WHERE "createdAt" >= ${w5base.gte}
          AND "createdAt" < ${w5base.lt}
          AND "eventType" IN ('AFFILIATE_CLICK', 'PAGE_VIEW', 'PRODUCT_VIEW', 'ADD_TO_CART', 'CHECKOUT_STARTED')
      )::bigint AS "clicks5mBaseline",
      COUNT(*) FILTER (
        WHERE "createdAt" >= ${w15cur.gte}
          AND "createdAt" < ${w15cur.lt}
          AND "eventType" IN ('AFFILIATE_CLICK', 'PAGE_VIEW', 'PRODUCT_VIEW', 'ADD_TO_CART', 'CHECKOUT_STARTED')
      )::bigint AS "clicks15m",
      COUNT(*) FILTER (
        WHERE "createdAt" >= ${w15base.gte}
          AND "createdAt" < ${w15base.lt}
          AND "eventType" IN ('AFFILIATE_CLICK', 'PAGE_VIEW', 'PRODUCT_VIEW', 'ADD_TO_CART', 'CHECKOUT_STARTED')
      )::bigint AS "clicks15mBaseline",
      COUNT(*) FILTER (
        WHERE "createdAt" >= ${w1hcur.gte}
          AND "createdAt" < ${w1hcur.lt}
          AND "eventType" IN ('AFFILIATE_CLICK', 'PAGE_VIEW', 'PRODUCT_VIEW', 'ADD_TO_CART', 'CHECKOUT_STARTED')
      )::bigint AS "clicks1h",
      COUNT(*) FILTER (
        WHERE "createdAt" >= ${w1hbase.gte}
          AND "createdAt" < ${w1hbase.lt}
          AND "eventType" IN ('AFFILIATE_CLICK', 'PAGE_VIEW', 'PRODUCT_VIEW', 'ADD_TO_CART', 'CHECKOUT_STARTED')
      )::bigint AS "clicks1hBaseline",

      COUNT(*) FILTER (
        WHERE "createdAt" >= ${w1cur.gte}
          AND "createdAt" < ${w1cur.lt}
          AND "eventType" = 'ORDER_PAID'
      )::bigint AS "conv1m",
      COUNT(*) FILTER (
        WHERE "createdAt" >= ${w1base.gte}
          AND "createdAt" < ${w1base.lt}
          AND "eventType" = 'ORDER_PAID'
      )::bigint AS "conv1mBaseline",
      COUNT(*) FILTER (
        WHERE "createdAt" >= ${w5cur.gte}
          AND "createdAt" < ${w5cur.lt}
          AND "eventType" = 'ORDER_PAID'
      )::bigint AS "conv5m",
      COUNT(*) FILTER (
        WHERE "createdAt" >= ${w5base.gte}
          AND "createdAt" < ${w5base.lt}
          AND "eventType" = 'ORDER_PAID'
      )::bigint AS "conv5mBaseline",
      COUNT(*) FILTER (
        WHERE "createdAt" >= ${w15cur.gte}
          AND "createdAt" < ${w15cur.lt}
          AND "eventType" = 'ORDER_PAID'
      )::bigint AS "conv15m",
      COUNT(*) FILTER (
        WHERE "createdAt" >= ${w15base.gte}
          AND "createdAt" < ${w15base.lt}
          AND "eventType" = 'ORDER_PAID'
      )::bigint AS "conv15mBaseline",
      COUNT(*) FILTER (
        WHERE "createdAt" >= ${w1hcur.gte}
          AND "createdAt" < ${w1hcur.lt}
          AND "eventType" = 'ORDER_PAID'
      )::bigint AS "conv1h",
      COUNT(*) FILTER (
        WHERE "createdAt" >= ${w1hbase.gte}
          AND "createdAt" < ${w1hbase.lt}
          AND "eventType" = 'ORDER_PAID'
      )::bigint AS "conv1hBaseline",

      COUNT(*) FILTER (
        WHERE "createdAt" >= ${w5cur.gte}
          AND "createdAt" < ${w5cur.lt}
          AND "eventType" = 'AFFILIATE_CLICK'
      )::bigint AS "clicks5mAffiliateClick",
      COUNT(DISTINCT "sessionId") FILTER (
        WHERE "createdAt" >= ${w5cur.gte}
          AND "createdAt" < ${w5cur.lt}
          AND "sessionId" IS NOT NULL
      )::bigint AS "sessions5mEstimate",

      COALESCE(SUM(("revenue" * 100)) FILTER (
        WHERE "createdAt" >= ${w5cur.gte}
          AND "createdAt" < ${w5cur.lt}
          AND "eventType" = 'ORDER_PAID'
      ), 0)::bigint AS "revenue5mMinor",
      COALESCE(SUM(("revenue" * 100)) FILTER (
        WHERE "createdAt" >= ${w5base.gte}
          AND "createdAt" < ${w5base.lt}
          AND "eventType" = 'ORDER_PAID'
      ), 0)::bigint AS "revenue5mBaselineMinor",
      COALESCE(SUM(("revenue" * 100)) FILTER (
        WHERE "createdAt" >= ${w1hcur.gte}
          AND "createdAt" < ${w1hcur.lt}
          AND "eventType" = 'ORDER_PAID'
      ), 0)::bigint AS "revenue1hMinor"
    FROM "AffiliateTrafficEvent"
    WHERE "affiliateProfileId" = ${args.affiliateProfileId}
      AND "createdAt" >= ${oldest}
  `;
  const row = rows[0];

  return {
    now,
    clicks1m: Number(row?.clicks1m ?? 0),
    clicks1mBaseline: Number(row?.clicks1mBaseline ?? 0),
    clicks5m: Number(row?.clicks5m ?? 0),
    clicks5mBaseline: Number(row?.clicks5mBaseline ?? 0),
    clicks15m: Number(row?.clicks15m ?? 0),
    clicks15mBaseline: Number(row?.clicks15mBaseline ?? 0),
    clicks1h: Number(row?.clicks1h ?? 0),
    clicks1hBaseline: Number(row?.clicks1hBaseline ?? 0),
    conv1m: Number(row?.conv1m ?? 0),
    conv1mBaseline: Number(row?.conv1mBaseline ?? 0),
    conv5m: Number(row?.conv5m ?? 0),
    conv5mBaseline: Number(row?.conv5mBaseline ?? 0),
    conv15m: Number(row?.conv15m ?? 0),
    conv15mBaseline: Number(row?.conv15mBaseline ?? 0),
    conv1h: Number(row?.conv1h ?? 0),
    conv1hBaseline: Number(row?.conv1hBaseline ?? 0),
    revenue5mMinor: Number(row?.revenue5mMinor ?? 0),
    revenue5mBaselineMinor: Number(row?.revenue5mBaselineMinor ?? 0),
    revenue1hMinor: Number(row?.revenue1hMinor ?? 0),
    clicks5mAffiliateClick: Number(row?.clicks5mAffiliateClick ?? 0),
    sessions5mEstimate: Number(row?.sessions5mEstimate ?? 0),
    distinctIp5mEstimate: 0,
    rollMeta: null,
  };
}
