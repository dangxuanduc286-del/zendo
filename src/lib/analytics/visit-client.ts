"use client";

import { chuanHoaPathname } from "./source";
import { laySessionKey, layVisitorKey } from "./visitor-session";

export async function guiLuotTruyCapStorefront(pathname: string): Promise<void> {
  const safePathname = chuanHoaPathname(pathname);
  if (
    !safePathname.startsWith("/") ||
    safePathname.startsWith("/admin") ||
    safePathname.startsWith("/api") ||
    safePathname.startsWith("/_next")
  ) {
    return;
  }
  const visitorKey = layVisitorKey();
  const sessionKey = laySessionKey();
  const referrer = typeof document !== "undefined" ? document.referrer || null : null;

  try {
    const response = await fetch("/api/analytics/visits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pathname: safePathname,
        referrer,
        visitorKey,
        sessionKey,
      }),
      keepalive: true,
    });
    const payload = (await response.json().catch(() => null)) as { success?: boolean; reason?: string | null } | null;
    if (!response.ok || payload?.success === false) {
      return;
    }
  } catch {
  }
}
