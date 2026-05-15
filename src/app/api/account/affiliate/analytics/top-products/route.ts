import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { AFFILIATE_ANALYTICS_CACHE_TTL_MS, withAffiliateAnalyticsCache } from "@/lib/affiliate-analytics-route-cache";
import { parseAffiliateTrafficFilters } from "@/lib/affiliate-traffic-filters";
import { getAffiliateTopProductsEnhanced } from "@/lib/affiliate-traffic-analytics";
import {
  applyAnalyticsRateLimit,
  isAffiliateAuthErr,
  rateLimitRetryAfter,
  requireActiveAffiliateProfileId,
} from "../_shared";

const rangeSchema = z.enum(["today", "7d", "30d", "month"]).default("7d");
const takeSchema = z.coerce.number().int().min(1).max(50).default(12);
const sortSchema = z
  .enum(["clicks", "revenue", "commission", "conversion", "orders", "visitors", "epc"])
  .default("clicks");

export async function GET(request: Request): Promise<NextResponse> {
  const auth = await requireActiveAffiliateProfileId();
  if (isAffiliateAuthErr(auth)) return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const range = rangeSchema.safeParse(searchParams.get("range") ?? undefined).success
    ? (rangeSchema.parse(searchParams.get("range") ?? undefined) as "today" | "7d" | "30d" | "month")
    : "7d";
  const take = takeSchema.safeParse(searchParams.get("take") ?? undefined).success
    ? takeSchema.parse(searchParams.get("take") ?? undefined)
    : 12;
  const sort = sortSchema.safeParse(searchParams.get("sort") ?? undefined).success
    ? sortSchema.parse(searchParams.get("sort") ?? undefined)
    : "clicks";
  const filters = parseAffiliateTrafficFilters(searchParams);

  const rl = await applyAnalyticsRateLimit({ key: `tp:${auth.customerId}`, windowMs: 10_000, max: 25 });
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, message: "Bạn thao tác quá nhanh. Vui lòng thử lại sau." },
      { status: 429, headers: { "Retry-After": String(rateLimitRetryAfter(rl)) } },
    );
  }

  try {
    const body = await withAffiliateAnalyticsCache({
      affiliateProfileId: auth.affiliateProfileId,
      segment: "top-products",
      parts: {
        range,
        take,
        sort,
        source: filters.source,
        device: filters.device,
        pathname: filters.pathnameContains ?? "",
        productId: filters.productId ?? "",
      },
      ttlMs: AFFILIATE_ANALYTICS_CACHE_TTL_MS.topList,
      obsLabel: "top-products",
      compute: async () => {
        const rows = await getAffiliateTopProductsEnhanced({
          db,
          affiliateProfileId: auth.affiliateProfileId,
          range,
          filters,
          take,
          sort,
        });
        return { ok: true as const, range, sort, filters, rows };
      },
    });
    return NextResponse.json(body, { status: 200, headers: { "Cache-Control": "private, no-store, max-age=0" } });
  } catch {
    return NextResponse.json({ ok: false, message: "Không tải được top sản phẩm." }, { status: 500 });
  }
}

