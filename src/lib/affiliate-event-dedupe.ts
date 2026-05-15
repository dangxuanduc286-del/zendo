import type { AffiliateTrafficEventType } from "@prisma/client";

/** Short-window dedupe for high-frequency client events (ms). */
export function affiliateTrafficDedupeWindowMs(eventType: AffiliateTrafficEventType): number {
  switch (eventType) {
    case "AFFILIATE_CLICK":
      return 15_000;
    case "PAGE_VIEW":
      return 5_000;
    case "PRODUCT_VIEW":
      return 8_000;
    case "ADD_TO_CART":
      return 5_000;
    case "CHECKOUT_STARTED":
      return 20_000;
    case "CHECKOUT_COMPLETED":
      return 60_000;
    case "ORDER_PAID":
    case "ORDER_CANCELLED":
      return 86_400_000;
    default:
      return 10_000;
  }
}

export type AffiliateTrafficDedupeKeyParts = {
  sessionId: string | null;
  eventType: AffiliateTrafficEventType;
  pathname: string | null;
  productId: string | null;
  orderId: string | null;
};

/** Stable key for in-memory / log correlation (not DB unique). */
export function affiliateTrafficDedupeLogKey(p: AffiliateTrafficDedupeKeyParts): string {
  return [
    p.sessionId ?? "",
    p.eventType,
    p.pathname ?? "",
    p.productId ?? "",
    p.orderId ?? "",
  ].join("|");
}
