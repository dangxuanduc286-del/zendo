import type { KhoangThoiGianAnalytics } from "./date-range";

export type XuHuongSoSanhAnalytics = "tang" | "giam" | "on_dinh";

export interface SoSanhChiSoAnalytics {
  currentTotal: number;
  previousTotal: number;
  difference: number;
  percentChange: number | null;
  trend: XuHuongSoSanhAnalytics;
}

export function soSanhChiSoAnalytics(
  currentTotal: number,
  previousTotal: number,
): SoSanhChiSoAnalytics {
  const difference = currentTotal - previousTotal;
  const trend: XuHuongSoSanhAnalytics =
    difference > 0 ? "tang" : difference < 0 ? "giam" : "on_dinh";

  if (previousTotal === 0) {
    return {
      currentTotal,
      previousTotal,
      difference,
      percentChange: null,
      trend,
    };
  }

  return {
    currentTotal,
    previousTotal,
    difference,
    percentChange: (difference / previousTotal) * 100,
    trend,
  };
}

export function taoKhoangKyTruocAnalytics(
  currentRange: KhoangThoiGianAnalytics,
): KhoangThoiGianAnalytics {
  const durationMs = currentRange.ketThuc.getTime() - currentRange.batDau.getTime();
  return {
    batDau: new Date(currentRange.batDau.getTime() - durationMs),
    ketThuc: new Date(currentRange.batDau.getTime()),
  };
}

export type TrendDirection = "up" | "down" | "flat";

export interface PeriodComparison {
  currentTotal: number;
  previousTotal: number;
  difference: number;
  percentChange: number;
  trend: TrendDirection;
}

export function getPercentChange(currentTotal: number, previousTotal: number): number {
  const current = Number.isFinite(currentTotal) ? currentTotal : 0;
  const previous = Number.isFinite(previousTotal) ? previousTotal : 0;
  if (previous === 0) {
    if (current === 0) return 0;
    return 100;
  }
  return ((current - previous) / previous) * 100;
}

export function comparePeriods(currentTotal: number, previousTotal: number): PeriodComparison {
  const current = Number.isFinite(currentTotal) ? currentTotal : 0;
  const previous = Number.isFinite(previousTotal) ? previousTotal : 0;
  const difference = current - previous;
  const trend: TrendDirection = difference > 0 ? "up" : difference < 0 ? "down" : "flat";
  return {
    currentTotal: current,
    previousTotal: previous,
    difference,
    percentChange: getPercentChange(current, previous),
    trend,
  };
}

