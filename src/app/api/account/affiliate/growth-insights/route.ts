import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { AFFILIATE_ANALYTICS_CACHE_TTL_MS, withAffiliateAnalyticsCache } from "@/lib/affiliate-analytics-route-cache";
import { getAffiliateGrowthInsightsPack } from "@/lib/affiliate-growth-insights";
import {
  applyAnalyticsRateLimit,
  isAffiliateAuthErr,
  rateLimitRetryAfter,
  requireActiveAffiliateProfileId,
} from "../analytics/_shared";

const rangeSchema = z.enum(["today", "7d", "30d", "month"]);

export async function GET(request: Request): Promise<NextResponse> {
  const auth = await requireActiveAffiliateProfileId();
  if (isAffiliateAuthErr(auth)) return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status });

  const rl = await applyAnalyticsRateLimit({ key: `gwi:${auth.customerId}`, windowMs: 15_000, max: 20 });
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
    const body = await withAffiliateAnalyticsCache({
      affiliateProfileId: auth.affiliateProfileId,
      segment: "growth-insights",
      parts: { range },
      ttlMs: AFFILIATE_ANALYTICS_CACHE_TTL_MS.growthInsights,
      obsLabel: "growth-insights",
      compute: async () => {
        const insights = await getAffiliateGrowthInsightsPack({
          db,
          affiliateProfileId: auth.affiliateProfileId,
          range,
        });
        return { ok: true as const, range, insights };
      },
    });
    return NextResponse.json(body, { status: 200, headers: { "Cache-Control": "private, no-store, max-age=0" } });
  } catch {
    return NextResponse.json({ ok: false, message: "Không tải growth insights." }, { status: 500 });
  }
}
