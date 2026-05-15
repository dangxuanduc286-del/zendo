import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getAffiliateLandingGrowthRows } from "@/lib/affiliate-landing-growth";
import { parseAffiliateTrafficFilters } from "@/lib/affiliate-traffic-filters";
import {
  applyAnalyticsRateLimit,
  isAffiliateAuthErr,
  rateLimitRetryAfter,
  requireActiveAffiliateProfileId,
} from "../_shared";

const rangeSchema = z.enum(["today", "7d", "30d", "month"]);

export async function GET(request: Request): Promise<NextResponse> {
  const auth = await requireActiveAffiliateProfileId();
  if (isAffiliateAuthErr(auth)) return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status });

  const rl = await applyAnalyticsRateLimit({ key: `lgw:${auth.customerId}`, windowMs: 10_000, max: 25 });
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, message: "Bạn thao tác quá nhanh." },
      { status: 429, headers: { "Retry-After": String(rateLimitRetryAfter(rl)) } },
    );
  }

  const { searchParams } = new URL(request.url);
  const range = rangeSchema.safeParse(searchParams.get("range") ?? undefined).success
    ? rangeSchema.parse(searchParams.get("range") ?? undefined)
    : "7d";
  const filters = parseAffiliateTrafficFilters(searchParams);

  try {
    const rows = await getAffiliateLandingGrowthRows({
      db,
      affiliateProfileId: auth.affiliateProfileId,
      range,
      filters,
      take: 40,
    });
    return NextResponse.json({ ok: true, range, rows });
  } catch {
    return NextResponse.json({ ok: false, message: "Không tải landing growth." }, { status: 500 });
  }
}
