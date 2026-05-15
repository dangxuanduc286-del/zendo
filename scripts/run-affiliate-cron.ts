/**
 * Cron bundle: aggregate hourly/daily, cleanup, optional purge, refresh caches.
 *
 * Usage:
 *   npm run affiliate:cron
 *   AFFILIATE_PURGE_RAW_EVENTS=1 AFFILIATE_RAW_EVENTS_RETENTION_DAYS=90 npm run affiliate:cron
 */
process.loadEnvFile?.(".env");

void (async function runAffiliateCronCli(): Promise<void> {
  const { db } = await import("../src/lib/db");
  const { acquireAffiliateCronLock, releaseAffiliateCronLock } = await import("../src/lib/affiliate-cron-distributed-lock");
  const acquired = await acquireAffiliateCronLock({ ttlSec: 900 });
  if (!acquired) {
    console.log(JSON.stringify({ ok: true, skipped: "cron_lock_held", note: "Another process holds the Redis cron lock." }));
    try {
      await db.$disconnect();
    } catch {
      /* ignore */
    }
    return;
  }
  try {
    const { runAffiliateCronTasks } = await import("../src/lib/affiliate-analytics-jobs");
    const out = await runAffiliateCronTasks({ db });
    console.log(JSON.stringify({ ok: true, ...out }, null, 0));
  } finally {
    await releaseAffiliateCronLock();
    try {
      await db.$disconnect();
    } catch {
      /* ignore */
    }
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
