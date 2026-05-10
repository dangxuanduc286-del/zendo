import { NextRequest, NextResponse } from "next/server";
import {
  ZENDO_AF_REF_COOKIE,
  referralCookieMaxAgeSeconds,
} from "../../../../../lib/affiliate-referral-cookie";
import { getWebsiteSettings } from "../../../../../lib/settings";

const CLICK_DEBOUNCE_MS = 20 * 60 * 1000;

/** Ghi nhận ?ref= hợp lệ: set cookie HTTP-only + AffiliateClick (chống trùng gần). */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    if (!process.env.DATABASE_URL) {
      return new NextResponse(null, { status: 204 });
    }

    const { searchParams } = req.nextUrl;
    const rawRef = searchParams.get("ref")?.trim().slice(0, 128) ?? "";
    if (!rawRef) {
      return new NextResponse(null, { status: 204 });
    }

    const website = await getWebsiteSettings();
    if (!website.affiliateEnabled) {
      const resClear = new NextResponse(null, { status: 204 });
      resClear.cookies.delete(ZENDO_AF_REF_COOKIE);
      return resClear;
    }

    const { db } = await import("../../../../../lib/db");

    const profile = await db.affiliateProfile.findFirst({
      where: {
        refCode: { equals: rawRef, mode: "insensitive" },
        status: "ACTIVE",
      },
      select: { id: true, refCode: true },
    });

    const res = new NextResponse(null, { status: 204 });

    if (!profile?.refCode) {
      res.cookies.set(ZENDO_AF_REF_COOKIE, "", { path: "/", maxAge: 0 });
      return res;
    }

    const canon = profile.refCode.trim();
    const maxAge = referralCookieMaxAgeSeconds(website.cookieDuration);
    const isProd = process.env.NODE_ENV === "production";

    res.cookies.set(ZENDO_AF_REF_COOKIE, canon, {
      path: "/",
      maxAge,
      httpOnly: true,
      sameSite: "lax",
      secure: Boolean(isProd),
    });

    const visitorKey = searchParams.get("vk")?.trim().slice(0, 128) || null;
    const sessionKey = searchParams.get("sk")?.trim().slice(0, 128) || null;
    const landingPage = searchParams.get("lp")?.trim().slice(0, 2000) || req.headers.get("referer")?.slice(0, 2000) || null;

    const since = new Date(Date.now() - CLICK_DEBOUNCE_MS);
    const recent = visitorKey
      ? await db.affiliateClick.findFirst({
          where: {
            affiliateProfileId: profile.id,
            visitorKey,
            createdAt: { gte: since },
          },
          select: { id: true },
        })
      : null;

    if (!recent) {
      await db.affiliateClick.create({
        data: {
          affiliateProfileId: profile.id,
          refCode: canon,
          landingPage,
          visitorKey,
          sessionKey,
          referrer: req.headers.get("referer")?.slice(0, 2000) || null,
        },
      });
    }

    return res;
  } catch (e) {
    console.error("[affiliate/capture]", e);
    return new NextResponse(null, { status: 204 });
  }
}
