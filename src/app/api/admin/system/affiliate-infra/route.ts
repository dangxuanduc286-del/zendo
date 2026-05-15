import { NextResponse } from "next/server";
import { collectAffiliateInfraEnvChecks } from "@/lib/affiliate-infra-env";
import { getAffiliateBullJobCounts, isAffiliateBullMqEnabled } from "@/lib/affiliate-bullmq-queue";
import { getAffiliateJobQueueStatsAsync } from "@/lib/affiliate-job-queue";
import { getAffiliateObservabilitySnapshot } from "@/lib/affiliate-observability";
import { readAffiliateOpsAudit } from "@/lib/affiliate-ops-audit";
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

  const rl = await applySystemOpsRateLimit({ adminId: auth.adminId, suffix: "sys:affiliate-infra", windowMs: 10_000, max: 30 });
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, message: "Quá nhanh." },
      { status: 429, headers: { "Retry-After": String(rateLimitRetryAfter(rl)) } },
    );
  }

  try {
    const [observability, bullCounts, queueStats, audit, envChecks] = await Promise.all([
      getAffiliateObservabilitySnapshot(),
      isAffiliateBullMqEnabled() ? getAffiliateBullJobCounts() : Promise.resolve(null),
      getAffiliateJobQueueStatsAsync(),
      readAffiliateOpsAudit(40),
      Promise.resolve(collectAffiliateInfraEnvChecks()),
    ]);

    return NextResponse.json(
      {
        ok: true,
        bullMqEnabled: isAffiliateBullMqEnabled(),
        bullCounts,
        queueStats,
        observability,
        audit,
        envChecks,
      },
      { status: 200, headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json({ ok: false, message: "Không đọc được infra affiliate." }, { status: 500 });
  }
}
