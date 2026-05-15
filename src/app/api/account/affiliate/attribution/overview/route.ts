import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  applyAnalyticsRateLimit,
  isAffiliateAuthErr,
  rateLimitRetryAfter,
  requireActiveAffiliateProfileId,
} from "../../analytics/_shared";
import {
  countConversionsAttributed,
  fetchAttributionStateBreakdown,
} from "@/lib/affiliate-attribution-account-queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const auth = await requireActiveAffiliateProfileId();
  if (isAffiliateAuthErr(auth)) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status });
  }
  const rl = await applyAnalyticsRateLimit({ key: `attr:ov:${auth.customerId}`, windowMs: 60_000, max: 30 });
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, message: "Quá nhanh." },
      { status: 429, headers: { "Retry-After": String(rateLimitRetryAfter(rl)) } },
    );
  }

  const now = Date.now();
  const since1h = new Date(now - 60 * 60 * 1000);
  const since24h = new Date(now - 24 * 60 * 60 * 1000);
  const since7d = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const since30d = new Date(now - 30 * 24 * 60 * 60 * 1000);

  try {
    const [h1, h24, d7, d30, matched24h, totalOrders24h] = await Promise.all([
      fetchAttributionStateBreakdown({ db, affiliateProfileId: auth.affiliateProfileId, since: since1h }),
      fetchAttributionStateBreakdown({ db, affiliateProfileId: auth.affiliateProfileId, since: since24h }),
      fetchAttributionStateBreakdown({ db, affiliateProfileId: auth.affiliateProfileId, since: since7d }),
      fetchAttributionStateBreakdown({ db, affiliateProfileId: auth.affiliateProfileId, since: since30d }),
      countConversionsAttributed({ db, affiliateProfileId: auth.affiliateProfileId, since: since24h }),
      db.affiliateTrafficEvent.count({
        where: {
          affiliateProfileId: auth.affiliateProfileId,
          eventType: "ORDER_PAID",
          createdAt: { gte: since24h },
        },
      }),
    ]);

    const sumStates = (b: Record<string, number | undefined>) =>
      Object.values(b).reduce((a, n) => a + (typeof n === "number" ? n : 0), 0);
    const totalAttr24 = sumStates(h24 as Record<string, number>);
    const unmatchedRate24 =
      totalAttr24 > 0 ? ((h24.UNATTRIBUTED ?? 0) + (h24.PARTIAL_MATCH ?? 0)) / totalAttr24 : 0;

    return NextResponse.json(
      {
        ok: true as const,
        windows: {
          "1h": h1,
          "24h": h24,
          "7d": d7,
          "30d": d30,
        },
        matchedConversions24h: matched24h,
        paidTrafficEvents24h: totalOrders24h,
        unmatchedRate24h: Math.round(unmatchedRate24 * 1000) / 1000,
      },
      { status: 200, headers: { "Cache-Control": "private, no-store, max-age=0" } },
    );
  } catch {
    return NextResponse.json({ ok: false, message: "Không tải được attribution." }, { status: 500 });
  }
}
