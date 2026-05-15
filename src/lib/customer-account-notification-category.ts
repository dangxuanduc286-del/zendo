/**
 * Chuẩn hoá `CustomerAccountNotification.category` (enum DB) → key tab/UI (lowercase).
 * `metadata.type` chỉ dùng cho variant hiển thị (ORDER_CUSTOMER, AFFILIATE_REFERRAL, …), không map thành category tab.
 */

export type CustomerNotificationTabCategory = "order" | "promotion" | "system" | "commission";

const VALID_UPPER = new Set(["ORDER", "PROMOTION", "SYSTEM", "COMMISSION"]);

/**
 * Chuẩn hoá serialization API / SSR: uppercase tolerant, sai → SYSTEM (an toàn).
 */
export function normalizeCustomerNotificationCategory(
  raw: string | null | undefined,
): CustomerNotificationTabCategory {
  const u = String(raw ?? "").trim().toUpperCase();
  if (!VALID_UPPER.has(u)) return "system";
  if (u === "ORDER") return "order";
  if (u === "PROMOTION") return "promotion";
  if (u === "COMMISSION") return "commission";
  if (u === "SYSTEM") return "system";
  return "system";
}
