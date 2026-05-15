import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { listRecentAffiliateFraudCases } from "@/lib/admin-affiliate-fraud-queries";
import {
  adminAffiliateRateLimitRetryAfter,
  applyAdminAffiliateAnalyticsRateLimit,
  isAdminAffiliateAuthErr,
  requireAdminAffiliateAnalyticsSession,
} from "../../affiliate-analytics/_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const auth = await requireAdminAffiliateAnalyticsSession();
  if (isAdminAffiliateAuthErr(auth)) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status });
  }
  const rl = applyAdminAffiliateAnalyticsRateLimit({
    adminId: auth.adminId,
    suffix: "aff:fraud:cases",
    windowMs: 12_000,
    max: 24,
  });
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, message: "Bạn thao tác quá nhanh." },
      { status: 429, headers: { "Retry-After": String(adminAffiliateRateLimitRetryAfter(rl)) } },
    );
  }
  try {
    const rows = await listRecentAffiliateFraudCases({ db, take: 50 });
    return NextResponse.json(
      {
        ok: true as const,
        cases: rows.map((r) => ({
          ...r,
          openedAt: r.openedAt.toISOString(),
        })),
      },
      { status: 200, headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json({ ok: false, message: "Không tải được danh sách fraud." }, { status: 500 });
  }
}
