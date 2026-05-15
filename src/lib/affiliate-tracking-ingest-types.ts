import type { AffiliateTrafficEventType } from "@prisma/client";

/** Serializable snapshot for BullMQ job payload (no NextResponse / Headers). */
export type AffiliateTrackSnapJson = {
  sessionId: string;
  ip: string | null;
  country: string | null;
  device: string;
  browser: string;
  os: string;
  referrer: string | null;
  pathname: string | null;
  utmSource: string | null;
  subid: string | null;
};

/**
 * v1 job body: produced only after API-side validation (ref, order, rate limits, bot).
 * Worker runs DB dedupe + persist + bus; attribution may run in a dedicated queue.
 */
export type AffiliateTrackPersistJobV1 = {
  v: 1;
  idempotencyKey: string;
  affiliateProfileId: string;
  ref: string;
  eventType: AffiliateTrafficEventType;
  sessionId: string | null;
  visitorKey: string | null;
  productId: string | null;
  orderId: string | null;
  revenue: number | null;
  commission: number | null;
  snap: AffiliateTrackSnapJson;
  safeMeta: Record<string, unknown>;
  resolvedTrackingLinkId: string | null;
};

export type AffiliateTrackAttributionJobV1 = {
  v: 1;
  affiliateProfileId: string;
  orderId: string;
  sessionId: string | null;
  lastSource: string | null;
};

export type AffiliateTrackRealtimeJobV1 = {
  v: 1;
  affiliateProfileId: string;
  eventType: AffiliateTrafficEventType;
  sessionId: string | null;
  pathname: string | null;
  trafficEventId?: string | null;
};
