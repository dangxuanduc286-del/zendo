import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getAffiliateRevenueInsights } from "@/lib/affiliate-revenue-insights";
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

  const rl = await applyAnalyticsRateLimit({ key: `rvi:${auth.customerId}`, windowMs: 15_000, max: 20 });
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

  try {
    const insights = await getAffiliateRevenueInsights({ db, affiliateProfileId: auth.affiliateProfileId, range });
    return NextResponse.json({ ok: true, range, insights });
  } catch {
    return NextResponse.json({ ok: false, message: "Không tải được insights." }, { status: 500 });
  }
}
