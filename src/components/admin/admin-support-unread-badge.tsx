"use client";

import Pusher from "pusher-js";
import { useEffect, useLayoutEffect, useRef } from "react";

import { adminOrdersUnreadPollMs } from "@/lib/next-dev-stability";
import { safePusherDisconnect, safePusherUnsubscribe } from "@/lib/support-pusher-client-safe";
import { SUPPORT_ADMIN_INBOX_CHANNEL_NAME } from "@/lib/support-ticket-admin-inbox-channel";
import { hasPusherClientConfig } from "@/lib/support-dm-chat-channel";
import type { SupportAdminInboxPayload } from "@/lib/support-ticket-pusher";
import { useSupportInboxStore } from "@/stores/supportInboxStore";

const POLL_MS = adminOrdersUnreadPollMs();

/** Đồng bộ badge unread admin giữa các tab (cùng origin). */
const ADMIN_SUPPORT_DM_UNREAD_BROADCAST = "zendo.admin.support-dm.unread.v1";

/** CustomEvent trên `window` — AdminShell hiển thị toast (đã throttle ở hook). */
export const ADMIN_SUPPORT_NEW_MESSAGE_TOAST_EVENT = "zendo-admin-support-new-message-toast";

export type AdminSupportNewMessageToastDetail = {
  customerName?: string;
  preview?: string;
};

function parseInboxPayload(raw: unknown): SupportAdminInboxPayload | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const total = o.totalAdminUnread;
  const ticketId = o.ticketId;
  if (typeof total !== "number" || !Number.isFinite(total)) return null;
  if (typeof ticketId !== "string" || !ticketId.trim()) return null;
  const messageId = typeof o.messageId === "string" ? o.messageId.trim() : undefined;
  const preview = typeof o.preview === "string" ? o.preview : undefined;
  const customerName = typeof o.customerName === "string" ? o.customerName : undefined;
  const ticketAdminUnread =
    typeof o.ticketAdminUnread === "number" && Number.isFinite(o.ticketAdminUnread)
      ? Math.max(0, Math.floor(o.ticketAdminUnread))
      : undefined;
  const lastMessageAt = typeof o.lastMessageAt === "string" ? o.lastMessageAt : undefined;
  return {
    totalAdminUnread: Math.max(0, Math.floor(total)),
    ticketId: ticketId.trim(),
    ...(messageId ? { messageId } : {}),
    ...(preview ? { preview } : {}),
    ...(customerName ? { customerName } : {}),
    ...(ticketAdminUnread !== undefined ? { ticketAdminUnread } : {}),
    ...(lastMessageAt ? { lastMessageAt } : {}),
  };
}

export function AdminSupportUnreadBadgePill({ count }: { count: number }): JSX.Element | null {
  if (count <= 0) return null;

  const label = count > 99 ? "99+" : String(count);
  const aria =
    count > 99 ? "Hơn 99 tin nhắn hỗ trợ chưa đọc" : `${count} tin nhắn hỗ trợ chưa đọc`;

  return (
    <span
      role="status"
      aria-label={aria}
      title={aria}
      className={`inline-flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-[#EF4444] px-1.5 text-xs font-semibold tabular-nums leading-none text-white shadow-sm ring-1 ring-black/[0.06] motion-reduce:animate-none support-admin-unread-pulse`}
    >
      {label}
    </span>
  );
}

/**
 * Badge tổng tin chưa đọc (phía admin) + đồng bộ Pusher inbox (một kết nối).
 * Đồng bộ `useSupportInboxStore` để popup support dùng chung số unread.
 * Khi Pusher cấu hình: không poll nhanh; chỉ đồng bộ khi tab visible + interval dài (drift).
 */
export function useAdminSupportTicketUnreadPolling(initialCount: number, enabled: boolean): number {
  const toastThrottleRef = useRef(0);
  const totalAdminUnread = useSupportInboxStore((s) => s.totalAdminUnread);
  const hasSeededUnread = useSupportInboxStore((s) => s.hasSeededUnread);

  useLayoutEffect(() => {
    if (!enabled) {
      useSupportInboxStore.getState().resetAdminUnreadSeed();
      return;
    }
    useSupportInboxStore.getState().seedTotalAdminUnread(initialCount);
  }, [enabled, initialCount]);

  useEffect(() => {
    if (!enabled) return;

    let disposed = false;
    const setTotal = useSupportInboxStore.getState().setTotalAdminUnread;

    async function refresh(): Promise<void> {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      try {
        const res = await fetch("/api/admin/support-dm/unread-count", {
          credentials: "same-origin",
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        if (!res.ok) return;
        const data = (await res.json()) as { count?: unknown };
        const next =
          typeof data.count === "number" && Number.isFinite(data.count) ? Math.max(0, Math.floor(data.count)) : null;
        if (next !== null && !disposed) {
          setTotal(next);
        }
      } catch {
        /* giữ số hiện tại */
      }
    }

    const pusherOk = hasPusherClientConfig();
    const intervalMs = pusherOk ? 180_000 : POLL_MS;
    const intervalId = window.setInterval(refresh, intervalMs);
    const onVisibility = (): void => {
      if (document.visibilityState !== "visible") return;
      if (hasPusherClientConfig()) return;
      void refresh();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      disposed = true;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    if (!hasPusherClientConfig()) return;

    const key = process.env.NEXT_PUBLIC_PUSHER_KEY?.trim();
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER?.trim();
    if (!key || !cluster) return;

    let pusher: Pusher | null = null;
    try {
      pusher = new Pusher(key, {
        cluster,
        forceTLS: true,
        authEndpoint: "/api/pusher/auth",
      });
    } catch {
      return;
    }

    const ch = pusher.subscribe(SUPPORT_ADMIN_INBOX_CHANNEL_NAME);
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel(ADMIN_SUPPORT_DM_UNREAD_BROADCAST);
    } catch {
      bc = null;
    }
    const onBcMessage = (ev: MessageEvent): void => {
      const t = (ev.data as { total?: unknown } | undefined)?.total;
      if (typeof t !== "number" || !Number.isFinite(t)) return;
      useSupportInboxStore.getState().setTotalAdminUnread(Math.max(0, Math.floor(t)));
    };
    bc?.addEventListener("message", onBcMessage);

    const bump = useSupportInboxStore.getState().bumpInboxList;
    const setLast = useSupportInboxStore.getState().setLastMessageCreated;
    const setTotal = useSupportInboxStore.getState().setTotalAdminUnread;

    const pushTotal = (n: number): void => {
      const v = Math.max(0, Math.floor(Number.isFinite(n) ? n : 0));
      setTotal(v);
      try {
        bc?.postMessage({ total: v });
      } catch {
        /* ignore */
      }
    };

    const applyTotalFromRaw = (raw: unknown): void => {
      const p = parseInboxPayload(raw);
      if (p) pushTotal(p.totalAdminUnread);
    };

    const onInboxCountOnly = (raw: unknown): void => {
      applyTotalFromRaw(raw);
      bump();
    };

    const onCreated = (raw: unknown): void => {
      const p = parseInboxPayload(raw);
      if (p) {
        pushTotal(p.totalAdminUnread);
        setLast({
          totalAdminUnread: p.totalAdminUnread,
          ticketId: p.ticketId,
          messageId: p.messageId,
          preview: p.preview,
          customerName: p.customerName,
          ticketAdminUnread: p.ticketAdminUnread,
          lastMessageAt: p.lastMessageAt,
        });
        bump();
      } else {
        applyTotalFromRaw(raw);
      }
      const now = Date.now();
      if (now - toastThrottleRef.current < 3000) return;
      toastThrottleRef.current = now;
      try {
        const parsed = parseInboxPayload(raw);
        const detail: AdminSupportNewMessageToastDetail = {
          customerName: parsed?.customerName,
          preview: parsed?.preview,
        };
        window.dispatchEvent(new CustomEvent(ADMIN_SUPPORT_NEW_MESSAGE_TOAST_EVENT, { detail }));
      } catch {
        /* ignore */
      }
    };

    ch.bind("support.dm.message.created", onCreated);
    ch.bind("support.dm.inbox.totals", onInboxCountOnly);

    return () => {
      try {
        ch.unbind("support.dm.message.created", onCreated);
        ch.unbind("support.dm.inbox.totals", onInboxCountOnly);
        if (pusher) safePusherUnsubscribe(pusher, SUPPORT_ADMIN_INBOX_CHANNEL_NAME);
        safePusherDisconnect(pusher);
      } catch {
        /* ignore */
      }
      bc?.removeEventListener("message", onBcMessage);
      try {
        bc?.close();
      } catch {
        /* ignore */
      }
    };
  }, [enabled]);

  if (!enabled) return 0;
  return hasSeededUnread ? totalAdminUnread : initialCount;
}
