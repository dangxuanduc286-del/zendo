"use client";

import { xacDinhLoaiThietBiTuUserAgent } from "./device-type";
import type { DuLieuSuKienAnalytics } from "./event-types";
import { runRemarketingHook } from "./remarketing";
import { chuanHoaPathname } from "./source";
import { layHoacGanLandingPath, laySessionKey, layVisitorKey } from "./visitor-session";

interface AnalyticsConfigClient {
  trackingEnabled?: boolean;
  remarketingEventsEnabled?: boolean;
}

function layCauHinhAnalyticsClient(): AnalyticsConfigClient {
  if (typeof window === "undefined") return {};
  const raw = (window as Window & { __ZENDO_ANALYTICS_CONFIG__?: AnalyticsConfigClient })
    .__ZENDO_ANALYTICS_CONFIG__;
  if (!raw || typeof raw !== "object") return {};
  return raw;
}

function toSafePathname(pathname: string | undefined): string {
  return chuanHoaPathname(pathname ?? window.location.pathname);
}

export async function guiSuKienAnalyticsClient(
  input: Omit<DuLieuSuKienAnalytics, "visitorKey" | "sessionKey" | "deviceType" | "landingPath">,
): Promise<void> {
  const config = layCauHinhAnalyticsClient();
  if (config.trackingEnabled === false) {
    return;
  }

  const pathname = toSafePathname(input.pathname);
  const visitorKey = layVisitorKey();
  const sessionKey = laySessionKey();
  const landingPath = layHoacGanLandingPath(pathname);
  const deviceType = xacDinhLoaiThietBiTuUserAgent(
    typeof window !== "undefined" ? window.navigator.userAgent : "",
  );

  const payload: DuLieuSuKienAnalytics = {
    ...input,
    pathname,
    visitorKey,
    sessionKey,
    landingPath,
    deviceType,
    referrer: input.referrer ?? (typeof document !== "undefined" ? document.referrer : null),
  };

  fetch("/api/analytics/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {});

  runRemarketingHook(payload, {
    source: "client",
    enabled: config.remarketingEventsEnabled !== false,
  });
}

