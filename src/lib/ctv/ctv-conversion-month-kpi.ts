import type { AffiliateAnalyticsOverview, RangeKey } from "@/lib/affiliate-analytics";

/** Nhãn chuẩn khi Workspace / Hub dùng `getAffiliateAnalyticsOverview(range: "month")`. */
export const CTV_CONVERSION_MONTH_LABEL = "Tỷ lệ chuyển đổi (Tháng này)";

export const CTV_CONVERSION_FORMULA_HINT = "Đơn đã thanh toán ÷ Click affiliate trong cùng kỳ";

type OverviewSlice = Pick<AffiliateAnalyticsOverview, "conversionRate" | "totalClicks"> | null | undefined;

/** `paidOrders / totalClicks` từ overview — hiển thị % làm tròn 1 chữ số thập phân. */
export function conversionPercentFromAnalyticsOverview(
  overview: OverviewSlice,
  options?: { pending?: boolean },
): number | null {
  if (options?.pending) return null;
  if (!overview) return null;
  if (overview.totalClicks <= 0) return 0;
  return Math.round(overview.conversionRate * 1000) / 10;
}

export function conversionLabelForAnalyticsRange(range: RangeKey): string {
  switch (range) {
    case "today":
      return "Tỷ lệ chuyển đổi (Hôm nay)";
    case "7d":
      return "Tỷ lệ chuyển đổi (7 ngày)";
    case "30d":
      return "Tỷ lệ chuyển đổi (30 ngày)";
    case "month":
      return CTV_CONVERSION_MONTH_LABEL;
    default:
      return "Tỷ lệ chuyển đổi";
  }
}
