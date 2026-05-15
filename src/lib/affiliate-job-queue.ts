import "server-only";

import type { PrismaClient } from "@prisma/client";
import { executeAffiliateAnalyticsJob } from "@/lib/affiliate-analytics-job-runner";
import {
  drainAffiliateBullMqInline,
  enqueueAffiliateBullJob,
  getAffiliateBullJobCounts,
  isAffiliateBullMqEnabled,
  listAffiliateBullJobs,
} from "@/lib/affiliate-bullmq-queue";
import type { AffiliateJobKind, AffiliateJobRecord } from "@/lib/affiliate-job-kinds";

export type { AffiliateJobKind, AffiliateJobRecord, AffiliateJobStatus } from "@/lib/affiliate-job-kinds";


const jobsById = new Map<string, AffiliateJobRecord>();
const dedupeToJobId = new Map<string, string>();
const recentDurationsMs: number[] = [];
const MAX_RECENT_DURATIONS = 40;
const MAX_JOBS_STORED = 400;

let lock = false;

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `job_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function maxAttemptsDefault(): number {
  const v = Number(process.env.AFFILIATE_JOB_MAX_ATTEMPTS ?? "4");
  return Number.isFinite(v) && v >= 1 ? Math.min(12, Math.floor(v)) : 4;
}

function backoffMs(attempt: number): number {
  const base = 2000;
  const cap = 120_000;
  const exp = Math.min(cap, base * 2 ** Math.max(0, attempt - 1));
  const jitter = Math.floor(Math.random() * 800);
  return exp + jitter;
}

function pruneJobs(): void {
  if (jobsById.size <= MAX_JOBS_STORED) return;
  const sorted = [...jobsById.values()].sort((a, b) => a.createdAt - b.createdAt);
  const drop = sorted.slice(0, Math.max(0, sorted.length - MAX_JOBS_STORED));
  for (const j of drop) {
    jobsById.delete(j.id);
    if (j.dedupeKey) dedupeToJobId.delete(j.dedupeKey);
  }
}

export async function enqueueAffiliateJob(args: {
  kind: AffiliateJobKind;
  payload?: Record<string, unknown>;
  dedupeKey?: string | null;
  delayMs?: number;
  maxAttempts?: number;
}): Promise<{ id: string; deduped: boolean }> {
  if (isAffiliateBullMqEnabled()) {
    try {
      const fallbackId = newId();
      return await enqueueAffiliateBullJob({
        kind: args.kind,
        payload: args.payload,
        dedupeKey: args.dedupeKey,
        delayMs: args.delayMs,
        maxAttempts: args.maxAttempts ?? maxAttemptsDefault(),
        fallbackId,
      });
    } catch {
      /* BullMQ unavailable — fall through to in-memory queue */
    }
  }

  const dk = args.dedupeKey?.trim().slice(0, 160) || null;
  if (dk) {
    const existingId = dedupeToJobId.get(dk);
    if (existingId) {
      const ex = jobsById.get(existingId);
      if (ex && (ex.status === "pending" || ex.status === "delayed" || ex.status === "running")) {
        return { id: existingId, deduped: true };
      }
    }
  }

  const now = Date.now();
  const id = newId();
  const rec: AffiliateJobRecord = {
    id,
    kind: args.kind,
    status: "pending",
    dedupeKey: dk,
    payload: args.payload && typeof args.payload === "object" ? args.payload : {},
    attempts: 0,
    maxAttempts: args.maxAttempts ?? maxAttemptsDefault(),
    runAt: now + Math.max(0, Math.min(86_400_000, args.delayMs ?? 0)),
    createdAt: now,
    updatedAt: now,
    lastError: null,
    lastResult: null,
  };
  jobsById.set(id, rec);
  if (dk) dedupeToJobId.set(dk, id);
  pruneJobs();
  return { id, deduped: false };
}

export function getAffiliateJobQueueStats(): {
  pending: number;
  delayed: number;
  running: number;
  failed: number;
  completed: number;
  queueLagMs: number;
  recentSlowJobMs: number | null;
} {
  let pending = 0;
  let delayed = 0;
  let running = 0;
  let failed = 0;
  let completed = 0;
  const now = Date.now();
  let minLag = 0;
  for (const j of jobsById.values()) {
    if (j.status === "pending") pending += 1;
    else if (j.status === "delayed") delayed += 1;
    else if (j.status === "running") running += 1;
    else if (j.status === "failed") failed += 1;
    else if (j.status === "completed") completed += 1;
    if ((j.status === "pending" || j.status === "delayed") && j.runAt <= now) {
      minLag = Math.max(minLag, now - j.runAt);
    }
  }
  const slow = recentDurationsMs.length ? Math.max(...recentDurationsMs.slice(-10)) : null;
  return { pending, delayed, running, failed, completed, queueLagMs: minLag, recentSlowJobMs: slow };
}

export async function getAffiliateJobQueueStatsAsync(): Promise<ReturnType<typeof getAffiliateJobQueueStats>> {
  if (isAffiliateBullMqEnabled()) {
    try {
      const c = await getAffiliateBullJobCounts();
      if (c) {
        return {
          pending: c.waiting,
          delayed: c.delayed,
          running: c.active,
          failed: c.failed,
          completed: c.completed,
          queueLagMs: c.waiting + c.delayed > 0 ? 1 : 0,
          recentSlowJobMs: null,
        };
      }
    } catch {
      /* memory */
    }
  }
  return getAffiliateJobQueueStats();
}

export function getAffiliateJobQueueJobs(take = 40): AffiliateJobRecord[] {
  return [...jobsById.values()]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, Math.min(100, Math.max(1, take)));
}

export async function getAffiliateJobQueueJobsAsync(take = 40): Promise<AffiliateJobRecord[]> {
  if (isAffiliateBullMqEnabled()) {
    try {
      const rows = await listAffiliateBullJobs(take);
      if (rows.length) return rows;
    } catch {
      /* memory */
    }
  }
  return getAffiliateJobQueueJobs(take);
}

function pickNextJob(): AffiliateJobRecord | null {
  const now = Date.now();
  const candidates = [...jobsById.values()].filter(
    (j) => (j.status === "pending" || j.status === "delayed") && j.runAt <= now,
  );
  if (!candidates.length) return null;
  candidates.sort((a, b) => a.runAt - b.runAt || a.createdAt - b.createdAt);
  return candidates[0] ?? null;
}

export async function processAffiliateJobQueueTick(db: PrismaClient): Promise<number> {
  if (lock) return 0;
  const job = pickNextJob();
  if (!job) return 0;
  lock = true;
  const t0 = Date.now();
  job.status = "running";
  job.updatedAt = Date.now();
  job.attempts += 1;
  try {
    const result = await executeAffiliateAnalyticsJob({ db, kind: job.kind, payload: job.payload });
    job.status = "completed";
    job.lastResult = result;
    job.lastError = null;
    if (job.dedupeKey) dedupeToJobId.delete(job.dedupeKey);
    const dur = Date.now() - t0;
    recentDurationsMs.push(dur);
    if (recentDurationsMs.length > MAX_RECENT_DURATIONS) recentDurationsMs.splice(0, recentDurationsMs.length - MAX_RECENT_DURATIONS);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    job.lastError = msg.slice(0, 500);
    if (job.attempts >= job.maxAttempts) {
      job.status = "failed";
      if (job.dedupeKey) dedupeToJobId.delete(job.dedupeKey);
    } else {
      job.status = "delayed";
      job.runAt = Date.now() + backoffMs(job.attempts);
    }
  } finally {
    job.updatedAt = Date.now();
    lock = false;
  }
  return 1;
}

export async function drainAffiliateJobQueue(db: PrismaClient, maxSteps = 25): Promise<number> {
  if (isAffiliateBullMqEnabled()) {
    const n = await drainAffiliateBullMqInline({ db, maxSteps });
    if (n > 0) return n;
  }
  let n = 0;
  for (let i = 0; i < maxSteps; i += 1) {
    const step = await processAffiliateJobQueueTick(db);
    n += step;
    if (step === 0) break;
  }
  return n;
}
