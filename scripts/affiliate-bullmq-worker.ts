/**
 * Worker BullMQ cho queue affiliate-analytics.
 *
 * Usage:
 *   REDIS_URL=redis://... npm run affiliate:worker
 *   AFFILIATE_BULLMQ=0 sẽ từ chối khởi động (tránh worker treo vô ích).
 */
process.loadEnvFile?.(".env");

void (async function runAffiliateBullMqWorker(): Promise<void> {
  if (!process.env.REDIS_URL?.trim()) {
    console.error(JSON.stringify({ ok: false, error: "REDIS_URL required" }));
    process.exit(1);
    return;
  }
  if (process.env.AFFILIATE_BULLMQ === "0") {
    console.error(JSON.stringify({ ok: false, error: "AFFILIATE_BULLMQ=0 — worker disabled" }));
    process.exit(1);
    return;
  }

  const { db } = await import("../src/lib/db");
  const Redis = (await import("ioredis")).default;
  const { Worker } = await import("bullmq");
  const { executeAffiliateAnalyticsJob } = await import("../src/lib/affiliate-analytics-job-runner");

  const connection = new Redis(process.env.REDIS_URL!, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
  });

  const concurrency = Math.min(8, Math.max(1, Number(process.env.AFFILIATE_WORKER_CONCURRENCY ?? "2")));

  const worker = new Worker(
    "affiliate-analytics",
    async (job) => {
      const data = job.data as { kind?: string; payload?: Record<string, unknown> };
      const kind = (data.kind ?? "CACHE_REFRESH_ALL") as import("../src/lib/affiliate-job-kinds").AffiliateJobKind;
      const payload = data.payload && typeof data.payload === "object" ? data.payload : {};
      await executeAffiliateAnalyticsJob({ db, kind, payload });
    },
    { connection, concurrency },
  );

  worker.on("failed", (job, err) => {
    // eslint-disable-next-line no-console
    console.error(
      JSON.stringify({
        level: "error",
        event: "affiliate_job_failed",
        id: job?.id,
        message: err instanceof Error ? err.message : String(err),
      }),
    );
  });

  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ ok: true, event: "affiliate_worker_started", concurrency }));

  const shutdown = async (): Promise<void> => {
    await worker.close();
    await connection.quit().catch(() => {});
    await db.$disconnect().catch(() => {});
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());
})().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exitCode = 1;
});
