import { after } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  applySystemOpsRateLimit,
  canAdminMutateSystemOperations,
  isAdminSystemAuthErr,
  rateLimitRetryAfter,
  requireAdminSystemSession,
} from "../_shared";

const actionBody = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("clear_caches"),
    confirm: z.literal("CLEAR_ANALYTICS_CACHES"),
  }),
  z.object({
    action: z.literal("rebuild_aggregates"),
    confirm: z.literal("REBUILD_AGGREGATES"),
    hours: z.number().int().min(1).max(168).optional(),
    days: z.number().int().min(1).max(400).optional(),
  }),
  z.object({
    action: z.literal("cleanup_realtime"),
    confirm: z.literal("CLEANUP_REALTIME"),
    staleHours: z.number().int().min(1).max(72).optional(),
  }),
  z.object({
    action: z.literal("cleanup_orphan_events"),
    confirm: z.literal("CLEANUP_ORPHAN_EVENTS"),
  }),
  z.object({
    action: z.literal("drain_job_queue"),
    confirm: z.literal("DRAIN_JOB_QUEUE"),
    maxSteps: z.number().int().min(1).max(100).optional(),
  }),
  z.object({
    action: z.literal("purge_raw_events"),
    confirm: z.literal("PURGE_RAW_EVENTS"),
    retentionDays: z.number().int().min(30).max(730),
  }),
]);

export async function POST(request: Request): Promise<NextResponse> {
  const auth = await requireAdminSystemSession();
  if (isAdminSystemAuthErr(auth)) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status });
  }
  if (!canAdminMutateSystemOperations(auth.role)) {
    return NextResponse.json({ ok: false, message: "Chỉ quản trị viên mới thực hiện được thao tác này." }, { status: 403 });
  }

  const rl = await applySystemOpsRateLimit({ adminId: auth.adminId, suffix: "sys:actions", windowMs: 60_000, max: 12 });
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, message: "Quá nhiều thao tác vận hành. Thử lại sau." },
      { status: 429, headers: { "Retry-After": String(rateLimitRetryAfter(rl)) } },
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Body không hợp lệ." }, { status: 400 });
  }

  const parsed = actionBody.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "Payload không hợp lệ." }, { status: 400 });
  }

  const body = parsed.data;

  const { appendAffiliateOpsAudit } = await import("@/lib/affiliate-ops-audit");
  await appendAffiliateOpsAudit({
    adminId: auth.adminId,
    action: `system:${body.action}`,
    meta: { role: auth.role, action: body.action },
  });

  after(async () => {
    const { db } = await import("@/lib/db");
    const { enqueueAffiliateJob, drainAffiliateJobQueue } = await import("@/lib/affiliate-job-queue");
    const { clearAllAffiliateAnalyticsCaches } = await import("@/lib/affiliate-ops-cache");

    try {
      if (body.action === "clear_caches") {
        await clearAllAffiliateAnalyticsCaches();
        return;
      }
      if (body.action === "rebuild_aggregates") {
        const hours = body.hours ?? 52;
        const days = body.days ?? 120;
        await enqueueAffiliateJob({
          kind: "AGGREGATE_HOURLY_WINDOW",
          dedupeKey: `rebuild-hourly:${hours}`,
          payload: { hours },
        });
        await enqueueAffiliateJob({
          kind: "AGGREGATE_DAILY_WINDOW",
          dedupeKey: `rebuild-daily:${days}`,
          payload: { days },
        });
        await drainAffiliateJobQueue(db, 40);
        return;
      }
      if (body.action === "cleanup_realtime") {
        await enqueueAffiliateJob({
          kind: "CLEANUP_REALTIME",
          dedupeKey: `cleanup-rt:${body.staleHours ?? 3}`,
          payload: { staleHours: body.staleHours ?? 3 },
        });
        await drainAffiliateJobQueue(db, 10);
        return;
      }
      if (body.action === "cleanup_orphan_events") {
        await enqueueAffiliateJob({ kind: "CLEANUP_ORPHAN_EVENTS", dedupeKey: "cleanup-orphan-once" });
        await drainAffiliateJobQueue(db, 5);
        return;
      }
      if (body.action === "drain_job_queue") {
        await drainAffiliateJobQueue(db, body.maxSteps ?? 40);
        return;
      }
      if (body.action === "purge_raw_events") {
        await enqueueAffiliateJob({
          kind: "PURGE_OLD_RAW_EVENTS",
          dedupeKey: `purge:${body.retentionDays}`,
          payload: { retentionDays: body.retentionDays },
        });
        await drainAffiliateJobQueue(db, 25);
      }
    } catch {
      /* ignore */
    }
  });

  return NextResponse.json({ ok: true, accepted: true, action: body.action }, { status: 202 });
}
