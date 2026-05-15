/** CustomEvent — đồng bộ topbar / mọi UI không subscribe Zustand trực tiếp. */
export const STOREFRONT_SUPPORT_UNREAD_UPDATED_EVENT = "storefront-support-unread-updated";

export type StorefrontSupportUnreadUpdatedDetail = { total: number };

export function notifyStorefrontSupportUnreadUpdated(total: number): void {
  if (typeof window === "undefined") return;
  const t = Math.max(0, Math.floor(Number.isFinite(total) ? total : 0));
  window.dispatchEvent(
    new CustomEvent<StorefrontSupportUnreadUpdatedDetail>(STOREFRONT_SUPPORT_UNREAD_UPDATED_EVENT, {
      detail: { total: t },
    }),
  );
}

/** Tên kênh BroadcastChannel — đồng bộ unread / danh sách giữa các tab storefront (USER). */
export const STOREFRONT_SUPPORT_BROADCAST = "zendo.storefront.support.v1";

/** Debounce refetch khi nhiều `unread_sync` liên tiếp (multi-tab / Pusher). */
export const STOREFRONT_SUPPORT_BC_DEBOUNCE_MS = 150;

export type StorefrontSupportBroadcastPayload =
  | { type: "unread_sync"; ticketId: string }
  | { type: "ticket_archived"; ticketId: string };

/** Hiển thị badge unread (topbar + từng dòng ticket). */
export function formatSupportUnreadBadge(count: number): string {
  const n = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
  return n > 99 ? "99+" : String(n);
}