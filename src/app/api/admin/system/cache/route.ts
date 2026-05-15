import { NextResponse } from "next/server";
import { getAffiliateAnalyticsCacheFootprint } from "@/lib/affiliate-ops-cache";
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

  const rl = await applySystemOpsRateLimit({ adminId: auth.adminId, suffix: "sys:cache", windowMs: 10_000, max: 40 });
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, message: "Quá nhanh." },
      { status: 429, headers: { "Retry-After": String(rateLimitRetryAfter(rl)) } },
    );
  }

  try {
    const footprint = await getAffiliateAnalyticsCacheFootprint();
    return NextResponse.json({ ok: true, footprint }, { status: 200, headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ ok: false, message: "Không đọc cache footprint." }, { status: 500 });
  }
}
