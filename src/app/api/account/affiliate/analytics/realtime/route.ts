import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { AFFILIATE_ANALYTICS_CACHE_TTL_MS, withAffiliateAnalyticsCache } from "@/lib/affiliate-analytics-route-cache";
import { getAffiliateRealtimeActivityPayload } from "@/lib/affiliate-realtime-activity";
import {
  applyAnalyticsRateLimit,
  isAffiliateAuthErr,
  rateLimitRetryAfter,
  requireActiveAffiliateProfileId,
} from "../_shared";

export async function GET(): Promise<NextResponse> {
  const auth = await requireActiveAffiliateProfileId();
  if (isAffiliateAuthErr(auth)) return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status });

  const rl = await applyAnalyticsRateLimit({ key: `rt:${auth.customerId}`, windowMs: 10_000, max: 50 });
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, message: "Bạn thao tác quá nhanh. Vui lòng thử lại sau." },
      { status: 429, headers: { "Retry-After": String(rateLimitRetryAfter(rl)) } },
    );
  }

  try {
    const body = await withAffiliateAnalyticsCache({
      affiliateProfileId: auth.affiliateProfileId,
      segment: "realtime-panel",
      parts: { v: 1 },
      ttlMs: AFFILIATE_ANALYTICS_CACHE_TTL_MS.realtime,
      obsLabel: "realtime",
      compute: () => getAffiliateRealtimeActivityPayload({ db, affiliateProfileId: auth.affiliateProfileId }),
    });
    return NextResponse.json(body, { status: 200, headers: { "Cache-Control": "private, no-store, max-age=0" } });
  } catch {
    return NextResponse.json({ ok: false, message: "Không tải được realtime analytics." }, { status: 500 });
  }
}
