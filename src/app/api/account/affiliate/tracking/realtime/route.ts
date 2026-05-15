import { NextResponse } from "next/server";
import { z } from "zod";
import {
  applyAnalyticsRateLimit,
  isAffiliateAuthErr,
  rateLimitRetryAfter,
  requireActiveAffiliateProfileId,
} from "../../analytics/_shared";
import { getAffiliateTrackingRealtime } from "@/lib/affiliate-tracking-center";

const takeSchema = z.coerce.number().int().min(5).max(50);

export async function GET(request: Request): Promise<NextResponse> {
  const auth = await requireActiveAffiliateProfileId();
  if (isAffiliateAuthErr(auth)) return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status });

  const rl = await applyAnalyticsRateLimit({ key: `trk:rt:${auth.customerId}`, windowMs: 10_000, max: 40 });
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, message: "Bạn thao tác quá nhanh. Vui lòng thử lại sau." },
      { status: 429, headers: { "Retry-After": String(rateLimitRetryAfter(rl)) } },
    );
  }

  const { searchParams } = new URL(request.url);
  const rawTake = searchParams.get("take");
  const take = rawTake == null || rawTake === "" ? 25 : takeSchema.parse(rawTake);

  try {
    const events = await getAffiliateTrackingRealtime(auth.affiliateProfileId, take);
    return NextResponse.json({ ok: true as const, data: { events, generatedAt: new Date().toISOString() } });
  } catch {
    return NextResponse.json({ ok: false, message: "Không tải được luồng realtime." }, { status: 500 });
  }
}
