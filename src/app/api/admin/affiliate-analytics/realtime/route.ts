import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getAdminSystemRealtime } from "@/lib/admin-affiliate-analytics";
import {
  adminAffiliateRateLimitRetryAfter,
  applyAdminAffiliateAnalyticsRateLimit,
  isAdminAffiliateAuthErr,
  requireAdminAffiliateAnalyticsSession,
} from "../_shared";

const affiliateIdSchema = z.string().min(16).max(40);

export async function GET(request: Request): Promise<NextResponse> {
  const auth = await requireAdminAffiliateAnalyticsSession();
  if (isAdminAffiliateAuthErr(auth)) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status });
  }

  const rl = applyAdminAffiliateAnalyticsRateLimit({
    adminId: auth.adminId,
    suffix: "aff:rt",
    windowMs: 10_000,
    max: 50,
  });
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, message: "Bạn thao tác quá nhanh. Vui lòng thử lại sau." },
      { status: 429, headers: { "Retry-After": String(adminAffiliateRateLimitRetryAfter(rl)) } },
    );
  }

  const { searchParams } = new URL(request.url);
  const rawAff = searchParams.get("affiliateId")?.trim() ?? "";
  const affiliateParsed = affiliateIdSchema.safeParse(rawAff);
  const affiliateProfileId = affiliateParsed.success ? affiliateParsed.data : null;

  try {
    const data = await getAdminSystemRealtime({ db, affiliateProfileId });
    return NextResponse.json(
      {
        ok: true,
        scoped: Boolean(affiliateProfileId),
        realtime: {
          onlineAffiliates: data.onlineAffiliates,
          activeSessions: data.activeSessions,
          clicksLast5m: data.clicksLast5m,
          conversionsLast5m: data.conversionsLast5m,
          revenueLast5m: data.revenueLast5m,
        },
        recentClicks: data.recentClicks,
        recentConversions: data.recentConversions,
      },
      { status: 200, headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json({ ok: false, message: "Không tải được realtime affiliate." }, { status: 500 });
  }
}
