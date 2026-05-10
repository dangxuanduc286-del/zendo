import type { DealsMetricsContext } from "./metrics";

export type DealsMetricEventName =
  | "deals_impression"
  | "deals_section_view"
  | "deals_click"
  | "deals_coupon_usage";

export type DealsMetricEvent = {
  eventName: DealsMetricEventName;
  createdAt: string;
  ctx: DealsMetricsContext & { pathname?: string };
};

export type DealsAggregateRow = {
  key: string;
  campaignId: string;
  sectionId: string;
  sectionType: string;
  productSource: string;
  campaignState: string;
  couponId: string;
  impressions: number;
  sectionViews: number;
  clicks: number;
  couponUsage: number;
  addToCart: number;
  beginCheckout: number;
  ctr: number; // clicks / impressions
};

function toStr(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function normalizeEventName(action: string): DealsMetricEventName | null {
  // auditLog.action looks like "event:<eventName>"
  const raw = action.startsWith("event:") ? action.slice("event:".length) : action;
  if (
    raw === "deals_impression" ||
    raw === "deals_section_view" ||
    raw === "deals_click" ||
    raw === "deals_coupon_usage"
  ) {
    return raw;
  }
  return null;
}

export function parseDealsMetricEventFromAuditLogRow(row: {
  action: string;
  createdAt: Date;
  metadata: unknown;
}): DealsMetricEvent | null {
  const eventName = normalizeEventName(row.action);
  if (!eventName) return null;
  if (!row.metadata || typeof row.metadata !== "object" || Array.isArray(row.metadata)) return null;
  const m = row.metadata as Record<string, unknown>;
  const ctx: DealsMetricsContext & { pathname?: string } = {
    campaignId: toStr(m.campaignId),
    sectionId: toStr(m.sectionId),
    sectionType: toStr(m.sectionType),
    productSource: toStr(m.productSource),
    campaignState: toStr(m.campaignState),
    sessionId: toStr(m.sessionId),
    visitorId: toStr(m.visitorId),
    referrer: toStr(m.referrer),
    visitorKey: toStr(m.visitorKey),
    sessionKey: toStr(m.sessionKey),
    experimentId: toStr(m.experimentId),
    variantId: toStr(m.variantId),
    bucket: typeof m.bucket === "number" ? m.bucket : undefined,
    productId: toStr(m.productId),
    couponId: toStr(m.couponId),
    pathname: toStr(m.pathname),
  };
  return { eventName, createdAt: row.createdAt.toISOString(), ctx };
}

type ConversionEventName = "add_to_cart" | "begin_checkout";
type ConversionEvent = {
  eventName: ConversionEventName;
  createdAt: string;
  visitorKey: string;
  sessionKey: string;
  productId: string;
};

function normalizeConversionEventName(action: string): ConversionEventName | null {
  const raw = action.startsWith("event:") ? action.slice("event:".length) : action;
  if (raw === "add_to_cart" || raw === "begin_checkout") return raw;
  return null;
}

function parseConversionEventFromAuditLogRow(row: {
  action: string;
  createdAt: Date;
  metadata: unknown;
}): ConversionEvent | null {
  const eventName = normalizeConversionEventName(row.action);
  if (!eventName) return null;
  if (!row.metadata || typeof row.metadata !== "object" || Array.isArray(row.metadata)) return null;
  const m = row.metadata as Record<string, unknown>;
  const productId = toStr(m.productId);
  const visitorKey = toStr(m.visitorKey);
  const sessionKey = toStr(m.sessionKey);
  if (!productId) return null;
  return { eventName, createdAt: row.createdAt.toISOString(), visitorKey, sessionKey, productId };
}

function identityKey(visitorKey: string, sessionKey: string): string {
  return visitorKey ? `v:${visitorKey}` : sessionKey ? `s:${sessionKey}` : "";
}

export function attachConversionSignals(args: {
  dealsEvents: DealsMetricEvent[];
  conversionRows: Array<{ action: string; createdAt: Date; metadata: unknown }>;
  windowMs?: number;
}): DealsMetricEvent[] {
  const windowMs = Math.max(30_000, Math.min(2 * 60 * 60_000, Number(args.windowMs ?? 30 * 60_000) || 30 * 60_000));

  const clicks = args.dealsEvents
    .filter((e) => e.eventName === "deals_click" && (e.ctx.productId || "").trim())
    .map((e) => ({
      createdAtMs: Date.parse(e.createdAt),
      identity: identityKey(e.ctx.visitorKey || "", e.ctx.sessionKey || ""),
      productId: (e.ctx.productId || "").trim(),
      sectionId: (e.ctx.sectionId || "").trim(),
      sectionType: (e.ctx.sectionType || "").trim(),
      productSource: (e.ctx.productSource || "").trim(),
      campaignState: (e.ctx.campaignState || "").trim(),
      couponId: (e.ctx.couponId || "").trim(),
      campaignId: (e.ctx.campaignId || "").trim(),
    }))
    .filter((c) => c.identity && c.productId && c.sectionId);

  // index clicks by identity+product, keep sorted desc by time
  const clickMap = new Map<string, typeof clicks>();
  for (const c of clicks) {
    const k = `${c.identity}|${c.productId}`;
    const arr = clickMap.get(k) ?? [];
    arr.push(c);
    clickMap.set(k, arr);
  }
  for (const [k, arr] of clickMap) {
    arr.sort((a, b) => b.createdAtMs - a.createdAtMs);
    clickMap.set(k, arr.slice(0, 50));
  }

  const synthetic: DealsMetricEvent[] = [];
  for (const r of args.conversionRows) {
    const conv = parseConversionEventFromAuditLogRow(r);
    if (!conv) continue;
    const id = identityKey(conv.visitorKey, conv.sessionKey);
    if (!id) continue;
    const key = `${id}|${conv.productId}`;
    const candidates = clickMap.get(key);
    if (!candidates || !candidates.length) continue;
    const tConv = Date.parse(conv.createdAt);
    const matched = candidates.find((c) => tConv >= c.createdAtMs && tConv - c.createdAtMs <= windowMs);
    if (!matched) continue;

    // encode conversions as deals events on same section (so scoring/aggregation can stay section-based)
    synthetic.push({
      eventName: conv.eventName === "add_to_cart" ? "deals_section_view" : "deals_section_view",
      createdAt: conv.createdAt,
      ctx: {
        campaignId: matched.campaignId,
        sectionId: matched.sectionId,
        sectionType: matched.sectionType,
        productSource: matched.productSource,
        campaignState: matched.campaignState,
        productId: matched.productId,
        couponId: matched.couponId,
        visitorKey: conv.visitorKey,
        sessionKey: conv.sessionKey,
        pathname: "",
        __conversionEventName: conv.eventName,
      } as DealsMetricsContext & { pathname?: string },
    });
  }

  return [...args.dealsEvents, ...synthetic];
}

export function aggregateSectionMetrics(events: DealsMetricEvent[]): DealsAggregateRow[] {
  const map = new Map<string, DealsAggregateRow>();
  for (const e of events) {
    const campaignId = e.ctx.campaignId || "";
    const sectionId = e.ctx.sectionId || "";
    const sectionType = e.ctx.sectionType || "";
    const productSource = e.ctx.productSource || "";
    const campaignState = e.ctx.campaignState || "";
    const couponId = e.ctx.couponId || "";
    const key = [campaignId, sectionId, sectionType, productSource, campaignState, couponId].join("|");
    const row =
      map.get(key) ??
      {
        key,
        campaignId,
        sectionId,
        sectionType,
        productSource,
        campaignState,
        couponId,
        impressions: 0,
        sectionViews: 0,
        clicks: 0,
        couponUsage: 0,
        addToCart: 0,
        beginCheckout: 0,
        ctr: 0,
      };
    if (e.eventName === "deals_impression") row.impressions += 1;
    if (e.eventName === "deals_section_view") row.sectionViews += 1;
    if (e.eventName === "deals_click") row.clicks += 1;
    if (e.eventName === "deals_coupon_usage") row.couponUsage += 1;
    // internal conversion markers attached from attachConversionSignals()
    const marker =
      e.ctx && typeof e.ctx === "object" && "__conversionEventName" in (e.ctx as Record<string, unknown>)
        ? ((e.ctx as Record<string, unknown>).__conversionEventName as unknown)
        : null;
    if (marker === "add_to_cart") row.addToCart += 1;
    if (marker === "begin_checkout") row.beginCheckout += 1;
    map.set(key, row);
  }
  const out = [...map.values()];
  for (const r of out) r.ctr = r.impressions > 0 ? r.clicks / r.impressions : 0;
  return out;
}

export function aggregateCampaignMetrics(events: DealsMetricEvent[]): DealsAggregateRow[] {
  // same rows for now; consumers can re-group by campaignState or sectionType
  return aggregateSectionMetrics(events);
}

export function aggregateDealsMetrics(events: DealsMetricEvent[]): {
  totals: { impressions: number; sectionViews: number; clicks: number; couponUsage: number; ctr: number };
  bySection: DealsAggregateRow[];
} {
  const bySection = aggregateSectionMetrics(events);
  const totals = bySection.reduce(
    (acc, r) => {
      acc.impressions += r.impressions;
      acc.sectionViews += r.sectionViews;
      acc.clicks += r.clicks;
      acc.couponUsage += r.couponUsage;
      return acc;
    },
    { impressions: 0, sectionViews: 0, clicks: 0, couponUsage: 0, ctr: 0 },
  );
  totals.ctr = totals.impressions > 0 ? totals.clicks / totals.impressions : 0;
  return { totals, bySection };
}

