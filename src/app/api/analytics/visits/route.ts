import { NextResponse } from "next/server";
import { trackPageVisit } from "../../../../lib/analytics/page-visit";
import { chuanHoaPathname } from "../../../../lib/analytics/source";
import { layCauHinhTrackingAnalytics } from "../../../../lib/analytics/tracking-settings";

type VisitPayload = {
  pathname?: string;
  referrer?: string | null;
  visitorKey?: string | null;
  sessionKey?: string | null;
};

function getClientIp(request: Request): string | null {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip");
  return realIp?.trim() || null;
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const url = new URL(request.url);
    if (url.searchParams.has("_rsc")) {
      return NextResponse.json({ skipped: true, reason: "rsc_request" });
    }
    const trackingSettings = await layCauHinhTrackingAnalytics();
    if (!trackingSettings.trackingEnabled) {
      return NextResponse.json({ skipped: true, reason: "tracking_disabled" });
    }
    const payload = (await request.json()) as VisitPayload;
    const pathname = chuanHoaPathname(payload.pathname);
    const result = await trackPageVisit({
      pathname,
      referrer: payload.referrer ?? null,
      visitorKey: payload.visitorKey ?? null,
      sessionKey: payload.sessionKey ?? null,
      userAgent: request.headers.get("user-agent"),
      ip: getClientIp(request),
    });

    return NextResponse.json({ success: result.created, reason: result.reason ?? null });
  } catch {
    return NextResponse.json({ message: "Không thể ghi nhận lượt truy cập." }, { status: 500 });
  }
}
