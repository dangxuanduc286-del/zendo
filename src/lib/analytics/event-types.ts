export type TenSuKienAnalytics =
  | "page_view"
  | "product_view"
  | "add_to_cart"
  | "begin_checkout"
  | "submit_order"
  | "paid_order"
  | "generate_lead"
  | "deals_impression"
  | "deals_section_view"
  | "deals_click"
  | "deals_coupon_usage"
  | "affiliate_notification_click"
  | "affiliate_commission_tab_open";

export type LoaiThietBiAnalytics = "desktop" | "mobile" | "tablet";

export interface DuLieuSuKienAnalytics {
  eventName: TenSuKienAnalytics;
  pathname: string;
  productId?: string | null;
  orderId?: string | null;
  visitorKey?: string | null;
  sessionKey?: string | null;
  referrer?: string | null;
  deviceType?: LoaiThietBiAnalytics | null;
  landingPath?: string | null;
  metadata?: Record<string, unknown> | null;
}

