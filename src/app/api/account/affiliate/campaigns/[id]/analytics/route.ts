import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { AFFILIATE_ANALYTICS_CACHE_TTL_MS, withAffiliateAnalyticsCache } from "@/lib/affiliate-analytics-route-cache";
import {
  assertAffiliateCampaignOwned,
  getAffiliateCampaignConversionFunnel,
  getAffiliateCampaignStatsByCampaign,
  getAffiliateCampaignTimeline,
} from "@/lib/affiliate-campaign-analytics";
import {
  applyAnalyticsRateLimit,
  isAffiliateAuthErr,
  rateLimitRetryAfter,
  requireActiveAffiliateProfileId,
} from "../../../analytics/_shared";

const rangeSchema = z.enum(["today", "7d", "30d", "month"]);

export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const auth = await requireActiveAffiliateProfileId();
  if (isAffiliateAuthErr(auth)) return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status });

  const rl = await applyAnalyticsRateLimit({ key: `cma:${auth.customerId}`, windowMs: 10_000, max: 35 });
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, message: "Bạn thao tác quá nhanh." },
      { status: 429, headers: { "Retry-After": String(rateLimitRetryAfter(rl)) } },
    );
  }

  const { id: campaignId } = await ctx.params;
  if (!campaignId || campaignId.length > 40) {
    return NextResponse.json({ ok: false, message: "Không tìm thấy." }, { status: 404 });
  }

  const owned = await assertAffiliateCampaignOwned({
    db,
    affiliateProfileId: auth.affiliateProfileId,
    campaignId,
  });
  if (!owned) {
    return NextResponse.json({ ok: false, message: "Không tìm thấy." }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const range = rangeSchema.safeParse(searchParams.get("range") ?? undefined).success
    ? rangeSchema.parse(searchParams.get("range") ?? undefined)
    : "7d";

  try {
    const json = await withAffiliateAnalyticsCache({
      affiliateProfileId: auth.affiliateProfileId,
      segment: "campaign-analytics",
      parts: { campaignId, range },
      ttlMs: AFFILIATE_ANALYTICS_CACHE_TTL_MS.campaignAnalytics,
      obsLabel: "campaign-analytics",
      compute: async () => {
        const [statsMap, timeline, funnel, links, website] = await Promise.all([
          getAffiliateCampaignStatsByCampaign({ db, affiliateProfileId: auth.affiliateProfileId, range }),
          getAffiliateCampaignTimeline({ db, affiliateProfileId: auth.affiliateProfileId, campaignId, range }),
          getAffiliateCampaignConversionFunnel({ db, affiliateProfileId: auth.affiliateProfileId, campaignId, range }),
          db.affiliateTrackingLink.findMany({
            where: { affiliateProfileId: auth.affiliateProfileId, campaignId },
            orderBy: { createdAt: "desc" },
            take: 50,
            select: {
              id: true,
              slug: true,
              label: true,
              targetPathname: true,
              utmSource: true,
              subid: true,
              isActive: true,
              createdAt: true,
            },
          }),
          import("@/lib/settings").then((m) => m.getWebsiteSettings()),
        ]);

        const s = statsMap.get(campaignId);
        const clicks = s?.clicks ?? 0;
        const orders = s?.orders ?? 0;
        const revenue = s?.revenue ?? 0;
        const commission = s?.commission ?? 0;
        const visitors = s?.visitors ?? 0;
        const conversion = clicks > 0 ? orders / clicks : 0;
        const epc = clicks > 0 ? commission / clicks : 0;
        const origin = website.canonicalBaseUrl.replace(/\/+$/, "");

        const conversionTrend = timeline.map((b) => ({
          label: b.label,
          conversionRate: b.conversionRate,
          clicks: b.clicks,
          orders: b.orders,
        }));

        return {
          ok: true as const,
          range,
          campaignId,
          name: owned.name,
          origin,
          summary: { clicks, visitors, orders, conversion, revenue, commission, epc },
          timeline,
          conversionTrend,
          funnel: { steps: funnel },
          trackingLinks: links.map((r) => ({
            id: r.id,
            slug: r.slug,
            shortUrl: r.slug ? `${origin}/go/${r.slug}` : null,
            label: r.label,
            targetPathname: r.targetPathname,
            utmSource: r.utmSource,
            subid: r.subid,
            isActive: r.isActive,
            createdAt: r.createdAt.toISOString(),
          })),
        };
      },
    });
    return NextResponse.json(json);
  } catch {
    return NextResponse.json({ ok: false, message: "Không tải analytics campaign." }, { status: 500 });
  }
}
