/**
 * Cleanup stale affiliate realtime sessions + orphan traffic events.
 *
 * Usage:
 *   tsx scripts/cleanup-affiliate-analytics.ts
 *   AFFILIATE_RT_STALE_HOURS=4 AFFILIATE_CLEANUP_DRY_RUN=1 tsx scripts/cleanup-affiliate-analytics.ts
 */
process.loadEnvFile?.(".env");

void (async function runAffiliateAnalyticsCleanupCli(): Promise<void> {
  const staleRaw = Number(process.env.AFFILIATE_RT_STALE_HOURS);
  const staleHours = Number.isFinite(staleRaw) && staleRaw > 0 ? Math.floor(staleRaw) : 3;
  const dry =
    String(process.env.AFFILIATE_CLEANUP_DRY_RUN ?? "")
      .trim()
      .toLowerCase() === "1";

  const olderThan = new Date(Date.now() - staleHours * 60 * 60 * 1000);

  const { db } = await import("../src/lib/db");
  const { cleanupStaleAffiliateRealtimeSessions, deleteOrphanAffiliateTrafficEvents } = await import(
    "../src/lib/affiliate-analytics-jobs"
  );

  if (dry) {
    const cnt = await db.affiliateRealtimeSession.count({ where: { lastSeenAt: { lt: olderThan } } });
    console.log(JSON.stringify({ ok: true, dryRun: true, wouldDeleteRealtime: cnt, olderThan }));
    return;
  }

  const rt = await cleanupStaleAffiliateRealtimeSessions({ db, olderThan });
  const orp = await deleteOrphanAffiliateTrafficEvents({ db });

  console.log(JSON.stringify({ ok: true, realtimeDeleted: rt.deleted, orphanEventsDeleted: orp.deleted }));
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
