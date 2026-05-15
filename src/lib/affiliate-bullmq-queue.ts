import "server-only";

import { Queue, type Job } from "bullmq";
import Redis from "ioredis";
import type { PrismaClient } from "@prisma/client";
import { executeAffiliateAnalyticsJob } from "@/lib/affiliate-analytics-job-runner";
import type { AffiliateJobKind, AffiliateJobRecord } from "@/lib/affiliate-job-kinds";

const QUEUE_NAME = "affiliate-analytics";

let bullConnection: Redis | null | undefined = undefined;
let bullQueue: Queue | null | undefined = undefined;

export function isAffiliateBullMqEnabled(): boolean {
  return Boolean(process.env.REDIS_URL?.trim()) && process.env.AFFILIATE_BULLMQ !== "0";
}

export function getBullMqConnectionForJobs(): Redis | null {
  if (!isAffiliateBullMqEnabled()) {
    bullConnection = null;
    return null;
  }
  if (bullConnection) return bullConnection;
  try {
    bullConnection = new Redis(process.env.REDIS_URL!, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      lazyConnect: true,
    });
    return bullConnection;
  } catch {
    bullConnection = null;
    return null;
  }
}

export function getAffiliateBullQueue(): Queue | null {
  const connection = getBullMqConnectionForJobs();
  if (!connection) return null;
  if (bullQueue) return bullQueue;
  bullQueue = new Queue(QUEUE_NAME, { connection });
  return bullQueue;
}

function sanitizeBullJobId(dedupeKey: string | null | undefined, fallback: string): string | undefined {
  const raw = (dedupeKey?.trim() || fallback).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 120);
  return raw.length ? raw : undefined;
}

function isDuplicateJobError(e: unknown): boolean {
  return e instanceof Error && /already exists|Job id already exists|duplicate/i.test(e.message);
}

export async function enqueueAffiliateBullJob(args: {
  kind: AffiliateJobKind;
  payload?: Record<string, unknown>;
  dedupeKey?: string | null;
  delayMs?: number;
  maxAttempts?: number;
  /** id fallback khi không có dedupeKey */
  fallbackId: string;
}): Promise<{ id: string; deduped: boolean }> {
  const queue = getAffiliateBullQueue();
  if (!queue) throw new Error("bull_unavailable");
  const jobId = sanitizeBullJobId(args.dedupeKey ?? null, args.fallbackId);
  const payload = args.payload && typeof args.payload === "object" ? args.payload : {};
  try {
    const job = await queue.add(
      args.kind,
      { kind: args.kind, payload },
      {
        jobId,
        delay: Math.max(0, Math.min(86_400_000, args.delayMs ?? 0)),
        attempts: args.maxAttempts ?? 4,
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: { count: 400 },
        removeOnFail: { count: 250 },
      },
    );
    return { id: String(job.id ?? job.name), deduped: false };
  } catch (e) {
    if (isDuplicateJobError(e) && jobId) {
      return { id: jobId, deduped: true };
    }
    throw e;
  }
}

export async function getAffiliateBullJobCounts(): Promise<{
  waiting: number;
  active: number;
  delayed: number;
  failed: number;
  completed: number;
  paused: number;
} | null> {
  const queue = getAffiliateBullQueue();
  if (!queue) return null;
  const c = await queue.getJobCounts("waiting", "delayed", "active", "completed", "failed", "paused");
  return {
    waiting: c.waiting ?? 0,
    active: c.active ?? 0,
    delayed: c.delayed ?? 0,
    failed: c.failed ?? 0,
    completed: c.completed ?? 0,
    paused: c.paused ?? 0,
  };
}

async function mapBullJobToRecord(job: Job): Promise<AffiliateJobRecord> {
  const st = await job.getState();
  const status: AffiliateJobRecord["status"] =
    st === "completed"
      ? "completed"
      : st === "failed"
        ? "failed"
        : st === "active"
          ? "running"
          : st === "delayed"
            ? "delayed"
            : "pending";
  const data = (job.data ?? {}) as { kind?: AffiliateJobKind; payload?: Record<string, unknown> };
  return {
    id: String(job.id),
    kind: (data.kind ?? "CACHE_REFRESH_ALL") as AffiliateJobKind,
    status,
    dedupeKey: typeof job.opts.jobId === "string" ? job.opts.jobId : null,
    payload: data.payload ?? {},
    attempts: job.attemptsMade,
    maxAttempts: job.opts.attempts ?? 4,
    runAt: job.timestamp + (typeof job.opts.delay === "number" ? job.opts.delay : 0),
    createdAt: job.timestamp,
    updatedAt: job.finishedOn ?? job.processedOn ?? job.timestamp,
    lastError: job.failedReason ? String(job.failedReason).slice(0, 500) : null,
    lastResult: job.returnvalue ?? null,
  };
}

export async function listAffiliateBullJobs(take: number): Promise<AffiliateJobRecord[]> {
  const queue = getAffiliateBullQueue();
  if (!queue) return [];
  const types = ["waiting", "delayed", "active", "failed", "completed"] as const;
  const out: AffiliateJobRecord[] = [];
  for (const t of types) {
    const jobs = await queue.getJobs(t, 0, Math.max(0, take - out.length - 1), false);
    for (const j of jobs) {
      out.push(await mapBullJobToRecord(j));
      if (out.length >= take) return out;
    }
  }
  return out;
}

/**
 * Xử lý tối đa `maxSteps` job trong process hiện tại (admin drain / cron). Tạo Worker tạm, đóng sau khi drained hoặc timeout.
 */
export async function drainAffiliateBullMqInline(args: { db: PrismaClient; maxSteps: number }): Promise<number> {
  const connection = getBullMqConnectionForJobs();
  const queue = getAffiliateBullQueue();
  if (!connection || !queue) return 0;
  await connection.connect().catch(() => {});
  const c = await queue.getJobCounts("waiting", "delayed", "active");
  if ((c.waiting ?? 0) + (c.delayed ?? 0) + (c.active ?? 0) === 0) return 0;

  let processed = 0;
  const { Worker: W } = await import("bullmq");
  const worker = new W(
    QUEUE_NAME,
    async (job: Job<{ kind: AffiliateJobKind; payload: Record<string, unknown> }>) => {
      await executeAffiliateAnalyticsJob({
        db: args.db,
        kind: job.data.kind,
        payload: job.data.payload ?? {},
      });
      processed += 1;
    },
    { connection, concurrency: 1 },
  );

  try {
    await new Promise<void>((resolve) => {
      const hardStop = setTimeout(() => resolve(), 28_000);
      const tryResolve = () => {
        if (processed >= args.maxSteps) {
          clearTimeout(hardStop);
          resolve();
        }
      };
      worker.on("completed", tryResolve);
      worker.on("failed", tryResolve);
      worker.once("drained", () => {
        setTimeout(() => {
          clearTimeout(hardStop);
          resolve();
        }, 400);
      });
    });
  } finally {
    await worker.close();
  }
  return processed;
}
