import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveAffiliatePayoutDraftCleanupEnv, runAffiliatePayoutDraftCleanup } from "@/lib/affiliate/payout-draft-cleanup";

async function handleCleanup(request: Request): Promise<NextResponse> {
  const secretConfigured = Boolean((process.env.INTERNAL_CRON_SECRET ?? "").trim());
  if (!secretConfigured) {
    return NextResponse.json({ ok: false, message: "Cron secret not configured" }, { status: 503 });
  }

  const secret = (process.env.INTERNAL_CRON_SECRET ?? "").trim();
  const auth = request.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  if (!(process.env.R2_ACCESS_KEY_ID ?? "").trim()) {
    return NextResponse.json({ ok: false, message: "R2 not configured" }, { status: 503 });
  }

  const dryRun =
    new URL(request.url).searchParams.get("dryRun") === "1" ||
    String(process.env.AFFILIATE_PAYOUT_DRAFT_CLEANUP_DRY_RUN ?? "")
      .trim()
      .toLowerCase() === "true";

  const logs: Array<{ msg: string; meta?: Record<string, unknown> }> = [];

  try {
    const result = await runAffiliatePayoutDraftCleanup({
      db,
      dryRun,
      env: resolveAffiliatePayoutDraftCleanupEnv(),
      log: (msg, meta) => {
        logs.push({ msg, meta });
      },
    });

    return NextResponse.json(
      {
        ok: true,
        result: {
          dryRun: result.dryRun,
          inspected: result.inspected,
          eligibleOrphans: result.eligibleOrphans,
          deleted: result.deleted,
          errors: result.errors,
          orphanTtlHours: result.orphanTtlHours,
          rejectedRetentionDays: result.rejectedRetentionDays,
        },
        logCount: logs.length,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    console.error(
      JSON.stringify({
        msg: "affiliate_payout_draft_cleanup_route_error",
        error: e instanceof Error ? e.message : String(e),
      }),
    );
    return NextResponse.json({ ok: false, message: "cleanup_failed", logCount: logs.length }, { status: 500 });
  }
}

/** Cloud Scheduler / Vercel Cron often uses GET */
export async function GET(request: Request): Promise<NextResponse> {
  return handleCleanup(request);
}

/** POST supported for tooling that prefers body-less triggers */
export async function POST(request: Request): Promise<NextResponse> {
  return handleCleanup(request);
}
