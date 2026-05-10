"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { AFFILIATE_REF_STORAGE_KEY } from "../../lib/cart";
import { guiSuKienAnalyticsClient } from "../../lib/analytics/event-client";
import { guiLuotTruyCapStorefront } from "../../lib/analytics/visit-client";
import { laySessionKey, layVisitorKey } from "../../lib/analytics/visitor-session";

export default function AnalyticsPageViewTracker(): JSX.Element | null {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lanDau = useRef(true);
  const mounted = useRef(false);

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
  }, []);

  useEffect(() => {
    if (!pathname) return;
    if (pathname.startsWith("/admin") || pathname.startsWith("/_next") || pathname.includes("__rsc")) {
      return;
    }
    const query = searchParams?.toString() ?? "";
    if (query.toLowerCase().includes("_rsc=")) {
      return;
    }
    try {
      const refParam = searchParams?.get("ref")?.trim() ?? "";
      if (refParam && typeof window !== "undefined") {
        const safeRef = refParam.slice(0, 128);
        window.localStorage.setItem(AFFILIATE_REF_STORAGE_KEY, safeRef.slice(0, 64));
        try {
          const lp = encodeURIComponent(`${pathname}${query ? `?${query}` : ""}`.slice(0, 2000));
          const vk = encodeURIComponent(layVisitorKey().slice(0, 128));
          const sk = encodeURIComponent(laySessionKey().slice(0, 128));
          const rr = encodeURIComponent(safeRef);
          void fetch(`/api/storefront/affiliate/capture?ref=${rr}&vk=${vk}&sk=${sk}&lp=${lp}`, {
            method: "GET",
            credentials: "same-origin",
          }).catch(() => {});
        } catch {
          /* ignore */
        }
      }
    } catch {
      /* ignore */
    }
    const fullPath = query ? `${pathname}?${query}` : pathname;
    guiLuotTruyCapStorefront(pathname).catch(() => {});
    guiSuKienAnalyticsClient({
      eventName: "page_view",
      pathname: fullPath,
      metadata: { firstPageInSession: lanDau.current },
    }).catch(() => {});
    lanDau.current = false;
  }, [pathname, searchParams]);

  return null;
}

