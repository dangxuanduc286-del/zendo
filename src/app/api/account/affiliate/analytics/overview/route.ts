import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { AFFILIATE_ANALYTICS_CACHE_TTL_MS, withAffiliateAnalyticsCache } from "@/lib/affiliate-analytics-route-cache";
import { getAffiliateAnalyticsOverview } from "@/lib/affiliate-analytics";
import { getAffiliateRealtimeActivityPayload } from "@/lib/affiliate-realtime-activity";
import {
  applyAnalyticsRateLimit,
  isAffiliateAuthErr,
  rateLimitRetryAfter,
  requireActiveAffiliateProfileId,
} from "../_shared";

const rangeSchema = z.enum(["today", "7d", "30d", "month"]).default("7d");

export async function GET(request: Request): Promise<NextResponse> {
  const auth = await requireActiveAffiliateProfileId();
  if (isAffiliateAuthErr(auth)) return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const range = rangeSchema.safeParse(searchParams.get("range") ?? undefined).success
    ? (rangeSchema.parse(searchParams.get("range") ?? undefined) as "today" | "7d" | "30d" | "month")
    : "7d";

  const rl = await applyAnalyticsRateLimit({ key: `ov:${auth.customerId}`, windowMs: 10_000, max: 30 });
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, message: "Bạn thao tác quá nhanh. Vui lòng thử lại sau." },
      { status: 429, headers: { "Retry-After": String(rateLimitRetryAfter(rl)) } },
    );
  }

  try {
    const [overview, activity] = await Promise.all([
      withAffiliateAnalyticsCache({
        affiliateProfileId: auth.affiliateProfileId,
        segment: "overview",
        parts: { range },
        ttlMs: AFFILIATE_ANALYTICS_CACHE_TTL_MS.overview,
        obsLabel: "overview",
        compute: () => getAffiliateAnalyticsOverview({ db, affiliateProfileId: auth.affiliateProfileId, range }),
      }),
      withAffiliateAnalyticsCache({
        affiliateProfileId: auth.affiliateProfileId,
        segment: "realtime-panel",
        parts: { v: 1 },
        ttlMs: AFFILIATE_ANALYTICS_CACHE_TTL_MS.realtime,
        obsLabel: "overview-realtime-panel",
        compute: () => getAffiliateRealtimeActivityPayload({ db, affiliateProfileId: auth.affiliateProfileId }),
      }),
    ]);

    const flatRealtime = {
      onlineVisitors: activity.realtime.onlineVisitors,
      activeSessions: activity.realtime.activeSessions,
      clicksLast5m: activity.realtime.clicksLast5m,
      conversionsLast5m: activity.realtime.conversionsLast5m,
      revenueLast5m: activity.realtime.revenueLast5m,
    };

    return NextResponse.json(
      {
        ok: true,
        overview,
        realtime: flatRealtime,
        realtimeActivity: activity,
        trends: {},
        comparison: {},
      },
      { status: 200, headers: { "Cache-Control": "private, no-store, max-age=0" } },
    );
  } catch {
    return NextResponse.json({ ok: false, message: "Không tải được tổng quan analytics." }, { status: 500 });
  }
}

