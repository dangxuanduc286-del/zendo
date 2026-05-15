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

export async function GET(req: Request): Promise<NextResponse> {
  const auth = await requireActiveAffiliateProfileId();
  if (isAffiliateAuthErr(auth)) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status });
  }
  const rl = await applyAnalyticsRateLimit({ key: `attr:touches:${auth.customerId}`, windowMs: 60_000, max: 40 });
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, message: "Quá nhanh." },
      { status: 429, headers: { "Retry-After": String(rateLimitRetryAfter(rl)) } },
    );
  }

  const { searchParams } = new URL(req.url);
  const matchId = searchParams.get("matchId")?.trim();
  if (!matchId) {
    return NextResponse.json({ ok: false, message: "Thiếu matchId." }, { status: 400 });
  }

  try {
    const own = await db.affiliateConversionMatch.findFirst({
      where: { id: matchId, affiliateProfileId: auth.affiliateProfileId },
      select: { id: true },
    });
    if (!own) {
      return NextResponse.json({ ok: false, message: "Không tìm thấy." }, { status: 404 });
    }

    const touches = await db.affiliateAttributionTouch.findMany({
      where: { conversionMatchId: matchId },
      orderBy: { sequence: "asc" },
      select: {
        sequence: true,
        touchedAt: true,
        eventType: true,
        pathname: true,
        utmSource: true,
        utmMedium: true,
        utmCampaign: true,
        subid: true,
        device: true,
        browser: true,
      },
    });
    return NextResponse.json(
      { ok: true as const, matchId, touches },
      { status: 200, headers: { "Cache-Control": "private, no-store, max-age=0" } },
    );
  } catch {
    return NextResponse.json({ ok: false, message: "Không tải được touches." }, { status: 500 });
  }
}
