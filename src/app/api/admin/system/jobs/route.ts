import { NextResponse } from "next/server";
import { getAffiliateJobQueueJobsAsync, getAffiliateJobQueueStatsAsync } from "@/lib/affiliate-job-queue";
import {
  applySystemOpsRateLimit,
  isAdminSystemAuthErr,
  rateLimitRetryAfter,
  requireAdminSystemSession,
} from "../_shared";

export async function GET(): Promise<NextResponse> {
  const auth = await requireAdminSystemSession();
  if (isAdminSystemAuthErr(auth)) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status });
  }

  const rl = await applySystemOpsRateLimit({ adminId: auth.adminId, suffix: "sys:jobs", windowMs: 10_000, max: 40 });
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, message: "Quá nhanh." },
      { status: 429, headers: { "Retry-After": String(rateLimitRetryAfter(rl)) } },
    );
  }

  const stats = await getAffiliateJobQueueStatsAsync();
  const jobs = (await getAffiliateJobQueueJobsAsync(50)).map((j) => ({
    id: j.id,
    kind: j.kind,
    status: j.status,
    attempts: j.attempts,
    maxAttempts: j.maxAttempts,
    runAt: new Date(j.runAt).toISOString(),
    createdAt: new Date(j.createdAt).toISOString(),
    lastError: j.lastError,
    dedupeKey: j.dedupeKey,
  }));

  return NextResponse.json({ ok: true, stats, jobs }, { status: 200, headers: { "Cache-Control": "private, no-store" } });
}
