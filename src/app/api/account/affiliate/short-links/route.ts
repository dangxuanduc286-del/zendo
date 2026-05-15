import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { isValidAffiliateShortSlug, normalizeAffiliateShortSlug } from "@/lib/affiliate-short-link-slug";
import { getWebsiteSettings } from "@/lib/settings";
import {
  applyAnalyticsRateLimit,
  isAffiliateAuthErr,
  rateLimitRetryAfter,
  requireActiveAffiliateProfileId,
} from "../analytics/_shared";

const createSchema = z.object({
  targetPathname: z.string().min(1).max(512),
  slug: z.string().max(48).optional().nullable(),
  label: z.string().max(180).optional().nullable(),
  utmSource: z.string().max(120).optional().nullable(),
  subid: z.string().max(120).optional().nullable(),
  /** Gắn link vào campaign có sẵn (ưu tiên hơn campaignName). */
  campaignId: z.string().min(16).max(40).optional().nullable(),
  campaignName: z.string().max(180).optional().nullable(),
});

function normalizeTargetPathname(raw: string): string | null {
  const text = raw.trim();
  if (!text) return null;
  const lower = text.toLowerCase();
  if (lower.startsWith("javascript:") || lower.startsWith("data:")) return null;
  if (text.startsWith("/")) return text.slice(0, 512);
  try {
    const parsed = new URL(text);
    if (!["http:", "https:"].includes(parsed.protocol)) return null;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`.slice(0, 512);
  } catch {
    return null;
  }
}

function randomSlug(): string {
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 8);
  return normalizeAffiliateShortSlug(`z-${t}-${r}`).slice(0, 48) || `z-${t}`.slice(0, 48);
}

export async function GET(): Promise<NextResponse> {
  const auth = await requireActiveAffiliateProfileId();
  if (isAffiliateAuthErr(auth)) return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status });

  const rl = await applyAnalyticsRateLimit({ key: `sll:${auth.customerId}`, windowMs: 10_000, max: 40 });
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, message: "Bạn thao tác quá nhanh." },
      { status: 429, headers: { "Retry-After": String(rateLimitRetryAfter(rl)) } },
    );
  }

  const website = await getWebsiteSettings();
  const origin = website.canonicalBaseUrl.replace(/\/+$/, "");

  const rows = await db.affiliateTrackingLink.findMany({
    where: { affiliateProfileId: auth.affiliateProfileId },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      slug: true,
      label: true,
      targetPathname: true,
      utmSource: true,
      subid: true,
      isActive: true,
      createdAt: true,
      campaignId: true,
      campaign: { select: { name: true } },
    },
  });

  return NextResponse.json({
    ok: true,
    origin,
    rows: rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      shortUrl: r.slug ? `${origin}/go/${r.slug}` : null,
      label: r.label,
      targetPathname: r.targetPathname,
      utmSource: r.utmSource,
      subid: r.subid,
      isActive: r.isActive,
      createdAt: r.createdAt.toISOString(),
      campaignId: r.campaignId,
      campaignName: r.campaign?.name ?? null,
    })),
  });
}

export async function POST(request: Request): Promise<NextResponse> {
  const auth = await requireActiveAffiliateProfileId();
  if (isAffiliateAuthErr(auth)) return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status });

  const rl = await applyAnalyticsRateLimit({ key: `slc:${auth.customerId}`, windowMs: 60_000, max: 12 });
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, message: "Bạn tạo link quá nhanh. Vui lòng thử lại sau." },
      { status: 429, headers: { "Retry-After": String(rateLimitRetryAfter(rl)) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Payload không hợp lệ." }, { status: 400 });
  }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "Dữ liệu không hợp lệ." }, { status: 400 });
  }
  const v = parsed.data;
  const targetPathname = normalizeTargetPathname(v.targetPathname);
  if (!targetPathname) {
    return NextResponse.json({ ok: false, message: "Đích đến không hợp lệ (chỉ path nội bộ hoặc URL đầy đủ)." }, { status: 400 });
  }

  let slug = v.slug?.trim() ? normalizeAffiliateShortSlug(v.slug) : randomSlug();
  if (v.slug?.trim()) {
    const chk = isValidAffiliateShortSlug(slug);
    if (chk.ok === false) return NextResponse.json({ ok: false, message: chk.message }, { status: 400 });
  }

  let campaignId: string | null = null;
  const cidRaw = v.campaignId?.trim();
  let defaultSubidFromCampaign: string | null = null;
  if (cidRaw) {
    const owned = await db.affiliateCampaign.findFirst({
      where: { id: cidRaw, affiliateProfileId: auth.affiliateProfileId, archivedAt: null },
      select: { id: true, defaultSubid: true },
    });
    if (!owned) {
      return NextResponse.json({ ok: false, message: "Campaign không hợp lệ hoặc đã lưu trữ." }, { status: 400 });
    }
    campaignId = owned.id;
    defaultSubidFromCampaign = owned.defaultSubid?.trim().slice(0, 120) || null;
  } else {
    const cn = v.campaignName?.trim();
    if (cn) {
      const c = await db.affiliateCampaign.create({
        data: {
          affiliateProfileId: auth.affiliateProfileId,
          name: cn.slice(0, 180),
          utmSource: v.utmSource?.trim().slice(0, 120) || null,
        },
        select: { id: true },
      });
      campaignId = c.id;
    }
  }

  const subidFinal = v.subid?.trim().slice(0, 120) || defaultSubidFromCampaign;

  const website = await getWebsiteSettings();
  const origin = website.canonicalBaseUrl.replace(/\/+$/, "");

  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      const row = await db.affiliateTrackingLink.create({
        data: {
          affiliateProfileId: auth.affiliateProfileId,
          campaignId,
          label: v.label?.trim().slice(0, 180) || null,
          slug,
          targetPathname,
          utmSource: v.utmSource?.trim().slice(0, 120) || null,
          subid: subidFinal,
          isActive: true,
        },
        select: { id: true, slug: true, targetPathname: true },
      });
      return NextResponse.json({
        ok: true,
        link: {
          id: row.id,
          slug: row.slug,
          shortUrl: row.slug ? `${origin}/go/${row.slug}` : null,
          targetPathname: row.targetPathname,
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        slug = randomSlug();
        continue;
      }
      return NextResponse.json({ ok: false, message: "Không tạo được link." }, { status: 500 });
    }
  }
  return NextResponse.json({ ok: false, message: "Không tạo được slug duy nhất. Thử lại sau." }, { status: 409 });
}
