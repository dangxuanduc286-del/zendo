import type { DuLieuSuKienAnalytics } from "./event-types";

export interface NguCanhRemarketing {
  source: "client" | "server";
  enabled?: boolean;
}

export function mapSuKienRemarketing(eventName: DuLieuSuKienAnalytics["eventName"]): string {
  switch (eventName) {
    case "product_view":
      return "view_item";
    case "paid_order":
      return "purchase";
    default:
      return eventName;
  }
}

/**
 * Điểm nối remarketing tập trung.
 * Hiện tại chỉ giữ kiến trúc sạch để nối Meta/GA4/GTM ở các bước sau.
 */
export function runRemarketingHook(
  suKien: DuLieuSuKienAnalytics,
  nguCanh: NguCanhRemarketing,
): void {
  if (nguCanh.enabled === false) {
    return;
  }
  const mappedEvent = mapSuKienRemarketing(suKien.eventName);
  void suKien;
  void nguCanh;
  void mappedEvent;
}

