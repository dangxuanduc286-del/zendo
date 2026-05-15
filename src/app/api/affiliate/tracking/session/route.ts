import { performance } from "node:perf_hooks";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { firstForwardedIp, getOrSetAffiliateSessionId } from "@/lib/affiliate-tracking";
import { logAffiliateTrackingIngest } from "@/lib/affiliate-tracking-center";
import { applySharedRateLimit } from "@/lib/rate-limit-shared";

const SESSION_ROUTE = "/api/affiliate/tracking/session";

/**
 * Public: đồng bộ / tạo session tracking (cookie). Dùng cho pixel storefront trước khi gửi event.
 */
export async function POST(): Promise<NextResponse> {
  const t0 = performance.now();
  const h = await headers();
  const ip = firstForwardedIp(h);
  const rate = await applySharedRateLimit({
    scope: "affiliate-track-session",
    key: ip ?? "noip",
    windowMs: 60_000,
    max: 120,
  });
  if (rate.ok === false) {
    const latencyMs = Math.round(performance.now() - t0);
    void logAffiliateTrackingIngest({
      affiliateProfileId: null,
      route: SESSION_ROUTE,
      eventType: "session",
      success: false,
      statusCode: 429,
      ip,
      message: "rate_limit",
      latencyMs,
      payloadBytes: 0,
      eventCount: 1,
    });
    return NextResponse.json(
      { ok: false, message: "Bạn thao tác quá nhanh. Vui lòng thử lại sau." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } },
    );
  }

  try {
    const cookieCarrier = NextResponse.next();
    const sessionId = await getOrSetAffiliateSessionId(cookieCarrier);
    const out = NextResponse.json({ ok: true as const, sessionId });
    cookieCarrier.headers.forEach((value, key) => {
      if (key.toLowerCase() === "set-cookie") {
        out.headers.append(key, value);
      }
    });
    const latencyMs = Math.round(performance.now() - t0);
    void logAffiliateTrackingIngest({
      affiliateProfileId: null,
      route: SESSION_ROUTE,
      eventType: "session",
      success: true,
      statusCode: 200,
      ip,
      message: "ok",
      latencyMs,
      payloadBytes: 0,
      eventCount: 1,
    });
    return out;
  } catch {
    const latencyMs = Math.round(performance.now() - t0);
    void logAffiliateTrackingIngest({
      affiliateProfileId: null,
      route: SESSION_ROUTE,
      eventType: "session",
      success: false,
      statusCode: 500,
      ip,
      message: "exception",
      latencyMs,
      payloadBytes: 0,
      eventCount: 1,
    });
    return NextResponse.json({ ok: false, message: "Không tạo được session." }, { status: 500 });
  }
}
