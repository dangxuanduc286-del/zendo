import { NextResponse } from "next/server";
import { z } from "zod";
import {
  applyAnalyticsRateLimit,
  isAffiliateAuthErr,
  rateLimitRetryAfter,
  requireActiveAffiliateProfileId,
} from "../../analytics/_shared";
import { getAffiliateTrackingIngestLogs } from "@/lib/affiliate-tracking-center";

const takeSchema = z.coerce.number().int().min(5).max(50);

export async function GET(request: Request): Promise<NextResponse> {
  const auth = await requireActiveAffiliateProfileId();
  if (isAffiliateAuthErr(auth)) return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status });

  const rl = await applyAnalyticsRateLimit({ key: `trk:lg:${auth.customerId}`, windowMs: 10_000, max: 30 });
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, message: "Bạn thao tác quá nhanh. Vui lòng thử lại sau." },
      { status: 429, headers: { "Retry-After": String(rateLimitRetryAfter(rl)) } },
    );
  }

  const { searchParams } = new URL(request.url);
  const rawTake = searchParams.get("take");
  const take = rawTake == null || rawTake === "" ? 20 : takeSchema.parse(rawTake);
  const cursor = searchParams.get("cursor")?.trim() || undefined;

  try {
    const page = await getAffiliateTrackingIngestLogs(auth.affiliateProfileId, { take, cursor });
    return NextResponse.json({ ok: true as const, data: page });
  } catch {
    return NextResponse.json({ ok: false, message: "Không tải được log ingest." }, { status: 500 });
  }
}
