import { NextRequest, NextResponse } from "next/server";
import { ZENDO_AF_REF_COOKIE, referralCookieMaxAgeSeconds } from "@/lib/affiliate-referral-cookie";
import { normalizeAffiliateShortSlug } from "@/lib/affiliate-short-link-slug";
import { refreshAffiliateTrackingSessionCookies } from "@/lib/affiliate-tracking";
import { getWebsiteSettings } from "@/lib/settings";

const CLICK_DEBOUNCE_MS = 20 * 60 * 1000;

export async function GET(req: NextRequest, ctx: { params: Promise<{ slug: string }> }): Promise<NextResponse> {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.redirect(new URL("/", req.url), 307);
    }
    const { slug: rawSlug } = await ctx.params;
    const slug = normalizeAffiliateShortSlug(rawSlug || "");
    if (!slug) {
      return NextResponse.redirect(new URL("/", req.url), 307);
    }

    const { db } = await import("@/lib/db");
    const website = await getWebsiteSettings();
    if (!website.affiliateEnabled) {
      return NextResponse.redirect(new URL("/", req.url), 307);
    }

    const link = await db.affiliateTrackingLink.findFirst({
      where: { slug, isActive: true },
      select: {
        id: true,
        targetPathname: true,
        utmSource: true,
        subid: true,
        affiliateProfile: { select: { id: true, refCode: true, status: true } },
      },
    });

    if (!link || link.affiliateProfile.status !== "ACTIVE" || !link.affiliateProfile.refCode) {
      return NextResponse.redirect(new URL("/", req.url), 307);
    }

    const ref = link.affiliateProfile.refCode.trim();
    const target = link.targetPathname.trim();
    const pathPart = target.split("?")[0]?.trim() || "/";
    const existingSearch = target.includes("?") ? target.slice(target.indexOf("?") + 1) : "";
    const dest = new URL(pathPart.startsWith("/") ? pathPart : `/${pathPart}`, req.url);
    const sp = new URLSearchParams(existingSearch);
    sp.set("ref", ref);
    if (link.utmSource?.trim()) sp.set("utm_source", link.utmSource.trim().slice(0, 120));
    if (link.subid?.trim()) sp.set("subid", link.subid.trim().slice(0, 120));
    sp.set("tl", link.id);
    dest.search = sp.toString();

    const res = NextResponse.redirect(dest, 307);
    const maxAge = referralCookieMaxAgeSeconds(website.cookieDuration);
    const isProd = process.env.NODE_ENV === "production";
    res.cookies.set(ZENDO_AF_REF_COOKIE, ref, {
      path: "/",
      maxAge,
      httpOnly: true,
      sameSite: "lax",
      secure: Boolean(isProd),
    });

    const visitorKey = req.nextUrl.searchParams.get("vk")?.trim().slice(0, 128) || null;
    const sessionKey = req.nextUrl.searchParams.get("sk")?.trim().slice(0, 128) || null;
    const landingPage = `/go/${slug}`.slice(0, 2000);

    const since = new Date(Date.now() - CLICK_DEBOUNCE_MS);
    const recent = visitorKey
      ? await db.affiliateClick.findFirst({
          where: {
            affiliateProfileId: link.affiliateProfile.id,
            visitorKey,
            createdAt: { gte: since },
          },
          select: { id: true },
        })
      : null;

    if (!recent) {
      await db.affiliateClick.create({
        data: {
          affiliateProfileId: link.affiliateProfile.id,
          refCode: ref,
          landingPage,
          visitorKey,
          sessionKey,
          referrer: req.headers.get("referer")?.slice(0, 2000) || null,
          utmSource: link.utmSource?.trim().slice(0, 120) || null,
          utmCampaign: null,
        },
      });
    }

    await refreshAffiliateTrackingSessionCookies(res);
    return res;
  } catch {
    return NextResponse.redirect(new URL("/", req.url), 307);
  }
}
