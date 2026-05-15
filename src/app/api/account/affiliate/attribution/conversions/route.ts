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
  const rl = await applyAnalyticsRateLimit({ key: `attr:conv:${auth.customerId}`, windowMs: 60_000, max: 30 });
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, message: "Quá nhanh." },
      { status: 429, headers: { "Retry-After": String(rateLimitRetryAfter(rl)) } },
    );
  }

  const { searchParams } = new URL(req.url);
  const take = Math.min(50, Math.max(1, Number(searchParams.get("take") ?? "25") || 25));

  try {
    const rows = await db.affiliateConversionMatch.findMany({
      where: { affiliateProfileId: auth.affiliateProfileId },
      orderBy: { resolvedAt: "desc" },
      take,
      select: {
        id: true,
        orderId: true,
        state: true,
        winningModel: true,
        touchCount: true,
        window24hTouches: true,
        duplicatePaidHits: true,
        selfReferralRisk: true,
        resolvedAt: true,
        replayVersion: true,
      },
    });
    return NextResponse.json(
      { ok: true as const, items: rows },
      { status: 200, headers: { "Cache-Control": "private, no-store, max-age=0" } },
    );
  } catch {
    return NextResponse.json({ ok: false, message: "Không tải được conversions." }, { status: 500 });
  }
}
