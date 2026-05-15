/**
 * Rollup affiliate traffic events into hourly/daily aggregate tables (bounded window).
 *
 * Usage:
 *   tsx scripts/aggregate-affiliate-analytics.ts
 *   AFFILIATE_AGG_HOURS=72 AFFILIATE_AGG_DAYS=120 tsx scripts/aggregate-affiliate-analytics.ts
 */
process.loadEnvFile?.(".env");

void (async function runAffiliateAggregateCli(): Promise<void> {
  const hoursRaw = Number(process.env.AFFILIATE_AGG_HOURS);
  const daysRaw = Number(process.env.AFFILIATE_AGG_DAYS);
  const hours = Number.isFinite(hoursRaw) && hoursRaw > 0 ? Math.floor(hoursRaw) : 48;
  const days = Number.isFinite(daysRaw) && daysRaw > 0 ? Math.floor(daysRaw) : 90;
  const now = Date.now();
  const hourFrom = new Date(now - hours * 60 * 60 * 1000);
  const hourTo = new Date(now);
  const dayFrom = new Date(now - days * 86400000);
  const dayTo = new Date(now);

  const { db } = await import("../src/lib/db");
  const { rebuildAffiliateHourlyAggregates, rebuildAffiliateDailyAggregates } = await import(
    "../src/lib/affiliate-analytics-jobs"
  );

  const h = await rebuildAffiliateHourlyAggregates({ db, from: hourFrom, to: hourTo });
  const d = await rebuildAffiliateDailyAggregates({ db, from: dayFrom, to: dayTo });

  console.log(
    JSON.stringify({
      ok: true,
      hourly: h,
      daily: d,
      window: { hourFrom, hourTo, dayFrom, dayTo },
    }),
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
