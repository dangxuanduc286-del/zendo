"use client";

import type Pusher from "pusher-js";
import { useSession } from "next-auth/react";
import { useEffect, useRef } from "react";

import { fetchWithAuth, FetchUnauthorizedError } from "@/lib/fetchWithAuth";
import { isNextDevelopment, storefrontSupportUnreadPollMs } from "@/lib/next-dev-stability";
import {
  STOREFRONT_SUPPORT_BROADCAST,
  STOREFRONT_SUPPORT_BC_DEBOUNCE_MS,
} from "@/lib/storefront-support-sync";
import { acquireSupportStorefrontPusher, releaseSupportStorefrontPusher } from "@/lib/support-storefront-pusher-singleton";
import { hasPusherClientConfig, supportDmChatChannelName } from "@/lib/support-dm-chat-channel";
import { pusherConnectionActiveForOps, safePusherUnsubscribe } from "@/lib/support-pusher-client-safe";
import { useSupportInboxStore } from "@/stores/supportInboxStore";

const SUPPORT_UNREAD_RESUME_DEBOUNCE_MS = 500;

function storefrontSupportUnreadPollIntervalMs(): number {
  if (hasPusherClientConfig()) {
    return isNextDevelopment() ? 120_000 : 180_000;
  }
  return storefrontSupportUnreadPollMs();
}

type SupportUnreadRuntime = {
  timer: ReturnType<typeof setInterval> | null;
  inFlight: boolean;
  resumeTimer: ReturnType<typeof setTimeout> | null;
};

const supportUnreadRuntime: SupportUnreadRuntime = {
  timer: null,
  inFlight: false,
  resumeTimer: null,
};

/** Khi đang fetch, mọi bump Pusher/BC xếp thêm 1 lần refetch — tránh mất cập nhật. */
let pendingSupportUnreadFetch = false;

let storefrontUnreadSyncRefCount = 0;

let bcSingleton: BroadcastChannel | null = null;
let bcRefCount = 0;
let bcDebounceTimer: ReturnType<typeof setTimeout> | null = null;

let storefrontUnreadPusher: Pusher | null = null;
type TicketChannelBinding = {
  name: string;
  onBump: () => void;
};
let storefrontUnreadTicketBindings: TicketChannelBinding[] = [];
let lastDmConversationChannelKey = "";
let pusherResyncTimer: ReturnType<typeof setTimeout> | null = null;

let visibilityChangeCleanup: (() => void) | null = null;
let pusherConnectedHandler: (() => void) | null = null;

function isPollingPausedByMenu(): boolean {
  if (typeof window === "undefined") return false;
  const win = window as Window & { __ZENDO_MOBILE_MENU_OPEN__?: boolean };
  return Boolean(win.__ZENDO_MOBILE_MENU_OPEN__);
}

function emitSupportUnread(value: number): void {
  const n = Math.max(0, Math.floor(Number.isFinite(value) ? value : 0));
  useSupportInboxStore.getState().setStorefrontSupportUnreadTotal(n);
}

async function fetchSupportUnread(reason: string): Promise<void> {
  if (supportUnreadRuntime.inFlight) {
    pendingSupportUnreadFetch = true;
    return;
  }
  if (isPollingPausedByMenu()) {
    return;
  }

  supportUnreadRuntime.inFlight = true;
  try {
    const res = await fetchWithAuth("/api/account/support-dm/unread-count");
    let j: { ok?: boolean; total?: number; conversationId?: string | null };
    try {
      j = (await res.json()) as { ok?: boolean; total?: number; conversationId?: string | null };
    } catch {
      return;
    }
    if (!res.ok && (typeof j.total !== "number" || !Number.isFinite(j.total))) {
      return;
    }
    const n =
      typeof j.total === "number" && Number.isFinite(j.total) && j.total >= 0 ? Math.floor(j.total) : 0;
    emitSupportUnread(n);
    void reason;
    if (hasPusherClientConfig() && storefrontUnreadPusher) {
      void resubscribeStorefrontDmChannel(storefrontUnreadPusher, j.conversationId ?? null, "after-unread-fetch");
    }
  } catch (e) {
    if (e instanceof FetchUnauthorizedError) {
      emitSupportUnread(0);
    }
  } finally {
    supportUnreadRuntime.inFlight = false;
    if (pendingSupportUnreadFetch) {
      pendingSupportUnreadFetch = false;
      queueMicrotask(() => {
        void fetchSupportUnread("drain-pending");
      });
    }
  }
}

function scheduleSupportUnreadFromPusher(): void {
  if (pusherResyncTimer) clearTimeout(pusherResyncTimer);
  pusherResyncTimer = setTimeout(() => {
    pusherResyncTimer = null;
    void fetchSupportUnread("pusher-ticket-channel");
  }, STOREFRONT_SUPPORT_BC_DEBOUNCE_MS);
}

function unbindStorefrontTicketChannels(pusher: Pusher): void {
  for (const b of storefrontUnreadTicketBindings) {
    try {
      const ch = pusher.channel(b.name);
      if (ch) {
        ch.unbind("new-message", b.onBump);
        ch.unbind("seen-update", b.onBump);
      }
      safePusherUnsubscribe(pusher, b.name);
    } catch {
      /* ignore */
    }
  }
  storefrontUnreadTicketBindings = [];
}

async function resubscribeStorefrontDmChannel(
  pusher: Pusher,
  conversationId: string | null,
  reason: string,
): Promise<void> {
  void reason;
  try {
    const nextKey = conversationId?.trim() ?? "";
    if (nextKey === lastDmConversationChannelKey && storefrontUnreadTicketBindings.length === (nextKey ? 1 : 0)) {
      return;
    }
    lastDmConversationChannelKey = nextKey;

    unbindStorefrontTicketChannels(pusher);

    if (!nextKey) return;

    const onBump = (): void => {
      scheduleSupportUnreadFromPusher();
    };

    if (!pusherConnectionActiveForOps(pusher.connection)) return;
    const name = supportDmChatChannelName(nextKey);
    try {
      const ch = pusher.subscribe(name);
      ch.bind("new-message", onBump);
      ch.bind("seen-update", onBump);
      storefrontUnreadTicketBindings.push({ name, onBump });
    } catch {
      /* ignore */
    }
  } catch {
    /* ignore */
  }
}

function startStorefrontUnreadPusher(): void {
  if (!hasPusherClientConfig()) return;
  if (storefrontUnreadPusher) {
    void (async () => {
      const res = await fetchWithAuth("/api/account/support-dm/unread-count");
      try {
        const j = (await res.json()) as { conversationId?: string | null };
        void resubscribeStorefrontDmChannel(storefrontUnreadPusher!, j.conversationId ?? null, "pusher-restart");
      } catch {
        void resubscribeStorefrontDmChannel(storefrontUnreadPusher!, null, "pusher-restart");
      }
    })();
    return;
  }
  const pusher = acquireSupportStorefrontPusher();
  if (!pusher) return;
  storefrontUnreadPusher = pusher;

  pusherConnectedHandler = (): void => {
    if (!storefrontUnreadPusher) return;
    void (async () => {
      const res = await fetchWithAuth("/api/account/support-dm/unread-count");
      try {
        const j = (await res.json()) as { conversationId?: string | null };
        void resubscribeStorefrontDmChannel(storefrontUnreadPusher, j.conversationId ?? null, "pusher-connected");
      } catch {
        void resubscribeStorefrontDmChannel(storefrontUnreadPusher, null, "pusher-connected");
      }
    })();
  };
  storefrontUnreadPusher.connection.bind("connected", pusherConnectedHandler);

  void (async () => {
    const res = await fetchWithAuth("/api/account/support-dm/unread-count");
    try {
      const j = (await res.json()) as { conversationId?: string | null };
      void resubscribeStorefrontDmChannel(storefrontUnreadPusher, j.conversationId ?? null, "pusher-start");
    } catch {
      void resubscribeStorefrontDmChannel(storefrontUnreadPusher, null, "pusher-start");
    }
  })();
}

function stopStorefrontUnreadPusher(): void {
  if (pusherResyncTimer) {
    clearTimeout(pusherResyncTimer);
    pusherResyncTimer = null;
  }
  if (!storefrontUnreadPusher) {
    lastDmConversationChannelKey = "";
    pusherConnectedHandler = null;
    return;
  }
  try {
    if (pusherConnectedHandler) {
      storefrontUnreadPusher.connection.unbind("connected", pusherConnectedHandler);
      pusherConnectedHandler = null;
    }
    unbindStorefrontTicketChannels(storefrontUnreadPusher);
  } catch {
    /* ignore */
  }
  storefrontUnreadPusher = null;
  releaseSupportStorefrontPusher();
  lastDmConversationChannelKey = "";
}

function onBroadcastMessage(): void {
  if (bcDebounceTimer) clearTimeout(bcDebounceTimer);
  bcDebounceTimer = setTimeout(() => {
    bcDebounceTimer = null;
    if (isPollingPausedByMenu()) {
      if (supportUnreadRuntime.resumeTimer) clearTimeout(supportUnreadRuntime.resumeTimer);
      supportUnreadRuntime.resumeTimer = setTimeout(() => {
        supportUnreadRuntime.resumeTimer = null;
        void fetchSupportUnread("resumeAfterMenuClose");
      }, SUPPORT_UNREAD_RESUME_DEBOUNCE_MS);
      return;
    }
    void fetchSupportUnread("broadcast");
  }, STOREFRONT_SUPPORT_BC_DEBOUNCE_MS);
}

function acquireSupportUnreadBroadcast(): void {
  bcRefCount++;
  if (typeof BroadcastChannel === "undefined") return;
  if (bcSingleton) return;
  bcSingleton = new BroadcastChannel(STOREFRONT_SUPPORT_BROADCAST);
  bcSingleton.onmessage = onBroadcastMessage;
}

function releaseSupportUnreadBroadcast(): void {
  bcRefCount = Math.max(0, bcRefCount - 1);
  if (bcRefCount > 0) return;
  if (bcDebounceTimer) {
    clearTimeout(bcDebounceTimer);
    bcDebounceTimer = null;
  }
  if (bcSingleton) {
    try {
      bcSingleton.close();
    } catch {
      /* ignore */
    }
    bcSingleton = null;
  }
}

function ensureSupportUnreadPolling(): void {
  if (supportUnreadRuntime.timer != null) return;
  const intervalMs = storefrontSupportUnreadPollIntervalMs();
  supportUnreadRuntime.timer = setInterval(() => {
    void fetchSupportUnread("interval");
  }, intervalMs);
}

function stopSupportUnreadPolling(): void {
  if (supportUnreadRuntime.timer) {
    clearInterval(supportUnreadRuntime.timer);
    supportUnreadRuntime.timer = null;
  }
  if (supportUnreadRuntime.resumeTimer) {
    clearTimeout(supportUnreadRuntime.resumeTimer);
    supportUnreadRuntime.resumeTimer = null;
  }
}

function attachVisibilityCatchUp(): void {
  if (typeof document === "undefined" || visibilityChangeCleanup) return;
  const onVisibility = (): void => {
    if (document.visibilityState === "visible") void fetchSupportUnread("visibility");
  };
  document.addEventListener("visibilitychange", onVisibility);
  visibilityChangeCleanup = (): void => {
    document.removeEventListener("visibilitychange", onVisibility);
    visibilityChangeCleanup = null;
  };
}

function detachVisibilityCatchUp(): void {
  if (visibilityChangeCleanup) visibilityChangeCleanup();
}

function startStorefrontUnreadGlobalSync(): void {
  pendingSupportUnreadFetch = false;
  ensureSupportUnreadPolling();
  void fetchSupportUnread("mount");
  acquireSupportUnreadBroadcast();
  startStorefrontUnreadPusher();
  attachVisibilityCatchUp();
}

function stopStorefrontUnreadGlobalSync(): void {
  pendingSupportUnreadFetch = false;
  stopSupportUnreadPolling();
  releaseSupportUnreadBroadcast();
  stopStorefrontUnreadPusher();
  detachVisibilityCatchUp();
}

/**
 * Khởi chạy sync unread (poll nhẹ + Pusher ticket + BC) — không subscribe Zustand.
 * Dùng cùng {@link useSupportInboxStore}((s) => s.storefrontSupportUnreadTotal) ở component.
 */
export function useStorefrontSupportUnreadSync(enabled: boolean): void {
  const { status, data: session } = useSession();
  const bootedRef = useRef(false);

  useEffect(() => {
    const ok = enabled && status === "authenticated" && session?.user?.role === "USER";
    if (!ok) {
      if (bootedRef.current) {
        storefrontUnreadSyncRefCount = Math.max(0, storefrontUnreadSyncRefCount - 1);
        bootedRef.current = false;
        if (storefrontUnreadSyncRefCount === 0) {
          stopStorefrontUnreadGlobalSync();
          useSupportInboxStore.getState().setStorefrontSupportUnreadTotal(0);
        }
      }
      return;
    }

    if (!bootedRef.current) {
      bootedRef.current = true;
      storefrontUnreadSyncRefCount += 1;
      if (storefrontUnreadSyncRefCount === 1) {
        startStorefrontUnreadGlobalSync();
      } else {
        void fetchSupportUnread("consumer-join");
      }
    }

    return () => {
      if (!bootedRef.current) return;
      bootedRef.current = false;
      storefrontUnreadSyncRefCount = Math.max(0, storefrontUnreadSyncRefCount - 1);
      if (storefrontUnreadSyncRefCount === 0) {
        stopStorefrontUnreadGlobalSync();
        useSupportInboxStore.getState().setStorefrontSupportUnreadTotal(0);
      }
    };
  }, [enabled, status, session?.user?.role]);
}

/**
 * Tổng ticket/tin chưa đọc (USER storefront). Đồng bộ {@link useSupportInboxStore} + BroadcastChannel;
 * khi có Pusher: subscribe `new-message` / `seen-update` / … trên kênh `private-support-ticket-*` (cùng payload realtime với SupportPanel).
 */
export function useStorefrontSupportUnreadTotal(enabled: boolean): number {
  useStorefrontSupportUnreadSync(enabled);
  return useSupportInboxStore((s) => s.storefrontSupportUnreadTotal);
}
