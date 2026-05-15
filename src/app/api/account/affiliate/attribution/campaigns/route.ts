import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  applyAnalyticsRateLimit,
  isAffiliateAuthErr,
  rateLimitRetryAfter,
  requireActiveAffiliateProfileId,
} from "../../analytics/_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const auth = await requireActiveAffiliateProfileId();
  if (isAffiliateAuthErr(auth)) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status });
  }
  const rl = await applyAnalyticsRateLimit({ key: `attr:cmp:${auth.customerId}`, windowMs: 60_000, max: 30 });
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, message: "Quá nhanh." },
      { status: 429, headers: { "Retry-After": String(rateLimitRetryAfter(rl)) } },
    );
  }

  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const takeMatches = 120;

  try {
    const matches = await db.affiliateConversionMatch.findMany({
      where: { affiliateProfileId: auth.affiliateProfileId, resolvedAt: { gte: since30d } },
      select: { id: true },
      take: takeMatches,
      orderBy: { resolvedAt: "desc" },
    });
    const ids = matches.map((m) => m.id);
    if (ids.length === 0) {
      return NextResponse.json({ ok: true as const, items: [] }, { status: 200 });
    }

    const grouped = await db.affiliateCampaignChain.groupBy({
      by: ["campaignKey"],
      where: { conversionMatchId: { in: ids }, campaignKey: { not: null } },
      _count: { _all: true },
    });

    const items = grouped
      .map((g) => ({
        campaignKey: g.campaignKey,
        conversions: g._count._all,
      }))
      .sort((a, b) => b.conversions - a.conversions)
      .slice(0, 40);

    return NextResponse.json(
      { ok: true as const, items },
      { status: 200, headers: { "Cache-Control": "private, no-store, max-age=0" } },
    );
  } catch {
    return NextResponse.json({ ok: false, message: "Không tải được campaign chain." }, { status: 500 });
  }
}
