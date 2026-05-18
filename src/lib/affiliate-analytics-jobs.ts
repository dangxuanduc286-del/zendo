import "server-only";

import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";


/** Rebuild hourly buckets for [from, to) from raw traffic events (idempotent). */
export async function rebuildAffiliateHourlyAggregates(args: {
  db: PrismaClient;
  from: Date;
  to: Date;
}): Promise<{ deleted: number; inserted: number }> {
  const del = await args.db.affiliateHourlyAggregate.deleteMany({
    where: { hourStart: { gte: args.from, lt: args.to } },
  });

  const inserted = await args.db.$executeRaw(Prisma.sql`
    INSERT INTO "AffiliateHourlyAggregate" ("id","affiliateProfileId","hourStart","clicks","uniqueSessions","orderPaidCount","revenue","commission","updatedAt")
    SELECT
      gen_random_uuid()::text,
      e."affiliateProfileId",
      date_trunc('hour', e."createdAt") AS "hourStart",
      SUM(CASE WHEN e."eventType" = 'AFFILIATE_CLICK' THEN 1 ELSE 0 END)::int,
      COUNT(DISTINCT CASE WHEN e."eventType" = 'AFFILIATE_CLICK' AND e."sessionId" IS NOT NULL THEN e."sessionId" END)::int,
      SUM(CASE WHEN e."eventType" = 'ORDER_PAID' THEN 1 ELSE 0 END)::int,
      COALESCE(SUM(CASE WHEN e."eventType" = 'ORDER_PAID' THEN e."revenue" ELSE 0 END), 0)::decimal(14,2),
      COALESCE(SUM(CASE WHEN e."eventType" = 'ORDER_PAID' THEN e."commission" ELSE 0 END), 0)::decimal(14,2),
      NOW()
    FROM "AffiliateTrafficEvent" e
    WHERE e."createdAt" >= ${args.from} AND e."createdAt" < ${args.to}
    GROUP BY e."affiliateProfileId", date_trunc('hour', e."createdAt")
  `);
  return { deleted: del.count, inserted: Number(inserted) };
}

/** Rebuild daily buckets (VN day, same as chart API) for [from, to). */
export async function rebuildAffiliateDailyAggregates(args: {
  db: PrismaClient;
  from: Date;
  to: Date;
}): Promise<{ deleted: number; inserted: number }> {
  const del = await args.db.affiliateDailyAggregate.deleteMany({
    where: { dayStart: { gte: args.from, lt: args.to } },
  });

  const inserted = await args.db.$executeRaw(Prisma.sql`
    INSERT INTO "AffiliateDailyAggregate" ("id","affiliateProfileId","dayStart","clicks","uniqueVisitors","orderPaidCount","revenue","commission","updatedAt")
    SELECT
      gen_random_uuid()::text,
      e."affiliateProfileId",
      date_trunc('day', e."createdAt" + interval '7 hour') AS "dayStart",
      SUM(CASE WHEN e."eventType" = 'AFFILIATE_CLICK' THEN 1 ELSE 0 END)::int,
      COUNT(DISTINCT CASE WHEN e."eventType" = 'AFFILIATE_CLICK' AND e."sessionId" IS NOT NULL THEN e."sessionId" END)::int,
      SUM(CASE WHEN e."eventType" = 'ORDER_PAID' THEN 1 ELSE 0 END)::int,
      COALESCE(SUM(CASE WHEN e."eventType" = 'ORDER_PAID' THEN e."revenue" ELSE 0 END), 0)::decimal(14,2),
      COALESCE(SUM(CASE WHEN e."eventType" = 'ORDER_PAID' THEN e."commission" ELSE 0 END), 0)::decimal(14,2),
      NOW()
    FROM "AffiliateTrafficEvent" e
    WHERE e."createdAt" >= ${args.from} AND e."createdAt" < ${args.to}
    GROUP BY e."affiliateProfileId", date_trunc('day', e."createdAt" + interval '7 hour')
  `);
  return { deleted: del.count, inserted: Number(inserted) };
}

export async function cleanupStaleAffiliateRealtimeSessions(args: {
  db: PrismaClient;
  olderThan: Date;
}): Promise<{ deleted: number }> {
  const r = await args.db.affiliateRealtimeSession.deleteMany({
    where: { lastSeenAt: { lt: args.olderThan } },
  });
  return { deleted: r.count };
}

export async function deleteOrphanAffiliateTrafficEvents(args: { db: PrismaClient }): Promise<{ deleted: number }> {
  const r = await args.db.$executeRaw(Prisma.sql`
    DELETE FROM "AffiliateTrafficEvent" e
    WHERE NOT EXISTS (
      SELECT 1 FROM "AffiliateProfile" p WHERE p."id" = e."affiliateProfileId"
    )
  `);
  return { deleted: Number(r) };
}

export type AffiliateAnalyticsHealth = {
  latestTrafficEventAt: string | null;
  latestDailyAggregateAt: string | null;
  realtimeSessionsActive5m: number;
  hourlyAggregateRows: number;
  dailyAggregateRows: number;
  jobHint: string;
};

export async function getAffiliateAnalyticsHealth(args: { db: PrismaClient }): Promise<AffiliateAnalyticsHealth> {
  const now = Date.now();
  const activeWindow = new Date(now - 5 * 60_000);

  const [latestEvt, latestDaily, rtCount, hourlyCount, dailyCount] = await Promise.all([
    args.db.affiliateTrafficEvent.findFirst({ orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
    args.db.affiliateDailyAggregate.findFirst({ orderBy: { updatedAt: "desc" }, select: { updatedAt: true } }),
    args.db.affiliateRealtimeSession.count({ where: { lastSeenAt: { gte: activeWindow } } }),
    args.db.affiliateHourlyAggregate.count(),
    args.db.affiliateDailyAggregate.count(),
  ]);

  return {
    latestTrafficEventAt: latestEvt?.createdAt.toISOString() ?? null,
    latestDailyAggregateAt: latestDaily?.updatedAt.toISOString() ?? null,
    realtimeSessionsActive5m: rtCount,
    hourlyAggregateRows: hourlyCount,
    dailyAggregateRows: dailyCount,
    jobHint: "npm run affiliate:cron — hoặc tsx scripts/run-affiliate-cron.ts",
  };
}

/** Xóa theo lô sự kiện traffic cũ hơn cutoff (nguy hiểm — chỉ cron có cờ hoặc admin). */
export async function purgeAffiliateTrafficEventsOlderThan(args: {
  db: PrismaClient;
  cutoff: Date;
  batchSize?: number;
  maxBatches?: number;
}): Promise<{ deleted: number; batches: number }> {
  const batchSize = Math.min(5000, Math.max(100, Math.floor(args.batchSize ?? 2000)));
  const maxBatches = Math.min(50, Math.max(1, Math.floor(args.maxBatches ?? 20)));
  let total = 0;
  let batches = 0;
  for (; batches < maxBatches; batches += 1) {
    const n = await args.db.$executeRaw(Prisma.sql`
      DELETE FROM "AffiliateTrafficEvent"
      WHERE "id" IN (
        SELECT "id" FROM "AffiliateTrafficEvent"
        WHERE "createdAt" < ${args.cutoff}
        LIMIT ${batchSize}
      )
    `);
    const deleted = Number(n);
    total += deleted;
    if (deleted === 0) break;
  }
  return { deleted: total, batches };
}

export async function runAffiliateCronTasks(args: {
  db: PrismaClient;
  hours?: number;
  days?: number;
  staleRealtimeHours?: number;
}): Promise<Record<string, unknown>> {
  const hours = args.hours ?? 52;
  const days = args.days ?? 120;
  const staleH = args.staleRealtimeHours ?? 3;
  const now = Date.now();
  const { clearAllAffiliateAnalyticsCaches } = await import("@/lib/affiliate-ops-cache");

  const hourly = await rebuildAffiliateHourlyAggregates({
    db: args.db,
    from: new Date(now - hours * 3600000),
    to: new Date(now),
  });
  const daily = await rebuildAffiliateDailyAggregates({
    db: args.db,
    from: new Date(now - days * 86400000),
    to: new Date(now),
  });
  const realtimeCleanup = await cleanupStaleAffiliateRealtimeSessions({
    db: args.db,
    olderThan: new Date(now - staleH * 3600000),
  });
  const orphan = await deleteOrphanAffiliateTrafficEvents({ db: args.db });

  let purge: { deleted: number; batches: number } | undefined;
  const retention = Number(process.env.AFFILIATE_RAW_EVENTS_RETENTION_DAYS ?? "0");
  if (Number.isFinite(retention) && retention > 0 && process.env.AFFILIATE_PURGE_RAW_EVENTS === "1") {
    purge = await purgeAffiliateTrafficEventsOlderThan({
      db: args.db,
      cutoff: new Date(now - retention * 86400000),
    });
  }

  await clearAllAffiliateAnalyticsCaches();

  const { releaseDueAffiliateCommissions } = await import("@/lib/affiliate/commission-release");
  const commissionRelease = await releaseDueAffiliateCommissions(args.db);

  return {
    hourly,
    daily,
    realtimeCleanup,
    orphan,
    purge,
    commissionRelease,
    cacheCleared: true,
  };
}
