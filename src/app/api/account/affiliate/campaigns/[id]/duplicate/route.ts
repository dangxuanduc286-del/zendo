import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  applyAnalyticsRateLimit,
  isAffiliateAuthErr,
  rateLimitRetryAfter,
  requireActiveAffiliateProfileId,
} from "../../../analytics/_shared";

function dupName(name: string): string {
  const suffix = " (bản sao)";
  const base = name.trim().slice(0, 180 - suffix.length);
  return `${base}${suffix}`.slice(0, 180);
}

export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const auth = await requireActiveAffiliateProfileId();
  if (isAffiliateAuthErr(auth)) return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status });

  const rl = await applyAnalyticsRateLimit({ key: `cmd:${auth.customerId}`, windowMs: 60_000, max: 15 });
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, message: "Bạn thao tác quá nhanh." },
      { status: 429, headers: { "Retry-After": String(rateLimitRetryAfter(rl)) } },
    );
  }

  const { id: sourceId } = await ctx.params;
  if (!sourceId || sourceId.length > 40) {
    return NextResponse.json({ ok: false, message: "Không tìm thấy." }, { status: 404 });
  }

  const src = await db.affiliateCampaign.findFirst({
    where: { id: sourceId, affiliateProfileId: auth.affiliateProfileId },
    select: { name: true, utmSource: true, defaultSubid: true, note: true },
  });
  if (!src) {
    return NextResponse.json({ ok: false, message: "Không tìm thấy." }, { status: 404 });
  }

  try {
    const row = await db.affiliateCampaign.create({
      data: {
        affiliateProfileId: auth.affiliateProfileId,
        name: dupName(src.name),
        utmSource: src.utmSource,
        defaultSubid: src.defaultSubid,
        note: src.note,
        isActive: true,
        archivedAt: null,
      },
      select: { id: true, name: true, createdAt: true },
    });
    return NextResponse.json({
      ok: true,
      campaign: { id: row.id, name: row.name, createdAt: row.createdAt.toISOString() },
    });
  } catch {
    return NextResponse.json({ ok: false, message: "Không nhân bản được campaign." }, { status: 500 });
  }
}
