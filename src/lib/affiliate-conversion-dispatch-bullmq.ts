import "server-only";

import { Queue } from "bullmq";
import { getBullMqConnectionForJobs, isAffiliateBullMqEnabled } from "@/lib/affiliate-bullmq-queue";

export const QUEUE_CONVERSION_DISPATCH = "affiliate-conversion-dispatch";

export type ConversionDispatchBullJobV1 = {
  v: 1;
  dispatchJobId: string;
};

const queues: Partial<Record<string, Queue>> = {};

function getQueue(): Queue | null {
  const connection = getBullMqConnectionForJobs();
  if (!connection) return null;
  const existing = queues[QUEUE_CONVERSION_DISPATCH];
  if (existing) return existing;
  const q = new Queue(QUEUE_CONVERSION_DISPATCH, { connection });
  queues[QUEUE_CONVERSION_DISPATCH] = q;
  return q;
}

function sanitizeJobId(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 120) || "job";
}

function isDuplicateJobError(e: unknown): boolean {
  return e instanceof Error && /already exists|Job id already exists|duplicate/i.test(e.message);
}

/** Redis + Bull on; CAPI dispatch not globally disabled. */
export function isAffiliateConversionDispatchQueueEnabled(): boolean {
  return isAffiliateBullMqEnabled() && process.env.AFFILIATE_CAPI_DISPATCH !== "0";
}

export async function enqueueConversionDispatchBullJob(args: {
  dispatchJobId: string;
  dedupeKey: string;
}): Promise<{ jobId: string; deduped: boolean }> {
  const queue = getQueue();
  if (!queue) throw new Error("bull_unavailable");
  const jobId = sanitizeJobId(`capi_${args.dedupeKey}`);
  const payload: ConversionDispatchBullJobV1 = { v: 1, dispatchJobId: args.dispatchJobId };
  try {
    await queue.add(
      "CONVERSION_DISPATCH",
      { kind: "CONVERSION_DISPATCH" as const, payload },
      {
        jobId,
        attempts: 6,
        backoff: { type: "exponential", delay: 2500 },
        removeOnComplete: { count: 3000 },
        removeOnFail: { count: 600 },
      },
    );
    return { jobId, deduped: false };
  } catch (e) {
    if (isDuplicateJobError(e)) return { jobId, deduped: true };
    throw e;
  }
}

export async function getConversionDispatchQueueCounts(): Promise<{
  waiting: number;
  active: number;
  failed: number;
} | null> {
  const q = getQueue();
  if (!q) return null;
  const c = await q.getJobCounts("waiting", "active", "failed");
  return {
    waiting: c.waiting ?? 0,
    active: c.active ?? 0,
    failed: c.failed ?? 0,
  };
}
