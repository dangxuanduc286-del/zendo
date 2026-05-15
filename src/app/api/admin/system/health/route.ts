import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAffiliateSystemHealthSnapshot } from "@/lib/affiliate-monitoring";
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

  const rl = await applySystemOpsRateLimit({ adminId: auth.adminId, suffix: "sys:health", windowMs: 10_000, max: 30 });
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, message: "Quá nhanh." },
      { status: 429, headers: { "Retry-After": String(rateLimitRetryAfter(rl)) } },
    );
  }

  try {
    const snapshot = await getAffiliateSystemHealthSnapshot({ db });
    return NextResponse.json({ ok: true, ...snapshot }, { status: 200, headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ ok: false, message: "Không đọc được health." }, { status: 500 });
  }
}
