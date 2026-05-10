import type { TenSuKienAnalytics } from "./event-types";

export const ANALYTICS_EVENT_CONTRACT = [
  "page_view",
  "product_view",
  "add_to_cart",
  "begin_checkout",
  "submit_order",
  "paid_order",
  "generate_lead",
  "deals_impression",
  "deals_section_view",
  "deals_click",
  "deals_coupon_usage",
  "affiliate_notification_click",
  "affiliate_commission_tab_open",
] as const satisfies ReadonlyArray<TenSuKienAnalytics>;

const EVENT_NAME_SET = new Set<TenSuKienAnalytics>(ANALYTICS_EVENT_CONTRACT);

const EVENT_ALIAS_MAP: Record<string, TenSuKienAnalytics> = {
  order_created: "submit_order",
};

export function normalizeAnalyticsEventName(value: unknown): TenSuKienAnalytics | null {
  if (typeof value !== "string") return null;
  if (EVENT_NAME_SET.has(value as TenSuKienAnalytics)) {
    return value as TenSuKienAnalytics;
  }
  return EVENT_ALIAS_MAP[value] ?? null;
}

export function getAnalyticsEventVietnameseLabel(eventName: TenSuKienAnalytics): string {
  switch (eventName) {
    case "submit_order":
      return "Gửi đơn hàng / Tạo đơn";
    case "paid_order":
      return "Đơn đã thanh toán";
    case "page_view":
      return "Xem trang";
    case "product_view":
      return "Xem sản phẩm";
    case "add_to_cart":
      return "Thêm vào giỏ";
    case "begin_checkout":
      return "Bắt đầu thanh toán";
    case "generate_lead":
      return "Tạo khách hàng tiềm năng";
    case "affiliate_notification_click":
      return "CTV: bấm thông báo hoa hồng";
    case "affiliate_commission_tab_open":
      return "CTV: mở tab Hoa hồng";
    default:
      return eventName;
  }
}
