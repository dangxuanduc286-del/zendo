import "server-only";

import type { AffiliateTrafficEventType, PrismaClient } from "@prisma/client";
import type { OpsRollingCounts } from "@/lib/affiliate-ops-anomaly-types";

const CLICK_LIKE: AffiliateTrafficEventType[] = [
  "AFFILIATE_CLICK",
  "PAGE_VIEW",
  "PRODUCT_VIEW",
  "ADD_TO_CART",
  "CHECKOUT_STARTED",
];

function range(gte: Date, lt: Date) {
  return { gte, lt };
}

function decSumToMinor(v: { toNumber?: () => number } | number | null | undefined): number {
  if (v == null) return 0;
  const n = typeof v === "number" ? v : typeof v.toNumber === "function" ? v.toNumber() : Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
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

  const q = (window: { gte: Date; lt: Date }, eventTypes: AffiliateTrafficEventType[]) =>
    args.db.affiliateTrafficEvent.count({
      where: {
        affiliateProfileId: args.affiliateProfileId,
        createdAt: window,
        eventType: { in: [...eventTypes] },
      },
    });

  const qConv = (window: { gte: Date; lt: Date }) =>
    args.db.affiliateTrafficEvent.count({
      where: {
        affiliateProfileId: args.affiliateProfileId,
        createdAt: window,
        eventType: "ORDER_PAID",
      },
    });

  const qAffClick = (window: { gte: Date; lt: Date }) =>
    args.db.affiliateTrafficEvent.count({
      where: {
        affiliateProfileId: args.affiliateProfileId,
        createdAt: window,
        eventType: "AFFILIATE_CLICK",
      },
    });

  const revPaid = (window: { gte: Date; lt: Date }) =>
    args.db.affiliateTrafficEvent.aggregate({
      where: {
        affiliateProfileId: args.affiliateProfileId,
        createdAt: window,
        eventType: "ORDER_PAID",
      },
      _sum: { revenue: true },
    });

  const distinctSessions = async (window: { gte: Date; lt: Date }) => {
    const rows = await args.db.$queryRaw<{ c: bigint }[]>`
      SELECT COUNT(DISTINCT "sessionId")::bigint AS c
      FROM "AffiliateTrafficEvent"
      WHERE "affiliateProfileId" = ${args.affiliateProfileId}
        AND "createdAt" >= ${window.gte}
        AND "createdAt" < ${window.lt}
        AND "sessionId" IS NOT NULL
    `;
    return Number(rows[0]?.c ?? 0);
  };

  const [
    clicks1m,
    clicks1mBaseline,
    clicks5m,
    clicks5mBaseline,
    clicks15m,
    clicks15mBaseline,
    clicks1h,
    clicks1hBaseline,
    conv1m,
    conv1mBaseline,
    conv5m,
    conv5mBaseline,
    conv15m,
    conv15mBaseline,
    conv1h,
    conv1hBaseline,
    clicks5mAffiliateClick,
    sessions5mEstimate,
    rev5cur,
    rev5base,
    rev1hcur,
  ] = await Promise.all([
    q(w1cur, CLICK_LIKE),
    q(w1base, CLICK_LIKE),
    q(w5cur, CLICK_LIKE),
    q(w5base, CLICK_LIKE),
    q(w15cur, CLICK_LIKE),
    q(w15base, CLICK_LIKE),
    q(w1hcur, CLICK_LIKE),
    q(w1hbase, CLICK_LIKE),
    qConv(w1cur),
    qConv(w1base),
    qConv(w5cur),
    qConv(w5base),
    qConv(w15cur),
    qConv(w15base),
    qConv(w1hcur),
    qConv(w1hbase),
    qAffClick(w5cur),
    distinctSessions(w5cur),
    revPaid(w5cur),
    revPaid(w5base),
    revPaid(w1hcur),
  ]);

  return {
    now,
    clicks1m,
    clicks1mBaseline,
    clicks5m,
    clicks5mBaseline,
    clicks15m,
    clicks15mBaseline,
    clicks1h,
    clicks1hBaseline,
    conv1m,
    conv1mBaseline,
    conv5m,
    conv5mBaseline,
    conv15m,
    conv15mBaseline,
    conv1h,
    conv1hBaseline,
    revenue5mMinor: decSumToMinor(rev5cur._sum.revenue),
    revenue5mBaselineMinor: decSumToMinor(rev5base._sum.revenue),
    revenue1hMinor: decSumToMinor(rev1hcur._sum.revenue),
    clicks5mAffiliateClick,
    sessions5mEstimate,
    distinctIp5mEstimate: 0,
    rollMeta: null,
  };
}
