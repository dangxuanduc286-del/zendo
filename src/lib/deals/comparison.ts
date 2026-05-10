import type { DealsAggregateRow } from "./aggregation";

export type CampaignComparisonResult = {
  aCampaignId: string;
  bCampaignId: string;
  a: { impressions: number; clicks: number; ctr: number; couponUsage: number };
  b: { impressions: number; clicks: number; ctr: number; couponUsage: number };
  winner: "A" | "B" | "tie";
  bestSections: Array<{ sectionId: string; winner: "A" | "B" | "tie"; aCtr: number; bCtr: number }>;
};

function sum(rows: DealsAggregateRow[]) {
  const impressions = rows.reduce((n, r) => n + r.impressions, 0);
  const clicks = rows.reduce((n, r) => n + r.clicks, 0);
  const couponUsage = rows.reduce((n, r) => n + r.couponUsage, 0);
  const ctr = impressions > 0 ? clicks / impressions : 0;
  return { impressions, clicks, couponUsage, ctr };
}

export function compareCampaigns(args: {
  aCampaignId: string;
  bCampaignId: string;
  rows: DealsAggregateRow[];
}): CampaignComparisonResult {
  const aRows = args.rows.filter((r) => r.campaignState && r.campaignState !== "draft" && r.campaignId === args.aCampaignId);
  const bRows = args.rows.filter((r) => r.campaignState && r.campaignState !== "draft" && r.campaignId === args.bCampaignId);

  const a = sum(aRows);
  const b = sum(bRows);
  const winner = a.ctr === b.ctr ? "tie" : a.ctr > b.ctr ? "A" : "B";

  // section-level compare by sectionId (CTR)
  const ids = new Set<string>([...aRows.map((r) => r.sectionId), ...bRows.map((r) => r.sectionId)].filter(Boolean));
  const bestSections = [...ids].slice(0, 20).map((sectionId) => {
    const aSec = sum(aRows.filter((r) => r.sectionId === sectionId));
    const bSec = sum(bRows.filter((r) => r.sectionId === sectionId));
    const w: "A" | "B" | "tie" = aSec.ctr === bSec.ctr ? "tie" : aSec.ctr > bSec.ctr ? "A" : "B";
    return { sectionId, winner: w, aCtr: aSec.ctr, bCtr: bSec.ctr };
  });

  return { aCampaignId: args.aCampaignId, bCampaignId: args.bCampaignId, a, b, winner, bestSections };
}

export function compareSections(args: {
  aCampaignId: string;
  bCampaignId: string;
  sectionId: string;
  rows: DealsAggregateRow[];
}): { a: DealsAggregateRow[]; b: DealsAggregateRow[] } {
  return {
    a: args.rows.filter((r) => r.campaignId === args.aCampaignId && r.sectionId === args.sectionId),
    b: args.rows.filter((r) => r.campaignId === args.bCampaignId && r.sectionId === args.sectionId),
  };
}

