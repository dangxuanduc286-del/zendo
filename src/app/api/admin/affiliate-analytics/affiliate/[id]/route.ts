import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getAdminAffiliateDetailBundle } from "@/lib/admin-affiliate-analytics";
import {
  adminAffiliateRateLimitRetryAfter,
  applyAdminAffiliateAnalyticsRateLimit,
  isAdminAffiliateAuthErr,
  requireAdminAffiliateAnalyticsSession,
} from "../../_shared";

const rangeSchema = z.enum(["today", "7d", "30d", "month"]);
const idSchema = z.string().min(16).max(40);

export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const auth = await requireAdminAffiliateAnalyticsSession();
  if (isAdminAffiliateAuthErr(auth)) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status });
  }

  const rl = applyAdminAffiliateAnalyticsRateLimit({
    adminId: auth.adminId,
    suffix: "aff:one",
    windowMs: 10_000,
    max: 40,
  });
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, message: "Bạn thao tác quá nhanh. Vui lòng thử lại sau." },
      { status: 429, headers: { "Retry-After": String(adminAffiliateRateLimitRetryAfter(rl)) } },
    );
  }

  const { id: rawId } = await ctx.params;
  const idParsed = idSchema.safeParse(rawId?.trim());
  if (!idParsed.success) {
    return NextResponse.json({ ok: false, message: "ID affiliate không hợp lệ." }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const range = rangeSchema.safeParse(searchParams.get("range") ?? undefined).success
    ? rangeSchema.parse(searchParams.get("range") ?? undefined)
    : "7d";

  try {
    const bundle = await getAdminAffiliateDetailBundle({
      db,
      affiliateProfileId: idParsed.data,
      range,
    });
    if (!bundle.ok) {
      return NextResponse.json({ ok: false, message: "Không tìm thấy affiliate." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, range, ...bundle }, { status: 200, headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ ok: false, message: "Không tải được chi tiết affiliate." }, { status: 500 });
  }
}
