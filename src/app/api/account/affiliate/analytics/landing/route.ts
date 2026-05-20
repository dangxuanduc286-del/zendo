import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { AFFILIATE_ANALYTICS_CACHE_TTL_MS, withAffiliateAnalyticsCache } from "@/lib/affiliate-analytics-route-cache";
import { parseAffiliateTrafficFilters } from "@/lib/affiliate-traffic-filters";
import { getAffiliateLandingAnalytics } from "@/lib/affiliate-traffic-analytics";
import {
  applyAnalyticsRateLimit,
  isAffiliateAuthErr,
  rateLimitRetryAfter,
  requireActiveAffiliateProfileId,
} from "../_shared";

const rangeSchema = z.enum(["today", "7d", "30d", "month"]).default("7d");
const takeSchema = z.coerce.number().int().min(1).max(80).default(25);
const pageSchema = z.coerce.number().int().min(1).max(200).default(1);

export async function GET(request: Request): Promise<NextResponse> {
  const auth = await requireActiveAffiliateProfileId();
  if (isAffiliateAuthErr(auth)) return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status });

  const rl = await applyAnalyticsRateLimit({ key: `land:${auth.customerId}`, windowMs: 10_000, max: 25 });
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, message: "Bạn thao tác quá nhanh. Vui lòng thử lại sau." },
      { status: 429, headers: { "Retry-After": String(rateLimitRetryAfter(rl)) } },
    );
  }

  const { searchParams } = new URL(request.url);
  const range = rangeSchema.safeParse(searchParams.get("range") ?? undefined).success
    ? rangeSchema.parse(searchParams.get("range") ?? undefined)
    : "7d";
  const take = takeSchema.safeParse(searchParams.get("take") ?? undefined).success
    ? takeSchema.parse(searchParams.get("take") ?? undefined)
    : 25;
  const page = pageSchema.safeParse(searchParams.get("page") ?? undefined).success
    ? pageSchema.parse(searchParams.get("page") ?? undefined)
    : 1;
  const filters = parseAffiliateTrafficFilters(searchParams);
  const skip = (page - 1) * take;

  try {
    const body = await withAffiliateAnalyticsCache({
      affiliateProfileId: auth.affiliateProfileId,
      segment: "landing",
      parts: {
        range,
        page,
        take,
        source: filters.source,
        device: filters.device,
        pathname: filters.pathnameContains ?? "",
        productId: filters.productId ?? "",
      },
      ttlMs: AFFILIATE_ANALYTICS_CACHE_TTL_MS.topList,
      obsLabel: "landing",
      compute: async () => {
        const rows = await getAffiliateLandingAnalytics({
          db,
          affiliateProfileId: auth.affiliateProfileId,
          range,
          filters,
          take,
          skip,
        });
        return { ok: true as const, range, page, take, filters, rows };
      },
    });
    return NextResponse.json(body, { status: 200, headers: { "Cache-Control": "private, no-store, max-age=0" } });
  } catch {
    return NextResponse.json({ ok: false, message: "Không tải được landing analytics." }, { status: 500 });
  }
}
