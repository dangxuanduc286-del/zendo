import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getAdminSystemChart } from "@/lib/admin-affiliate-analytics";
import {
  adminAffiliateRateLimitRetryAfter,
  applyAdminAffiliateAnalyticsRateLimit,
  isAdminAffiliateAuthErr,
  requireAdminAffiliateAnalyticsSession,
} from "../_shared";

const rangeSchema = z.enum(["today", "7d", "30d", "month"]);

function parseRange(raw: string | null): z.infer<typeof rangeSchema> {
  const p = rangeSchema.safeParse(raw ?? undefined);
  return p.success ? p.data : "7d";
}

export async function GET(request: Request): Promise<NextResponse> {
  const auth = await requireAdminAffiliateAnalyticsSession();
  if (isAdminAffiliateAuthErr(auth)) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status });
  }

  const rl = applyAdminAffiliateAnalyticsRateLimit({
    adminId: auth.adminId,
    suffix: "aff:chart",
    windowMs: 10_000,
    max: 40,
  });
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, message: "Bạn thao tác quá nhanh. Vui lòng thử lại sau." },
      { status: 429, headers: { "Retry-After": String(adminAffiliateRateLimitRetryAfter(rl)) } },
    );
  }

  const { searchParams } = new URL(request.url);
  const range = parseRange(searchParams.get("range"));

  try {
    const { labels, totals, buckets } = await getAdminSystemChart({ db, range });
    return NextResponse.json(
      { ok: true, range, labels, totals, buckets },
      { status: 200, headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json({ ok: false, message: "Không tải được biểu đồ affiliate." }, { status: 500 });
  }
}
