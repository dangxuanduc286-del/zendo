import "server-only";

import type { PrismaClient } from "@prisma/client";
import { getAffiliateAnalyticsHealth } from "@/lib/affiliate-analytics-jobs";
import { getAffiliateJobQueueStatsAsync } from "@/lib/affiliate-job-queue";
import { getAffiliateTrackingSseMetrics } from "@/lib/affiliate-tracking-sse";


export type AffiliateOpsAlertSeverity = "info" | "warning" | "critical";

export type AffiliateOpsAlert = {
  id: string;
  severity: AffiliateOpsAlertSeverity;
  reason: string;
  source: string;
  at: string;
};

const alertRing: AffiliateOpsAlert[] = [];
const MAX_ALERTS = 80;

function pushAlert(a: Omit<AffiliateOpsAlert, "id" | "at"> & { id?: string }): void {
  const id = a.id ?? `al_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const row: AffiliateOpsAlert = { id, severity: a.severity, reason: a.reason, source: a.source, at: new Date().toISOString() };
  const dup = alertRing.find((x) => x.reason === row.reason && Date.now() - new Date(x.at).getTime() < 120_000);
  if (dup) return;
  alertRing.unshift(row);
  if (alertRing.length > MAX_ALERTS) alertRing.length = MAX_ALERTS;
}

export async function pingAffiliateDatabase(args: { db: PrismaClient }): Promise<{ ok: boolean; ms: number }> {
  const t0 = Date.now();
  try {
    await args.db.$queryRaw`SELECT 1`;
    const ms = Date.now() - t0;    return { ok: true, ms };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    pushAlert({ severity: "critical", reason: `DB ping failed: ${msg.slice(0, 200)}`, source: "database" });
    return { ok: false, ms: Date.now() - t0 };
  }
}

export type AffiliateSystemHealthSnapshot = {
  db: { ok: boolean; pingMs: number };
  affiliate: Awaited<ReturnType<typeof getAffiliateAnalyticsHealth>>;
  queue: Awaited<ReturnType<typeof getAffiliateJobQueueStatsAsync>>;
  aggregationLagMs: number | null;
  realtimeHealthy: boolean;
  trackingSse: ReturnType<typeof getAffiliateTrackingSseMetrics>;
  alerts: AffiliateOpsAlert[];
};

export async function getAffiliateSystemHealthSnapshot(args: { db: PrismaClient }): Promise<AffiliateSystemHealthSnapshot> {
  const [dbPing, affiliate, queue] = await Promise.all([
    pingAffiliateDatabase({ db: args.db }),
    getAffiliateAnalyticsHealth({ db: args.db }),
    getAffiliateJobQueueStatsAsync(),
  ]);

  let aggregationLagMs: number | null = null;
  if (affiliate.latestDailyAggregateAt) {
    const t = new Date(affiliate.latestDailyAggregateAt).getTime();
    if (Number.isFinite(t)) aggregationLagMs = Math.max(0, Date.now() - t);
  }

  const realtimeHealthy = affiliate.realtimeSessionsActive5m >= 0 && dbPing.ok;

  if (!dbPing.ok) {
    pushAlert({ severity: "critical", reason: "Không ping được database.", source: "database" });
  }
  if (aggregationLagMs != null && aggregationLagMs > 2 * 3600_000) {
    pushAlert({
      severity: "warning",
      reason: `Aggregate daily cũ hơn ~${Math.round(aggregationLagMs / 3600000)}h — chạy cron.`,
      source: "aggregation",
    });
  }
  if (queue.pending + queue.delayed > 25) {
    pushAlert({
      severity: "warning",
      reason: `Hàng đợi job affiliate lớn (pending+delayed=${queue.pending + queue.delayed}).`,
      source: "queue",
    });
  }
  if (queue.failed > 0) {
    pushAlert({
      severity: "info",
      reason: `Có ${queue.failed} job failed — xem tab Jobs / BullMQ.`,
      source: "queue",
    });
  }
  if (queue.recentSlowJobMs != null && queue.recentSlowJobMs > 30_000) {
    pushAlert({
      severity: "warning",
      reason: `Job chậm gần nhất ~${Math.round(queue.recentSlowJobMs / 1000)}s.`,
      source: "performance",
    });
  }  return {
    db: { ok: dbPing.ok, pingMs: dbPing.ms },
    affiliate,
    queue,
    aggregationLagMs,
    realtimeHealthy,
    trackingSse: getAffiliateTrackingSseMetrics(),
    alerts: [...alertRing],
  };
}
