import type { DealsAggregateRow } from "./aggregation";
import { scoreSection } from "./scoring";

export type DealsPerformanceSummary = {
  totals: { impressions: number; clicks: number; ctr: number; couponUsage: number };
  topSections: Array<DealsAggregateRow & { score: number; grade: string }>;
  worstCtrSections: Array<DealsAggregateRow & { score: number; grade: string }>;
  topCoupons: Array<{ couponId: string; usage: number }>;
};

export function buildDealsPerformanceSummary(rows: DealsAggregateRow[]): DealsPerformanceSummary {
  let impressions = 0;
  let clicks = 0;
  let couponUsage = 0;
  for (const r of rows) {
    impressions += r.impressions;
    clicks += r.clicks;
    couponUsage += r.couponUsage;
  }
  const totals = { impressions, clicks, couponUsage, ctr: impressions > 0 ? clicks / impressions : 0 };

  const scored: Array<DealsAggregateRow & { score: number; grade: string }> = [];
  for (const r of rows) {
    const s = scoreSection(r);
    scored.push({ ...r, score: s.score, grade: s.grade });
  }

  const topSections = [...scored].sort((a, b) => b.score - a.score).slice(0, 8);
  const worstCtrSections = [...scored]
    .filter((r) => r.impressions >= 50)
    .sort((a, b) => a.ctr - b.ctr)
    .slice(0, 8);

  const couponMap = new Map<string, number>();
  for (const r of scored) {
    if (!r.couponId) continue;
    couponMap.set(r.couponId, (couponMap.get(r.couponId) ?? 0) + r.couponUsage);
  }
  const topCoupons = [...couponMap.entries()]
    .map(([couponId, usage]) => ({ couponId, usage }))
    .sort((a, b) => b.usage - a.usage)
    .slice(0, 8);

  return { totals, topSections, worstCtrSections, topCoupons };
}

