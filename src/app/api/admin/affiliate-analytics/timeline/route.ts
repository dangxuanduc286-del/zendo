import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { parseAffiliateTrafficFilters } from "@/lib/affiliate-traffic-filters";
import { getAffiliateConversionTimeline } from "@/lib/affiliate-traffic-analytics";
import {
  adminAffiliateRateLimitRetryAfter,
  applyAdminAffiliateAnalyticsRateLimit,
  isAdminAffiliateAuthErr,
  parseAdminOptionalAffiliateId,
  requireAdminAffiliateAnalyticsSession,
} from "../_shared";

const rangeSchema = z.enum(["today", "7d", "30d", "month"]);

export async function GET(request: Request): Promise<NextResponse> {
  const auth = await requireAdminAffiliateAnalyticsSession();
  if (isAdminAffiliateAuthErr(auth)) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status });
  }

  const rl = applyAdminAffiliateAnalyticsRateLimit({
    adminId: auth.adminId,
    suffix: "aff:timeline",
    windowMs: 10_000,
    max: 30,
  });
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, message: "Bạn thao tác quá nhanh. Vui lòng thử lại sau." },
      { status: 429, headers: { "Retry-After": String(adminAffiliateRateLimitRetryAfter(rl)) } },
    );
  }

  const { searchParams } = new URL(request.url);
  const range = rangeSchema.safeParse(searchParams.get("range") ?? undefined).success
    ? rangeSchema.parse(searchParams.get("range") ?? undefined)
    : "7d";
  const affiliateProfileId = parseAdminOptionalAffiliateId(searchParams);
  const filters = parseAffiliateTrafficFilters(searchParams);

  try {
    const buckets = await getAffiliateConversionTimeline({ db, affiliateProfileId, range, filters });
    return NextResponse.json(
      { ok: true, range, affiliateProfileId, filters, buckets },
      { status: 200, headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json({ ok: false, message: "Không tải được timeline." }, { status: 500 });
  }
}
