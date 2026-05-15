import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { parseAffiliateTrafficFilters } from "@/lib/affiliate-traffic-filters";
import { getAffiliateLandingAnalytics } from "@/lib/affiliate-traffic-analytics";
import {
  adminAffiliateRateLimitRetryAfter,
  applyAdminAffiliateAnalyticsRateLimit,
  isAdminAffiliateAuthErr,
  parseAdminOptionalAffiliateId,
  requireAdminAffiliateAnalyticsSession,
} from "../_shared";

const rangeSchema = z.enum(["today", "7d", "30d", "month"]);
const takeSchema = z.coerce.number().int().min(1).max(80).default(25);
const pageSchema = z.coerce.number().int().min(1).max(200).default(1);

export async function GET(request: Request): Promise<NextResponse> {
  const auth = await requireAdminAffiliateAnalyticsSession();
  if (isAdminAffiliateAuthErr(auth)) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status });
  }

  const rl = applyAdminAffiliateAnalyticsRateLimit({
    adminId: auth.adminId,
    suffix: "aff:landing",
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
  const take = takeSchema.safeParse(searchParams.get("take") ?? undefined).success
    ? takeSchema.parse(searchParams.get("take") ?? undefined)
    : 25;
  const page = pageSchema.safeParse(searchParams.get("page") ?? undefined).success
    ? pageSchema.parse(searchParams.get("page") ?? undefined)
    : 1;
  const affiliateProfileId = parseAdminOptionalAffiliateId(searchParams);
  const filters = parseAffiliateTrafficFilters(searchParams);
  const skip = (page - 1) * take;

  try {
    const rows = await getAffiliateLandingAnalytics({
      db,
      affiliateProfileId,
      range,
      filters,
      take,
      skip,
    });
    return NextResponse.json(
      { ok: true, range, affiliateProfileId, page, take, filters, rows },
      { status: 200, headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json({ ok: false, message: "Không tải được landing." }, { status: 500 });
  }
}
