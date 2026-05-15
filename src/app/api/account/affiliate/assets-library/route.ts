import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getThemeSettings, getWebsiteSettings } from "@/lib/settings";
import {
  applyAnalyticsRateLimit,
  isAffiliateAuthErr,
  rateLimitRetryAfter,
  requireActiveAffiliateProfileId,
} from "../analytics/_shared";

export async function GET(): Promise<NextResponse> {
  const auth = await requireActiveAffiliateProfileId();
  if (isAffiliateAuthErr(auth)) return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status });

  const rl = await applyAnalyticsRateLimit({ key: `ast:${auth.customerId}`, windowMs: 15_000, max: 25 });
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, message: "Bạn thao tác quá nhanh." },
      { status: 429, headers: { "Retry-After": String(rateLimitRetryAfter(rl)) } },
    );
  }

  try {
    const [website, theme, products] = await Promise.all([
      getWebsiteSettings(),
      getThemeSettings(),
      db.product.findMany({
        where: { status: "ACTIVE", isFeatured: true },
        orderBy: { updatedAt: "desc" },
        take: 10,
        select: {
          id: true,
          name: true,
          slug: true,
          images: { where: { isPrimary: true }, take: 1, select: { url: true } },
        },
      }),
    ]);

    const items: Array<{
      id: string;
      kind: "banner" | "thumbnail" | "cta" | "video";
      title: string;
      url: string;
      previewUrl: string;
      linkHref: string | null;
    }> = [];
    let n = 0;
    if (theme.mainBannerImage?.trim()) {
      items.push({
        id: "hero-main",
        kind: "banner",
        title: theme.mainBannerTitle?.trim() || "Banner chính",
        url: theme.mainBannerImage.trim(),
        previewUrl: theme.mainBannerImage.trim(),
        linkHref: theme.mainBannerHref?.trim() || null,
      });
    }
    for (const b of theme.homeBanners ?? []) {
      if (!b?.enabled || !b.imageUrl) continue;
      n += 1;
      const id = `banner-${n}`;
      items.push({
        id,
        kind: "banner",
        title: b.title?.trim() || b.altText?.trim() || "Banner trang chủ",
        url: b.imageUrl,
        previewUrl: b.imageUrl,
        linkHref: b.link?.trim() || b.ctaHref?.trim() || null,
      });
    }

    const ab = website.customerAccountSettings.affiliateBanner;
    if (ab?.enabled && ab.imageUrl?.trim()) {
      items.push({
        id: "affiliate-banner",
        kind: "cta",
        title: ab.title?.trim() || "Banner CTV",
        url: ab.imageUrl.trim(),
        previewUrl: ab.imageUrl.trim(),
        linkHref: ab.buttonUrl?.trim() || null,
      });
    }

    for (const p of products) {
      const img = p.images[0]?.url;
      if (!img) continue;
      items.push({
        id: `product-${p.id}`,
        kind: "thumbnail",
        title: p.name,
        url: img,
        previewUrl: img,
        linkHref: `/san-pham/${p.slug}`,
      });
    }

    return NextResponse.json({ ok: true, items });
  } catch {
    return NextResponse.json({ ok: false, message: "Không tải kho tài nguyên." }, { status: 500 });
  }
}
