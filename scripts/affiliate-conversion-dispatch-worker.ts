/**
 * BullMQ worker: server-side TikTok / Meta conversion dispatch (CAPI).
 *
 *   REDIS_URL=redis://... npm run affiliate:conversion-dispatch-worker
 *   AFFILIATE_BULLMQ=0 | AFFILIATE_CAPI_DISPATCH=0 → thoát.
 */
process.loadEnvFile?.(".env");

void (async function runConversionDispatchWorker(): Promise<void> {
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
  if (process.env.AFFILIATE_CAPI_DISPATCH === "0") {
    console.error(JSON.stringify({ ok: false, error: "AFFILIATE_CAPI_DISPATCH=0 — CAPI disabled" }));
    process.exit(1);
    return;
  }

  const Redis = (await import("ioredis")).default;
  const { Worker } = await import("bullmq");
  const { db } = await import("../src/lib/db");
  const { processConversionDispatchJob } = await import("../src/lib/conversion-dispatch/conversion-dispatch-send");
  const { QUEUE_CONVERSION_DISPATCH } = await import("../src/lib/affiliate-conversion-dispatch-bullmq");
  type BullPayload = import("../src/lib/affiliate-conversion-dispatch-bullmq").ConversionDispatchBullJobV1;

  const connection = new Redis(process.env.REDIS_URL!, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
  });

  const concurrency = Math.min(4, Math.max(1, Number(process.env.AFFILIATE_CAPI_WORKER_CONCURRENCY ?? "2")));

  const worker = new Worker(
    QUEUE_CONVERSION_DISPATCH,
    async (job) => {
      const data = job.data as { payload?: BullPayload };
      const payload = data?.payload;
      if (!payload || payload.v !== 1 || !payload.dispatchJobId) throw new Error("invalid_conversion_dispatch_payload");
      const attempts = typeof job.opts.attempts === "number" ? job.opts.attempts : 6;
      await processConversionDispatchJob({
        db,
        dispatchJobId: payload.dispatchJobId,
        bullAttempt: job.attemptsMade,
        bullMaxAttempts: attempts,
      });
    },
    { connection, concurrency },
  );

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify({
      ok: true,
      event: "affiliate_conversion_dispatch_worker_started",
      queue: QUEUE_CONVERSION_DISPATCH,
      concurrency,
    }),
  );

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
