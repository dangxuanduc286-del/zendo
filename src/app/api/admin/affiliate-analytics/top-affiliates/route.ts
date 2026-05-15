import { NextResponse } from "next/server";
import { z } from "zod";
import type { AffiliateStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { getAdminTopAffiliates } from "@/lib/admin-affiliate-analytics";
import {
  adminAffiliateRateLimitRetryAfter,
  applyAdminAffiliateAnalyticsRateLimit,
  isAdminAffiliateAuthErr,
  requireAdminAffiliateAnalyticsSession,
} from "../_shared";

const rangeSchema = z.enum(["today", "7d", "30d", "month"]);
const sortSchema = z.enum(["clicks", "revenue", "commission", "orders", "conversion", "epc", "rpm", "refCode"]);
const dirSchema = z.enum(["asc", "desc"]);
const statusSchema = z.enum(["ALL", "ACTIVE", "PAUSED", "LOCKED"]);
const onlineSchema = z.enum(["ALL", "YES", "NO"]);

export async function GET(request: Request): Promise<NextResponse> {
  const auth = await requireAdminAffiliateAnalyticsSession();
  if (isAdminAffiliateAuthErr(auth)) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status });
  }

  const rl = applyAdminAffiliateAnalyticsRateLimit({
    adminId: auth.adminId,
    suffix: "aff:top",
    windowMs: 10_000,
    max: 35,
  });
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, message: "Bạn thao tác quá nhanh. Vui lòng thử lại sau." },
      { status: 429, headers: { "Retry-After": String(adminAffiliateRateLimitRetryAfter(rl)) } },
    );
  }

  const { searchParams } = new URL(request.url);
  const range = rangeSchema.safeParse(searchParams.get("range") ?? undefined).success
    ? rangeSchema.parse(searchParams.get("range") ?? undefined)
    : "7d";
  const pageRaw = Number(searchParams.get("page") ?? "1");
  const page = Number.isFinite(pageRaw) ? Math.max(1, Math.min(500, Math.floor(pageRaw))) : 1;
  const pageSizeRaw = Number(searchParams.get("pageSize") ?? "20");
  const pageSize = Number.isFinite(pageSizeRaw) ? Math.max(1, Math.min(100, Math.floor(pageSizeRaw))) : 20;
  const sort = sortSchema.safeParse(searchParams.get("sort") ?? undefined).success
    ? sortSchema.parse(searchParams.get("sort") ?? undefined)
    : "clicks";
  const dir = dirSchema.safeParse(searchParams.get("dir") ?? undefined).success
    ? dirSchema.parse(searchParams.get("dir") ?? undefined)
    : "desc";
  const status = statusSchema.safeParse(searchParams.get("status") ?? undefined).success
    ? statusSchema.parse(searchParams.get("status") ?? undefined)
    : "ALL";
  const online = onlineSchema.safeParse(searchParams.get("online") ?? undefined).success
    ? onlineSchema.parse(searchParams.get("online") ?? undefined)
    : "ALL";
  const q = (searchParams.get("q") ?? "").trim().slice(0, 80);

  try {
    const { rows, total } = await getAdminTopAffiliates({
      db,
      range,
      page,
      pageSize,
      sort,
      dir,
      q,
      status: status as "ALL" | AffiliateStatus,
      online,
    });
    return NextResponse.json(
      { ok: true, range, page, pageSize, total, rows },
      { status: 200, headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json({ ok: false, message: "Không tải được danh sách CTV." }, { status: 500 });
  }
}
