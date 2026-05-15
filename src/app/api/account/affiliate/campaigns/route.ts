import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getAffiliateCampaignStatsByCampaign } from "@/lib/affiliate-campaign-analytics";
import {
  applyAnalyticsRateLimit,
  isAffiliateAuthErr,
  rateLimitRetryAfter,
  requireActiveAffiliateProfileId,
} from "../analytics/_shared";

const rangeSchema = z.enum(["today", "7d", "30d", "month"]);

function sanitizeText(s: string, max: number): string {
  return s.trim().replace(/[<>]/g, "").slice(0, max);
}

const createBody = z.object({
  name: z.string().min(1).max(180),
  utmSource: z.string().max(120).optional().nullable(),
  defaultSubid: z.string().max(120).optional().nullable(),
  note: z.string().max(2000).optional().nullable(),
});

export async function GET(request: Request): Promise<NextResponse> {
  const auth = await requireActiveAffiliateProfileId();
  if (isAffiliateAuthErr(auth)) return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status });

  const rl = await applyAnalyticsRateLimit({ key: `cml:${auth.customerId}`, windowMs: 10_000, max: 30 });
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, message: "Bạn thao tác quá nhanh." },
      { status: 429, headers: { "Retry-After": String(rateLimitRetryAfter(rl)) } },
    );
  }

  const { searchParams } = new URL(request.url);
  const range = rangeSchema.safeParse(searchParams.get("range") ?? undefined).success
    ? rangeSchema.parse(searchParams.get("range") ?? undefined)
    : "7d";

  try {
    const [rows, stats] = await Promise.all([
      db.affiliateCampaign.findMany({
        where: { affiliateProfileId: auth.affiliateProfileId },
        orderBy: [{ updatedAt: "desc" }],
        take: 80,
        select: {
          id: true,
          name: true,
          utmSource: true,
          defaultSubid: true,
          note: true,
          isActive: true,
          archivedAt: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { trackingLinks: true } },
        },
      }),
      getAffiliateCampaignStatsByCampaign({
        db,
        affiliateProfileId: auth.affiliateProfileId,
        range,
      }),
    ]);

    const website = await import("@/lib/settings").then((m) => m.getWebsiteSettings());
    const origin = website.canonicalBaseUrl.replace(/\/+$/, "");

    return NextResponse.json({
      ok: true,
      range,
      origin,
      campaigns: rows.map((c) => {
        const s = stats.get(c.id);
        const clicks = s?.clicks ?? 0;
        const orders = s?.orders ?? 0;
        const revenue = s?.revenue ?? 0;
        const commission = s?.commission ?? 0;
        const visitors = s?.visitors ?? 0;
        const conversion = clicks > 0 ? orders / clicks : 0;
        const epc = clicks > 0 ? commission / clicks : 0;
        return {
          id: c.id,
          name: c.name,
          source: c.utmSource,
          subId: c.defaultSubid,
          note: c.note,
          isActive: c.isActive,
          archived: Boolean(c.archivedAt),
          archivedAt: c.archivedAt?.toISOString() ?? null,
          linkCount: c._count.trackingLinks,
          createdAt: c.createdAt.toISOString(),
          updatedAt: c.updatedAt.toISOString(),
          stats: { clicks, visitors, orders, conversion, revenue, commission, epc },
        };
      }),
    });
  } catch {
    return NextResponse.json({ ok: false, message: "Không tải danh sách campaign." }, { status: 500 });
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const auth = await requireActiveAffiliateProfileId();
  if (isAffiliateAuthErr(auth)) return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status });

  const rl = await applyAnalyticsRateLimit({ key: `cmpc:${auth.customerId}`, windowMs: 60_000, max: 20 });
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, message: "Bạn tạo campaign quá nhanh. Vui lòng thử lại sau." },
      { status: 429, headers: { "Retry-After": String(rateLimitRetryAfter(rl)) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Payload không hợp lệ." }, { status: 400 });
  }
  const parsed = createBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "Dữ liệu không hợp lệ." }, { status: 400 });
  }
  const v = parsed.data;
  const name = sanitizeText(v.name, 180);
  if (!name) return NextResponse.json({ ok: false, message: "Tên campaign không hợp lệ." }, { status: 400 });

  try {
    const row = await db.affiliateCampaign.create({
      data: {
        affiliateProfileId: auth.affiliateProfileId,
        name,
        utmSource: v.utmSource?.trim() ? sanitizeText(v.utmSource, 120) : null,
        defaultSubid: v.defaultSubid?.trim() ? sanitizeText(v.defaultSubid, 120) : null,
        note: v.note?.trim() ? sanitizeText(v.note, 2000) : null,
        isActive: true,
        archivedAt: null,
      },
      select: { id: true, name: true, createdAt: true },
    });
    return NextResponse.json({ ok: true, campaign: { id: row.id, name: row.name, createdAt: row.createdAt.toISOString() } });
  } catch {
    return NextResponse.json({ ok: false, message: "Không tạo được campaign." }, { status: 500 });
  }
}
