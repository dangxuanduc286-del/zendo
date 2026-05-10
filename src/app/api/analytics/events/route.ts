import { NextResponse } from "next/server";
import { ghiSuKienAnalytics } from "../../../../lib/analytics/event-service";
import type { DuLieuSuKienAnalytics } from "../../../../lib/analytics/event-types";
import { normalizeAnalyticsEventName } from "../../../../lib/analytics/event-contract";
import { chuanHoaPathname } from "../../../../lib/analytics/source";
import { layCauHinhTrackingAnalytics } from "../../../../lib/analytics/tracking-settings";

function isStorefrontPath(pathname: string): boolean {
  return (
    !pathname.startsWith("/admin") &&
    !pathname.startsWith("/api") &&
    !pathname.startsWith("/_next") &&
    !/\.[a-zA-Z0-9]+$/.test(pathname)
  );
}

function layIpAnToan(request: Request): string | null {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return null;
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const url = new URL(request.url);
    if (url.searchParams.has("_rsc")) {
      return NextResponse.json({ skipped: true, reason: "rsc_request" });
    }
    const userAgent = request.headers.get("user-agent") ?? "";
    if (/bot|crawler|spider|facebookexternalhit|slurp|bingpreview|headless/i.test(userAgent)) {
      return NextResponse.json({ skipped: true, reason: "bot_user_agent" });
    }
    const trackingSettings = await layCauHinhTrackingAnalytics();
    if (!trackingSettings.trackingEnabled) {
      return NextResponse.json({ skipped: true, reason: "tracking_disabled" });
    }

    const payload = (await request.json()) as Partial<DuLieuSuKienAnalytics>;
    const normalizedEventName = normalizeAnalyticsEventName(payload.eventName);
    if (!normalizedEventName) {
      return NextResponse.json({ message: "eventName không hợp lệ." }, { status: 400 });
    }

    const pathname = chuanHoaPathname(payload.pathname);
    if (!isStorefrontPath(pathname)) {
      return NextResponse.json({ skipped: true, reason: "non_storefront_path" });
    }

    await ghiSuKienAnalytics({
      eventName: normalizedEventName,
      pathname,
      productId: payload.productId ?? null,
      orderId: payload.orderId ?? null,
      visitorKey: payload.visitorKey ?? null,
      sessionKey: payload.sessionKey ?? null,
      referrer: payload.referrer ?? null,
      deviceType: payload.deviceType ?? null,
      landingPath: payload.landingPath ?? null,
      metadata: payload.metadata ?? null,
      ipAddress: layIpAnToan(request),
      userAgent,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ message: "Không thể ghi sự kiện analytics." }, { status: 500 });
  }
}

