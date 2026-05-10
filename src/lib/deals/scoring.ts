import type { DealsAggregateRow } from "./aggregation";

export type ScoreGrade = "A" | "B" | "C" | "D" | "F";

export type SectionScore = {
  score: number; // 0..100
  grade: ScoreGrade;
  reasons: string[];
};

function clamp(n: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, n));
}

export function scoreSection(row: DealsAggregateRow): SectionScore {
  const reasons: string[] = [];
  const impressions = row.impressions;
  const couponUsage = row.couponUsage;
  const addToCart = row.addToCart ?? 0;
  const beginCheckout = row.beginCheckout ?? 0;
  const ctr = row.ctr;

  const usageRate = impressions > 0 ? couponUsage / impressions : 0;
  const addToCartRate = impressions > 0 ? addToCart / impressions : 0;
  const beginCheckoutRate = impressions > 0 ? beginCheckout / impressions : 0;

  // Weighted scoring: CTR remains dominant, conversion is weighted bonus.
  // CTR 65%, coupon usage 15%, add_to_cart 10%, begin_checkout 10%.
  const ctrScore = clamp((ctr / 0.2) * 65, 0, 65);
  const usageScore = clamp((usageRate / 0.1) * 15, 0, 15);
  // Cap rates to prevent 1 conversion beating healthy high-volume sections.
  const addToCartScore = clamp((Math.min(addToCartRate, 0.08) / 0.08) * 10, 0, 10);
  const beginCheckoutScore = clamp((Math.min(beginCheckoutRate, 0.05) / 0.05) * 10, 0, 10);

  let score = ctrScore + usageScore + addToCartScore + beginCheckoutScore;

  // Minimum conversion thresholds (soft dampening).
  if (beginCheckout > 0 && beginCheckout < 2) {
    score -= 3;
    reasons.push("low checkout count");
  }
  if (addToCart > 0 && addToCart < 2) {
    score -= 2;
    reasons.push("low add_to_cart count");
  }

  // Penalize very low traffic (avoid overrating tiny samples)
  if (impressions < 50) {
    score *= 0.7;
    reasons.push("low sample size");
  }
  score = clamp(Math.round(score), 0, 100);

  const grade: ScoreGrade =
    score >= 85 ? "A" : score >= 70 ? "B" : score >= 55 ? "C" : score >= 40 ? "D" : "F";

  if (impressions === 0) reasons.push("zero impressions");
  if (ctr >= 0.1) reasons.push("high CTR");
  if (usageRate >= 0.02) reasons.push("coupon usage");
  if (beginCheckoutRate >= 0.01 && beginCheckout >= 2) reasons.push("checkout starts");

  return { score, grade, reasons: reasons.slice(0, 3) };
}

