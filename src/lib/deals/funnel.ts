import type { DealsMetricEvent } from "./aggregation";

export type DealsFunnelStep =
  | "deals_impression"
  | "deals_click"
  | "deals_coupon_usage"
  | "add_to_cart"
  | "begin_checkout";

export type DealsFunnelRow = {
  key: string; // campaignId|sessionId|visitorId
  campaignId: string;
  sessionId: string;
  visitorId: string;
  impression: number;
  click: number;
  couponUsage: number;
};

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

export function buildDealsFunnelSummary(events: DealsMetricEvent[]): DealsFunnelRow[] {
  const map = new Map<string, DealsFunnelRow>();
  for (const e of events) {
    const campaignId = str(e.ctx.campaignId);
    const sessionId = str(e.ctx.sessionId);
    const visitorId = str(e.ctx.visitorId);
    const key = [campaignId, sessionId, visitorId].join("|");
    const row =
      map.get(key) ??
      {
        key,
        campaignId,
        sessionId,
        visitorId,
        impression: 0,
        click: 0,
        couponUsage: 0,
      };
    if (e.eventName === "deals_impression") row.impression += 1;
    if (e.eventName === "deals_click") row.click += 1;
    if (e.eventName === "deals_coupon_usage") row.couponUsage += 1;
    map.set(key, row);
  }
  return [...map.values()];
}

