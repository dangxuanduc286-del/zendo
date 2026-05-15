/**
 * Heartbeat for Redis rolling aggregation (cron / systemd timer).
 * Updates `aff:roll:v2:global:lastAggTickMs` so ops UI can show worker freshness.
 *
 *   REDIS_URL=redis://... npm run affiliate:ops-roll-tick
 */
process.loadEnvFile?.(".env");

void (async function affiliateOpsRollTick(): Promise<void> {
  const { getRedis } = await import("../src/lib/redis");
  const { globalRollTickKey } = await import("../src/lib/affiliate-ops-redis-rolling");

  const r = getRedis();
  if (!r) {
    // eslint-disable-next-line no-console
    console.error(JSON.stringify({ ok: false, error: "REDIS_URL missing" }));
    process.exit(1);
    return;
  }
  const now = Date.now();
  try {
    await r.connect().catch(() => {});
    await r.set(globalRollTickKey(), String(now), "EX", 86_400);
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({ ok: true, event: "affiliate_ops_roll_tick", at: now }));
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }));
    process.exitCode = 1;
  } finally {
    await r.quit().catch(() => {});
  }
})();
