import type { RangeKey } from "@/lib/affiliate-analytics";

/** Workspace — legacy dashboard (`referredOrdersCount` từ tối đa 150 đơn gần nhất). */
export const CTV_WORKSPACE_ORDER_LABEL = "Đơn phát sinh (Tối đa 150 gần nhất)";

export const CTV_WORKSPACE_ORDER_HINT =
  "Số đơn lấy từ tối đa 150 đơn mới nhất trên dashboard.";

/** Hub — `getAffiliateAnalyticsOverview(range: "month").orders`. */
export const CTV_HUB_ORDER_LABEL = "Đơn phát sinh (Tháng này)";

export const CTV_HUB_ORDER_HINT = "Mọi đơn gắn CTV được tạo trong tháng.";

/** Thống kê / Admin Analytics (1 CTV) — `Order` trong kỳ. */
export const CTV_ANALYTICS_ORDER_PERIOD_HINT = "Mọi đơn gắn CTV trong kỳ.";

/** Admin tổng quan — mọi CTV. */
export const CTV_ADMIN_ORDER_SYSTEM_SUFFIX = "· Toàn hệ thống";

/** KPI marketing — đơn PAID theo `paidAt` trong kỳ (`getAffiliateAnalyticsOverview.paidOrders`). */
export const CTV_PAID_ORDER_KPI_BASE = "Đơn đã thanh toán";

export const CTV_PAID_ORDER_KPI_HINT =
  "Đơn có trạng thái thanh toán thành công, tính theo ngày thanh toán trong kỳ.";

export function paidOrderLabelForAnalyticsRange(range: RangeKey): string {
  switch (range) {
    case "today":
      return "Đơn đã thanh toán (Hôm nay)";
    case "7d":
      return "Đơn đã thanh toán (7 ngày)";
    case "30d":
      return "Đơn đã thanh toán (30 ngày)";
    case "month":
      return "Đơn đã thanh toán (Tháng này)";
    default:
      return CTV_PAID_ORDER_KPI_BASE;
  }
}

export function paidOrderLabelForAdminSystemOverview(range: RangeKey): string {
  return `${paidOrderLabelForAnalyticsRange(range)} ${CTV_ADMIN_ORDER_SYSTEM_SUFFIX}`;
}

export function orderLabelForAnalyticsRange(range: RangeKey): string {
  switch (range) {
    case "today":
      return "Đơn phát sinh (Hôm nay)";
    case "7d":
      return "Đơn phát sinh (7 ngày)";
    case "30d":
      return "Đơn phát sinh (30 ngày)";
    case "month":
      return "Đơn phát sinh (Tháng này)";
    default:
      return "Đơn phát sinh";
  }
}

export function orderLabelForAdminSystemOverview(range: RangeKey): string {
  return `${orderLabelForAnalyticsRange(range)} ${CTV_ADMIN_ORDER_SYSTEM_SUFFIX}`;
}
