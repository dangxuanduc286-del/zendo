import type { DealsMetricEvent } from "./aggregation";

export type AttributionReferrerRow = {
  referrer: string;
  impressions: number;
  clicks: number;
  couponUsage: number;
  ctr: number;
};

export type AttributionCampaignRow = {
  campaignId: string;
  impressions: number;
  clicks: number;
  couponUsage: number;
  ctr: number;
};

export type DealsAttributionSummary = {
  totals: { impressions: number; clicks: number; couponUsage: number; ctr: number };
  topReferrers: AttributionReferrerRow[];
  topCampaigns: AttributionCampaignRow[];
};

function s(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function sum(impressions: number, clicks: number, couponUsage: number) {
  const ctr = impressions > 0 ? clicks / impressions : 0;
  return { impressions, clicks, couponUsage, ctr };
}

export function buildAttributionSummary(events: DealsMetricEvent[]): DealsAttributionSummary {
  const byRef = new Map<string, { impressions: number; clicks: number; couponUsage: number }>();
  const byCampaign = new Map<string, { impressions: number; clicks: number; couponUsage: number }>();

  let tImp = 0;
  let tClk = 0;
  let tCup = 0;

  for (const e of events) {
    const ref = (s(e.ctx.referrer) || "direct").slice(0, 240);
    const campaignId = (s(e.ctx.campaignId) || "unknown").slice(0, 120);
    let r = byRef.get(ref);
    if (!r) {
      r = { impressions: 0, clicks: 0, couponUsage: 0 };
      byRef.set(ref, r);
    }
    let c = byCampaign.get(campaignId);
    if (!c) {
      c = { impressions: 0, clicks: 0, couponUsage: 0 };
      byCampaign.set(campaignId, c);
    }

    if (e.eventName === "deals_impression") {
      r.impressions += 1;
      c.impressions += 1;
      tImp += 1;
    }
    if (e.eventName === "deals_click") {
      r.clicks += 1;
      c.clicks += 1;
      tClk += 1;
    }
    if (e.eventName === "deals_coupon_usage") {
      r.couponUsage += 1;
      c.couponUsage += 1;
      tCup += 1;
    }

    // maps already hold references
  }

  const topReferrers = [...byRef.entries()]
    .map(([referrer, v]) => ({ referrer, ...sum(v.impressions, v.clicks, v.couponUsage) }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 12);

  const topCampaigns = [...byCampaign.entries()]
    .map(([campaignId, v]) => ({ campaignId, ...sum(v.impressions, v.clicks, v.couponUsage) }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 12);

  return { totals: sum(tImp, tClk, tCup), topReferrers, topCampaigns };
}

