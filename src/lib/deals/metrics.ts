"use client";

import { guiSuKienAnalyticsClient } from "../analytics/event-client";
import type { TenSuKienAnalytics } from "../analytics/event-types";
import { laySessionKey, layVisitorKey } from "../analytics/visitor-session";
import { validateDealsMetricsPayload } from "./metrics-integrity";

export type DealsMetricsContext = {
  campaignId?: string;
  sectionId?: string;
  sectionType?: string;
  productSource?: string;
  campaignState?: string;
  sessionId?: string;
  visitorId?: string;
  referrer?: string;
  visitorKey?: string;
  sessionKey?: string;
  experimentId?: string;
  variantId?: string;
  bucket?: number;
  productId?: string;
  couponId?: string;
};

function withAttribution(ctx: DealsMetricsContext): DealsMetricsContext {
  if (typeof window === "undefined") return ctx;
  const sessionId = ctx.sessionId || laySessionKey();
  const visitorId = ctx.visitorId || layVisitorKey();
  const referrer = ctx.referrer || (typeof document !== "undefined" ? document.referrer : "");
  return { ...ctx, sessionId, visitorId, referrer };
}

function baseMetadata(ctx: DealsMetricsContext): Record<string, unknown> {
  const c = withAttribution(ctx);
  return {
    campaignId: c.campaignId || "",
    sectionId: c.sectionId || "",
    sectionType: c.sectionType || "",
    productSource: c.productSource || "",
    campaignState: c.campaignState || "",
    sessionId: c.sessionId || "",
    visitorId: c.visitorId || "",
    referrer: c.referrer || "",
    experimentId: c.experimentId || "",
    variantId: c.variantId || "",
    bucket: typeof c.bucket === "number" ? c.bucket : null,
    productId: c.productId || "",
    couponId: c.couponId || "",
    timestamp: Date.now(),
  };
}

function makeDedupeKey(eventName: string, ctx: DealsMetricsContext): string {
  return [
    eventName,
    ctx.sectionId || "",
    ctx.sectionType || "",
    ctx.productSource || "",
    ctx.campaignState || "",
    ctx.productId || "",
    ctx.couponId || "",
  ].join("|");
}

const fired = new Map<string, number>();
function shouldFire(key: string, ttlMs: number): boolean {
  const now = Date.now();
  const last = fired.get(key);
  if (typeof last === "number" && now - last < ttlMs) return false;
  fired.set(key, now);
  // opportunistic cleanup
  if (fired.size > 800) {
    for (const [k, v] of fired) {
      if (now - v > 30 * 60_000) fired.delete(k);
    }
  }
  return true;
}

async function track(eventName: TenSuKienAnalytics, ctx: DealsMetricsContext, dedupeTtlMs: number): Promise<void> {
  if (typeof window === "undefined") return;
  const c = withAttribution(ctx);
  validateDealsMetricsPayload({ eventName, ctx: c });
  const key = makeDedupeKey(eventName, c);
  if (!shouldFire(key, dedupeTtlMs)) return;
  await guiSuKienAnalyticsClient({
    eventName,
    pathname: window.location.pathname,
    productId: c.productId ?? null,
    orderId: null,
    metadata: baseMetadata(c),
  });
}

export function trackDealsImpression(ctx: DealsMetricsContext): void {
  void track("deals_impression", ctx, 30_000);
}

export function trackSectionView(ctx: DealsMetricsContext): void {
  void track("deals_section_view", ctx, 30_000);
}

export function trackDealsClick(ctx: DealsMetricsContext): void {
  void track("deals_click", ctx, 5_000);
}

export function trackCouponUsage(ctx: DealsMetricsContext): void {
  void track("deals_coupon_usage", ctx, 5_000);
}

