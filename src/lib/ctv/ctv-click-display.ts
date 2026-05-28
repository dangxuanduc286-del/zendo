import type { RangeKey } from "@/lib/affiliate-analytics";

/** Workspace — `AffiliateClick` lifetime (`/api/account/affiliate/dashboard`). */
export const CTV_WORKSPACE_CLICK_LABEL = "Tổng click (Tất cả thời gian)";

export const CTV_WORKSPACE_CLICK_HINT = "Dữ liệu AffiliateClick tích lũy từ khi tham gia.";

/** Hub — `getAffiliateAnalyticsOverview(range: "today")`. */
export const CTV_HUB_CLICK_LABEL = "Click hôm nay";

/** Thống kê / Admin Analytics — `AffiliateTrafficEvent` AFFILIATE_CLICK trong kỳ. */
export const CTV_ANALYTICS_CLICK_PERIOD_HINT = "Số sự kiện click affiliate trong kỳ.";

export function clickLabelForAnalyticsRange(range: RangeKey): string {
  switch (range) {
    case "today":
      return "Tổng click (Hôm nay)";
    case "7d":
      return "Tổng click (7 ngày)";
    case "30d":
      return "Tổng click (30 ngày)";
    case "month":
      return "Tổng click (Tháng này)";
    default:
      return "Tổng click";
  }
}
