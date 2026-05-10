"use client";

import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";

import { fetchWithAuth } from "@/lib/fetchWithAuth";
import {
  STOREFRONT_SUPPORT_BROADCAST,
  STOREFRONT_SUPPORT_BC_DEBOUNCE_MS,
} from "@/lib/storefront-support-sync";

const SUPPORT_UNREAD_POLL_INTERVAL_MS = 30_000;
const SUPPORT_UNREAD_RESUME_DEBOUNCE_MS = 500;

type SupportUnreadStore = {
  total: number;
  listeners: Set<(value: number) => void>;
  timer: ReturnType<typeof setInterval> | null;
  inFlight: boolean;
  lastFetchedAt: number;
  resumeTimer: ReturnType<typeof setTimeout> | null;
};

const supportUnreadStore: SupportUnreadStore = {
  total: 0,
  listeners: new Set(),
  timer: null,
  inFlight: false,
  lastFetchedAt: 0,
  resumeTimer: null,
};

function isPollingPausedByMenu(): boolean {
  if (typeof window === "undefined") return false;
  const win = window as Window & { __ZENDO_MOBILE_MENU_OPEN__?: boolean };
  return Boolean(win.__ZENDO_MOBILE_MENU_OPEN__);
}

function emitSupportUnread(value: number): void {
  supportUnreadStore.total = value;
  supportUnreadStore.listeners.forEach((listener) => {
    listener(value);
  });
}

async function fetchSupportUnread(runId: string, reason: string): Promise<void> {
  if (supportUnreadStore.inFlight) {
    return;
  }
  if (isPollingPausedByMenu()) {
    return;
  }

  supportUnreadStore.inFlight = true;
  try {
    const res = await fetchWithAuth("/api/account/support-tickets/unread-count");
    const j = (await res.json()) as { ok?: boolean; total?: number };
    const n =
      typeof j.total === "number" && Number.isFinite(j.total) && j.total >= 0 ? Math.floor(j.total) : 0;
    emitSupportUnread(n);
    supportUnreadStore.lastFetchedAt = Date.now();
    void runId;
    void reason;
  } catch {
    emitSupportUnread(0);
  } finally {
    supportUnreadStore.inFlight = false;
  }
}

function ensureSupportUnreadPolling(runId: string): void {
  if (supportUnreadStore.timer != null) return;
  supportUnreadStore.timer = setInterval(() => {
    void fetchSupportUnread(runId, "interval");
  }, SUPPORT_UNREAD_POLL_INTERVAL_MS);
}

function stopSupportUnreadPolling(): void {
  if (supportUnreadStore.timer) {
    clearInterval(supportUnreadStore.timer);
    supportUnreadStore.timer = null;
  }
  if (supportUnreadStore.resumeTimer) {
    clearTimeout(supportUnreadStore.resumeTimer);
    supportUnreadStore.resumeTimer = null;
  }
}

/** Tổng ticket chưa đọc (USER storefront), đồng bộ BroadcastChannel với nút Hỗ trợ header. */
export function useStorefrontSupportUnreadTotal(enabled: boolean): number {
  const { status, data: session } = useSession();
  const [unreadTotal, setUnreadTotal] = useState(supportUnreadStore.total);
  const bcDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runIdRef = useRef(`support-unread-${Date.now()}`);

  useEffect(() => {
    if (!enabled || status !== "authenticated" || session?.user?.role !== "USER") {
      setUnreadTotal(0);
      supportUnreadStore.listeners.delete(setUnreadTotal);
      if (supportUnreadStore.listeners.size === 0) {
        stopSupportUnreadPolling();
      }
      return;
    }
    const runId = runIdRef.current;
    supportUnreadStore.listeners.add(setUnreadTotal);
    setUnreadTotal(supportUnreadStore.total);
    ensureSupportUnreadPolling(runId);
    void fetchSupportUnread(runId, "mount");
    if (typeof BroadcastChannel === "undefined") {
      return () => {
        supportUnreadStore.listeners.delete(setUnreadTotal);
        if (supportUnreadStore.listeners.size === 0) stopSupportUnreadPolling();
      };
    }
    const bc = new BroadcastChannel(STOREFRONT_SUPPORT_BROADCAST);
    bc.onmessage = () => {
      if (bcDebounceRef.current) clearTimeout(bcDebounceRef.current);
      bcDebounceRef.current = setTimeout(() => {
        bcDebounceRef.current = null;
        if (isPollingPausedByMenu()) {
          if (supportUnreadStore.resumeTimer) clearTimeout(supportUnreadStore.resumeTimer);
          supportUnreadStore.resumeTimer = setTimeout(() => {
            supportUnreadStore.resumeTimer = null;
            void fetchSupportUnread(runId, "resumeAfterMenuClose");
          }, SUPPORT_UNREAD_RESUME_DEBOUNCE_MS);
          return;
        }
        void fetchSupportUnread(runId, "broadcast");
      }, STOREFRONT_SUPPORT_BC_DEBOUNCE_MS);
    };
    return () => {
      if (bcDebounceRef.current) clearTimeout(bcDebounceRef.current);
      bcDebounceRef.current = null;
      supportUnreadStore.listeners.delete(setUnreadTotal);
      if (supportUnreadStore.listeners.size === 0) {
        stopSupportUnreadPolling();
      }
      try {
        bc.close();
      } catch {
        /* ignore */
      }
    };
  }, [enabled, status, session?.user?.role]);

  return unreadTotal;
}
