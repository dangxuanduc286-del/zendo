import { create } from "zustand";

import {
  notifyStorefrontSupportUnreadUpdated,
} from "@/lib/storefront-support-sync";

/** Dữ liệu client từ `support.ticket.message.created` (đồng bộ badge + popup). */
export type SupportInboxMessageCreatedClient = {
  totalAdminUnread: number;
  ticketId: string;
  messageId?: string;
  preview?: string;
  customerName?: string;
  ticketAdminUnread?: number;
  lastMessageAt?: string;
};

type SupportInboxState = {
  totalAdminUnread: number;
  hasSeededUnread: boolean;
  resetAdminUnreadSeed: () => void;
  seedTotalAdminUnread: (n: number) => void;
  setTotalAdminUnread: (n: number) => void;
  /** USER storefront — tổng ticket/tin chưa đọc (topbar + tab tài khoản). */
  storefrontSupportUnreadTotal: number;
  hasSeededStorefrontSupportUnread: boolean;
  seedStorefrontSupportUnreadTotal: (n: number) => void;
  setStorefrontSupportUnreadTotal: (n: number) => void;
  /** Tăng khi cần refetch danh sách (archive / restore / block…). */
  inboxListTick: number;
  bumpInboxList: () => void;
  lastMessageCreated: SupportInboxMessageCreatedClient | null;
  setLastMessageCreated: (p: SupportInboxMessageCreatedClient | null) => void;
};

export const useSupportInboxStore = create<SupportInboxState>((set) => ({
  totalAdminUnread: 0,
  hasSeededUnread: false,
  resetAdminUnreadSeed: () => set({ hasSeededUnread: false }),
  /** Chỉ seed khi chưa seed trong phiên hiện tại — Pusher là nguồn cập nhật sau đó. */
  seedTotalAdminUnread: (n) =>
    set((s) => {
      if (s.hasSeededUnread) return s;
      const v = Math.max(0, Math.floor(Number.isFinite(n) ? n : 0));
      return { totalAdminUnread: v, hasSeededUnread: true };
    }),
  setTotalAdminUnread: (n) =>
    set({ totalAdminUnread: Math.max(0, Math.floor(Number.isFinite(n) ? n : 0)), hasSeededUnread: true }),
  storefrontSupportUnreadTotal: 0,
  hasSeededStorefrontSupportUnread: false,
  seedStorefrontSupportUnreadTotal: (n) =>
    set((s) => {
      const v = Math.max(0, Math.floor(Number.isFinite(n) ? n : 0));
      if (s.hasSeededStorefrontSupportUnread && s.storefrontSupportUnreadTotal === v) return s;
      notifyStorefrontSupportUnreadUpdated(v);
      return { storefrontSupportUnreadTotal: v, hasSeededStorefrontSupportUnread: true };
    }),
  setStorefrontSupportUnreadTotal: (n) => {
    const v = Math.max(0, Math.floor(Number.isFinite(n) ? n : 0));
    set({
      storefrontSupportUnreadTotal: v,
      hasSeededStorefrontSupportUnread: true,
    });
    notifyStorefrontSupportUnreadUpdated(v);
  },
  inboxListTick: 0,
  bumpInboxList: () => set((s) => ({ inboxListTick: s.inboxListTick + 1 })),
  lastMessageCreated: null,
  setLastMessageCreated: (p) => set({ lastMessageCreated: p }),
}));
