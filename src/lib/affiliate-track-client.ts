"use client";

import { laySessionKey, layVisitorKey } from "@/lib/analytics/visitor-session";

type AffiliateTrackEventType =
  | "AFFILIATE_CLICK"
  | "PRODUCT_VIEW"
  | "ADD_TO_CART"
  | "CHECKOUT_STARTED"
  | "CHECKOUT_COMPLETED"
  | "ORDER_PAID"
  | "ORDER_CANCELLED";

export async function postAffiliateTrackEvent(args: {
  ref: string;
  eventType: AffiliateTrackEventType;
  pathname?: string;
  productId?: string | null;
  metadata?: Record<string, unknown> | null;
}): Promise<void> {
  const ref = args.ref.trim().slice(0, 64);
  if (!ref) return;
  const pathname =
    typeof args.pathname === "string" && args.pathname.trim().startsWith("/")
      ? args.pathname.trim().slice(0, 512)
      : typeof window !== "undefined"
        ? `${window.location.pathname}${window.location.search}`.slice(0, 512)
        : undefined;
  await fetch("/api/affiliate/track", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ref,
      eventType: args.eventType,
      pathname: pathname ?? null,
      referrer: typeof document !== "undefined" ? document.referrer?.slice(0, 1024) ?? null : null,
      sessionId: laySessionKey().slice(0, 80),
      visitorKey: layVisitorKey().slice(0, 120),
      productId: args.productId?.trim().slice(0, 64) ?? null,
      metadata: args.metadata ?? null,
    }),
    keepalive: true,
  }).catch(() => {});
}
