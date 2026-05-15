import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  applyAnalyticsRateLimit,
  isAffiliateAuthErr,
  rateLimitRetryAfter,
  requireActiveAffiliateProfileId,
} from "../../analytics/_shared";

function sanitizeText(s: string, max: number): string {
  return s.trim().replace(/[<>]/g, "").slice(0, max);
}

const patchBody = z.object({
  name: z.string().min(1).max(180).optional(),
  utmSource: z.string().max(120).optional().nullable(),
  defaultSubid: z.string().max(120).optional().nullable(),
  note: z.string().max(2000).optional().nullable(),
  isActive: z.boolean().optional(),
  archived: z.boolean().optional(),
});

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const auth = await requireActiveAffiliateProfileId();
  if (isAffiliateAuthErr(auth)) return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status });

  const rl = await applyAnalyticsRateLimit({ key: `cmu:${auth.customerId}`, windowMs: 10_000, max: 40 });
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, message: "Bạn thao tác quá nhanh." },
      { status: 429, headers: { "Retry-After": String(rateLimitRetryAfter(rl)) } },
    );
  }

  const { id } = await ctx.params;
  if (!id || id.length > 40) {
    return NextResponse.json({ ok: false, message: "Không tìm thấy." }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Payload không hợp lệ." }, { status: 400 });
  }
  const parsed = patchBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "Dữ liệu không hợp lệ." }, { status: 400 });
  }

  const existing = await db.affiliateCampaign.findFirst({
    where: { id, affiliateProfileId: auth.affiliateProfileId },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ ok: false, message: "Không tìm thấy." }, { status: 404 });
  }

  const v = parsed.data;
  const data: {
    name?: string;
    utmSource?: string | null;
    defaultSubid?: string | null;
    note?: string | null;
    isActive?: boolean;
    archivedAt?: Date | null;
  } = {};

  if (v.name !== undefined) {
    const n = sanitizeText(v.name, 180);
    if (!n) return NextResponse.json({ ok: false, message: "Tên không hợp lệ." }, { status: 400 });
    data.name = n;
  }
  if (v.utmSource !== undefined) {
    data.utmSource = v.utmSource?.trim() ? sanitizeText(v.utmSource, 120) : null;
  }
  if (v.defaultSubid !== undefined) {
    data.defaultSubid = v.defaultSubid?.trim() ? sanitizeText(v.defaultSubid, 120) : null;
  }
  if (v.note !== undefined) {
    data.note = v.note?.trim() ? sanitizeText(v.note, 2000) : null;
  }
  if (v.archived === true) {
    data.archivedAt = new Date();
    data.isActive = false;
  } else if (v.archived === false) {
    data.archivedAt = null;
  }
  if (v.isActive !== undefined) {
    data.isActive = v.isActive;
    if (v.isActive === false && v.archived === undefined) {
      /* keep archivedAt unless explicitly unarchiving */
    }
    if (v.isActive === true && v.archived === undefined) {
      data.archivedAt = null;
    }
  }

  try {
    const row = await db.affiliateCampaign.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        utmSource: true,
        defaultSubid: true,
        note: true,
        isActive: true,
        archivedAt: true,
        updatedAt: true,
      },
    });
    return NextResponse.json({
      ok: true,
      campaign: {
        id: row.id,
        name: row.name,
        source: row.utmSource,
        subId: row.defaultSubid,
        note: row.note,
        isActive: row.isActive,
        archived: Boolean(row.archivedAt),
        archivedAt: row.archivedAt?.toISOString() ?? null,
        updatedAt: row.updatedAt.toISOString(),
      },
    });
  } catch {
    return NextResponse.json({ ok: false, message: "Không cập nhật được." }, { status: 500 });
  }
}
