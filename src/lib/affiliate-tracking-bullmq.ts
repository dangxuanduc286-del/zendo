import "server-only";

import { createHash } from "node:crypto";
import { Queue } from "bullmq";
import type { AffiliateTrafficEventType } from "@prisma/client";
import { getBullMqConnectionForJobs, isAffiliateBullMqEnabled } from "@/lib/affiliate-bullmq-queue";
import { affiliateTrafficDedupeWindowMs } from "@/lib/affiliate-event-dedupe";
import type {
  AffiliateTrackAttributionJobV1,
  AffiliateTrackPersistJobV1,
  AffiliateTrackRealtimeJobV1,
} from "@/lib/affiliate-tracking-ingest-types";

export const QUEUE_TRACKING_INGEST = "affiliate-tracking-ingest";
export const QUEUE_TRACKING_ATTRIBUTION = "affiliate-tracking-attribution";
export const QUEUE_TRACKING_REALTIME = "affiliate-tracking-realtime";

/** When Redis + Bull enabled and async not explicitly disabled. */
export function isAffiliateTrackingAsyncIngestEnabled(): boolean {
  return isAffiliateBullMqEnabled() && process.env.AFFILIATE_TRACKING_ASYNC !== "0";
}

const queues: Partial<Record<string, Queue>> = {};

function getQueue(name: string): Queue | null {
  const connection = getBullMqConnectionForJobs();
  if (!connection) return null;
  const existing = queues[name];
  if (existing) return existing;
  const q = new Queue(name, { connection });
  queues[name] = q;
  return q;
}

function sanitizeJobId(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 120) || "job";
}

function isDuplicateJobError(e: unknown): boolean {
  return e instanceof Error && /already exists|Job id already exists|duplicate/i.test(e.message);
}

export function computeTrackingIngestIdempotencyKey(args: {
  affiliateProfileId: string;
  eventType: AffiliateTrafficEventType;
  sessionId: string | null;
  pathname: string | null;
  productId: string | null;
  orderId: string | null;
  nowMs: number;
}): string {
  const dedupeMs = affiliateTrafficDedupeWindowMs(args.eventType);
  const bucket = Math.floor(args.nowMs / Math.max(1, dedupeMs));
  const raw = [
    args.affiliateProfileId,
    args.eventType,
    args.sessionId ?? "",
    args.pathname ?? "",
    args.productId ?? "",
    args.orderId ?? "",
    String(bucket),
  ].join("|");
  return createHash("sha256").update(raw).digest("hex").slice(0, 48);
}

export async function enqueueTrackingIngestJob(args: {
  payload: AffiliateTrackPersistJobV1;
}): Promise<{ jobId: string; deduped: boolean }> {
  const queue = getQueue(QUEUE_TRACKING_INGEST);
  if (!queue) throw new Error("bull_unavailable");
  const jobId = sanitizeJobId(`ing_${args.payload.idempotencyKey}`);
  try {
    await queue.add(
      "TRACK_INGEST",
      { kind: "TRACK_INGEST" as const, payload: args.payload },
      {
        jobId,
        attempts: 5,
        backoff: { type: "exponential", delay: 1500 },
        removeOnComplete: { count: 2000 },
        removeOnFail: { count: 400 },
      },
    );
    return { jobId, deduped: false };
  } catch (e) {
    if (isDuplicateJobError(e)) {
      return { jobId, deduped: true };
    }
    throw e;
  }
}

export async function enqueueTrackingAttributionJob(args: {
  payload: AffiliateTrackAttributionJobV1;
}): Promise<void> {
  const queue = getQueue(QUEUE_TRACKING_ATTRIBUTION);
  if (!queue) return;
  const jobId = sanitizeJobId(`attr_${args.payload.affiliateProfileId}_${args.payload.orderId}`);
  try {
    await queue.add(
      "TRACK_ATTRIBUTION",
      { kind: "TRACK_ATTRIBUTION" as const, payload: args.payload },
      {
        jobId,
        attempts: 4,
        backoff: { type: "fixed", delay: 3000 },
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 200 },
      },
    );
  } catch (e) {
    if (!isDuplicateJobError(e)) throw e;
  }
}

export async function enqueueTrackingRealtimeJob(args: {
  payload: AffiliateTrackRealtimeJobV1;
}): Promise<void> {
  const queue = getQueue(QUEUE_TRACKING_REALTIME);
  if (!queue) return;
  try {
    await queue.add(
      "TRACK_REALTIME",
      { kind: "TRACK_REALTIME" as const, payload: args.payload },
      {
        attempts: 2,
        removeOnComplete: { count: 5000 },
        removeOnFail: { count: 500 },
      },
    );
  } catch {
    /* best-effort fan-out */
  }
}

export async function getTrackingQueueCounts(): Promise<{
  ingest: { waiting: number; active: number; failed: number } | null;
  attribution: { waiting: number; active: number; failed: number } | null;
  realtime: { waiting: number; active: number; failed: number } | null;
}> {
  const out: {
    ingest: { waiting: number; active: number; failed: number } | null;
    attribution: { waiting: number; active: number; failed: number } | null;
    realtime: { waiting: number; active: number; failed: number } | null;
  } = { ingest: null, attribution: null, realtime: null };
  for (const [key, name] of [
    ["ingest", QUEUE_TRACKING_INGEST],
    ["attribution", QUEUE_TRACKING_ATTRIBUTION],
    ["realtime", QUEUE_TRACKING_REALTIME],
  ] as const) {
    const q = getQueue(name);
    if (!q) continue;
    const c = await q.getJobCounts("waiting", "active", "failed");
    out[key] = {
      waiting: c.waiting ?? 0,
      active: c.active ?? 0,
      failed: c.failed ?? 0,
    };
  }
  return out;
}
