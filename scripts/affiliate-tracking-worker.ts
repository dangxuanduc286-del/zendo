/**
 * BullMQ workers: affiliate-tracking-ingest, attribution, realtime fan-out.
 *
 *   REDIS_URL=redis://... npm run affiliate:tracking-worker
 *   AFFILIATE_BULLMQ=0 hoặc thiếu REDIS_URL → thoát.
 *   AFFILIATE_TRACKING_ASYNC=0 → vẫn có thể chạy worker cho queue cũ nhưng API sẽ sync-only.
 */
process.loadEnvFile?.(".env");

void (async function runTrackingWorkers(): Promise<void> {
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

  const Redis = (await import("ioredis")).default;
  const { Worker } = await import("bullmq");
  const { db } = await import("../src/lib/db");
  const { processAffiliateTrackPersistJob } = await import("../src/lib/affiliate-tracking-ingest-persist");
  const { recordAffiliateOrderAttributionFoundation } = await import("../src/lib/affiliate-attribution-foundation");
  const { AFFILIATE_TRACKING_BUS_CHANNELS, publishAffiliateTrackingBusEvent } = await import(
    "../src/lib/affiliate-event-bus"
  );
  type PersistPayload = import("../src/lib/affiliate-tracking-ingest-types").AffiliateTrackPersistJobV1;
  type AttrPayload = import("../src/lib/affiliate-tracking-ingest-types").AffiliateTrackAttributionJobV1;
  type RtPayload = import("../src/lib/affiliate-tracking-ingest-types").AffiliateTrackRealtimeJobV1;
  const {
    QUEUE_TRACKING_INGEST,
    QUEUE_TRACKING_ATTRIBUTION,
    QUEUE_TRACKING_REALTIME,
  } = await import("../src/lib/affiliate-tracking-bullmq");
  const { logAffiliateTrackingIngest } = await import("../src/lib/affiliate-tracking-center");

  const connection = new Redis(process.env.REDIS_URL!, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
  });

  const concurrency = Math.min(6, Math.max(1, Number(process.env.AFFILIATE_TRACKING_WORKER_CONCURRENCY ?? "2")));

  const ingestWorker = new Worker(
    QUEUE_TRACKING_INGEST,
    async (job) => {
      const data = job.data as { payload?: PersistPayload };
      const payload = data?.payload;
      if (!payload || payload.v !== 1) throw new Error("invalid_ingest_payload");
      await processAffiliateTrackPersistJob({ db, payload });
    },
    { connection, concurrency },
  );

  const attrWorker = new Worker(
    QUEUE_TRACKING_ATTRIBUTION,
    async (job) => {
      const data = job.data as { payload?: AttrPayload };
      const p = data?.payload;
      if (!p || p.v !== 1) throw new Error("invalid_attr_payload");
      await recordAffiliateOrderAttributionFoundation({
        db,
        affiliateProfileId: p.affiliateProfileId,
        orderId: p.orderId,
        sessionId: p.sessionId,
        lastSource: p.lastSource,
      });
      void publishAffiliateTrackingBusEvent(AFFILIATE_TRACKING_BUS_CHANNELS.attributed, {
        affiliateProfileId: p.affiliateProfileId,
        orderId: p.orderId,
      });
    },
    { connection, concurrency: 1 },
  );

  const rtWorker = new Worker(
    QUEUE_TRACKING_REALTIME,
    async (job) => {
      const data = job.data as { payload?: RtPayload };
      const p = data?.payload;
      if (!p || p.v !== 1) return;
      void publishAffiliateTrackingBusEvent(AFFILIATE_TRACKING_BUS_CHANNELS.realtime, {
        affiliateProfileId: p.affiliateProfileId,
        eventType: p.eventType,
        sessionId: p.sessionId,
        pathname: p.pathname,
        trafficEventId: p.trafficEventId ?? null,
      });
    },
    { connection, concurrency: 2 },
  );

  const onFailed =
    (queue: string) =>
    async (job: import("bullmq").Job | undefined, err: Error): Promise<void> => {
      const attempts = job?.attemptsMade ?? 0;
      const max = (job?.opts?.attempts as number) ?? 1;
      if (attempts < max) return;
      const payload = job?.data as { payload?: { affiliateProfileId?: string } } | undefined;
      const affiliateProfileId =
        typeof payload?.payload?.affiliateProfileId === "string" ? payload.payload.affiliateProfileId : null;
      await logAffiliateTrackingIngest({
        affiliateProfileId,
        route: `/worker/${queue}`,
        eventType: job?.name ?? null,
        success: false,
        statusCode: 500,
        message: `dlq:${err.message}`.slice(0, 500),
        latencyMs: null,
        payloadBytes: null,
        eventCount: 1,
      });
    };

  ingestWorker.on("failed", (j, e) => void onFailed("ingest")(j, e));
  attrWorker.on("failed", (j, e) => void onFailed("attribution")(j, e));
  rtWorker.on("failed", (j, e) => void onFailed("realtime")(j, e));

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify({
      ok: true,
      event: "affiliate_tracking_workers_started",
      queues: [QUEUE_TRACKING_INGEST, QUEUE_TRACKING_ATTRIBUTION, QUEUE_TRACKING_REALTIME],
      concurrency,
    }),
  );

  const shutdown = async (): Promise<void> => {
    await Promise.all([ingestWorker.close(), attrWorker.close(), rtWorker.close()]);
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
