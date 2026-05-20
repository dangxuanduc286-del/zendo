import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { AFFILIATE_ANALYTICS_CACHE_TTL_MS, withAffiliateAnalyticsCache } from "@/lib/affiliate-analytics-route-cache";
import { getAffiliateConversionFunnel } from "@/lib/affiliate-analytics";
import { assertAffiliateCampaignOwned, getAffiliateCampaignConversionFunnel } from "@/lib/affiliate-campaign-analytics";
import {
  applyAnalyticsRateLimit,
  isAffiliateAuthErr,
  rateLimitRetryAfter,
  requireActiveAffiliateProfileId,
} from "../_shared";

const rangeSchema = z.enum(["today", "7d", "30d", "month"]).default("7d");
const cuidSchema = z.string().min(16).max(40);

export async function GET(request: Request): Promise<NextResponse> {
  const auth = await requireActiveAffiliateProfileId();
  if (isAffiliateAuthErr(auth)) return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const range = rangeSchema.safeParse(searchParams.get("range") ?? undefined).success
    ? (rangeSchema.parse(searchParams.get("range") ?? undefined) as "today" | "7d" | "30d" | "month")
    : "7d";
  const campaignIdRaw = searchParams.get("campaignId")?.trim() ?? "";
  const campaignId = cuidSchema.safeParse(campaignIdRaw).success ? cuidSchema.parse(campaignIdRaw) : null;

  const rl = await applyAnalyticsRateLimit({ key: `fn:${auth.customerId}`, windowMs: 10_000, max: 25 });
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, message: "Bạn thao tác quá nhanh. Vui lòng thử lại sau." },
      { status: 429, headers: { "Retry-After": String(rateLimitRetryAfter(rl)) } },
    );
  }

  try {
    if (campaignId) {
      const body = await withAffiliateAnalyticsCache({
        affiliateProfileId: auth.affiliateProfileId,
        segment: "funnel",
        parts: { range, scope: "campaign", campaignId },
        ttlMs: AFFILIATE_ANALYTICS_CACHE_TTL_MS.topList,
        obsLabel: "funnel-campaign",
        compute: async () => {
          const owned = await assertAffiliateCampaignOwned({
            db,
            affiliateProfileId: auth.affiliateProfileId,
            campaignId,
          });
          if (!owned) {
            return { ok: false as const, status: 404 as const, message: "Không tìm thấy." };
          }
          const rows = await getAffiliateCampaignConversionFunnel({
            db,
            affiliateProfileId: auth.affiliateProfileId,
            campaignId,
            range,
          });
          return { ok: true as const, range, scope: "campaign" as const, campaignId, steps: rows };
        },
      });
      if (!body.ok && body.status === 404) {
        return NextResponse.json({ ok: false, message: body.message }, { status: 404 });
      }
      return NextResponse.json(body, { status: 200, headers: { "Cache-Control": "private, no-store, max-age=0" } });
    }
    const body = await withAffiliateAnalyticsCache({
      affiliateProfileId: auth.affiliateProfileId,
      segment: "funnel",
      parts: { range, scope: "profile" },
      ttlMs: AFFILIATE_ANALYTICS_CACHE_TTL_MS.topList,
      obsLabel: "funnel-profile",
      compute: async () => {
        const rows = await getAffiliateConversionFunnel({ db, affiliateProfileId: auth.affiliateProfileId, range });
        return { ok: true as const, range, scope: "profile" as const, steps: rows };
      },
    });
    return NextResponse.json(body, { status: 200, headers: { "Cache-Control": "private, no-store, max-age=0" } });
  } catch {
    return NextResponse.json({ ok: false, message: "Không tải được funnel analytics." }, { status: 500 });
  }
}

