import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getAffiliateFraudCaseDetail } from "@/lib/admin-affiliate-fraud-queries";
import {
  adminAffiliateRateLimitRetryAfter,
  applyAdminAffiliateAnalyticsRateLimit,
  isAdminAffiliateAuthErr,
  requireAdminAffiliateAnalyticsSession,
} from "../../../affiliate-analytics/_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const patchSchema = z.object({
  status: z.enum(["UNDER_REVIEW", "RESOLVED", "DISMISSED"]),
  note: z.string().max(500).optional(),
});

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const auth = await requireAdminAffiliateAnalyticsSession();
  if (isAdminAffiliateAuthErr(auth)) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status });
  }
  const { id } = await ctx.params;
  if (!id?.trim()) {
    return NextResponse.json({ ok: false, message: "Thiếu id." }, { status: 400 });
  }
  try {
    const row = await getAffiliateFraudCaseDetail({ db, caseId: id });
    if (!row) return NextResponse.json({ ok: false, message: "Không tìm thấy case." }, { status: 404 });
    return NextResponse.json(
      {
        ok: true as const,
        case: {
          ...row,
          openedAt: row.openedAt.toISOString(),
          updatedAt: row.updatedAt.toISOString(),
          resolvedAt: row.resolvedAt?.toISOString() ?? null,
          signals: row.signals.map((s) => ({ ...s, createdAt: s.createdAt.toISOString() })),
          scores: row.scores.map((s) => ({ ...s, createdAt: s.createdAt.toISOString() })),
          actions: row.actions.map((a) => ({ ...a, createdAt: a.createdAt.toISOString() })),
          affiliateProfile: row.affiliateProfile,
        },
      },
      { status: 200, headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json({ ok: false, message: "Lỗi đọc case." }, { status: 500 });
  }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const auth = await requireAdminAffiliateAnalyticsSession();
  if (isAdminAffiliateAuthErr(auth)) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status });
  }
  const rl = applyAdminAffiliateAnalyticsRateLimit({
    adminId: auth.adminId,
    suffix: "aff:fraud:case-patch",
    windowMs: 20_000,
    max: 30,
  });
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, message: "Bạn thao tác quá nhanh." },
      { status: 429, headers: { "Retry-After": String(adminAffiliateRateLimitRetryAfter(rl)) } },
    );
  }
  const { id } = await ctx.params;
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "JSON không hợp lệ." }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "Payload không hợp lệ." }, { status: 400 });
  }
  const existing = await db.affiliateFraudCase.findUnique({ where: { id }, select: { id: true, affiliateProfileId: true } });
  if (!existing) {
    return NextResponse.json({ ok: false, message: "Không tìm thấy case." }, { status: 404 });
  }
  const now = new Date();
  const isClosed = parsed.data.status === "RESOLVED" || parsed.data.status === "DISMISSED";
  try {
    await db.$transaction([
      db.affiliateFraudCase.update({
        where: { id },
        data: {
          status: parsed.data.status,
          resolvedAt: isClosed ? now : null,
          resolvedByAdminId: isClosed ? auth.adminId : null,
        },
      }),
      db.affiliateFraudAction.create({
        data: {
          affiliateProfileId: existing.affiliateProfileId,
          caseId: id,
          actionType:
            parsed.data.status === "DISMISSED"
              ? "DISMISS"
              : parsed.data.status === "RESOLVED"
                ? "ADMIN_NOTE"
                : "REVIEW_START",
          adminId: auth.adminId,
          payload: { note: parsed.data.note ?? null, toStatus: parsed.data.status } as object,
        },
      }),
    ]);
    return NextResponse.json({ ok: true as const }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false, message: "Không cập nhật được case." }, { status: 500 });
  }
}
