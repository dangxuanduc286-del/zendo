import { NextResponse } from "next/server";
import {
  applyAnalyticsRateLimit,
  isAffiliateAuthErr,
  rateLimitRetryAfter,
  requireActiveAffiliateProfileId,
} from "../../analytics/_shared";
import { getAffiliateTrackingOverview } from "@/lib/affiliate-tracking-center";

export async function GET(): Promise<NextResponse> {
  const auth = await requireActiveAffiliateProfileId();
  if (isAffiliateAuthErr(auth)) return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status });

  const rl = await applyAnalyticsRateLimit({ key: `trk:ov:${auth.customerId}`, windowMs: 10_000, max: 24 });
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, message: "Bạn thao tác quá nhanh. Vui lòng thử lại sau." },
      { status: 429, headers: { "Retry-After": String(rateLimitRetryAfter(rl)) } },
    );
  }

  try {
    const data = await getAffiliateTrackingOverview(auth.affiliateProfileId);
    return NextResponse.json({ ok: true as const, data });
  } catch {
    return NextResponse.json({ ok: false, message: "Không tải được tổng quan tracking." }, { status: 500 });
  }
}
