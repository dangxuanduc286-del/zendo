"use client";

import { useEffect, useRef, useState } from "react";

export type CustomerNotificationsPollBundle = {
  unread: number;
  groups: { order: number; promotion: number; system: number; commission: number };
  items: Array<{
    id: string;
    category: "order" | "promotion" | "system" | "commission";
    title: string;
    body: string;
    read: boolean;
    createdAt: string;
    actionHref: string | null;
    metadata?: Record<string, unknown> | null;
  }>;
};

type UnreadSummary = { unread: number; groups: CustomerNotificationsPollBundle["groups"] };

const POLL_ACTIVE_MS = 15_000;
const POLL_IDLE_MS = 60_000;

function sameSummary(a: UnreadSummary, b: UnreadSummary): boolean {
  return (
    a.unread === b.unread &&
    a.groups.order === b.groups.order &&
    a.groups.promotion === b.groups.promotion &&
    a.groups.system === b.groups.system &&
    a.groups.commission === b.groups.commission
  );
}

export function useCustomerNotificationsPoll(
  initial: CustomerNotificationsPollBundle,
  enabled: boolean,
  notificationsTabActive = false,
  affiliateCommissionRealtime = false,
): CustomerNotificationsPollBundle {
  const [state, setState] = useState(initial);
  const lastSummaryRef = useRef<UnreadSummary>({
    unread: initial.unread,
    groups: initial.groups,
  });

  useEffect(() => {
    setState(initial);
    lastSummaryRef.current = { unread: initial.unread, groups: initial.groups };
  }, [initial]);

  useEffect(() => {
    if (!enabled) return;

    let disposed = false;
    let intervalId: number | undefined;
    const abortRef = { current: undefined as AbortController | undefined };

    const schedule = (ms: number): void => {
      if (intervalId != null) window.clearInterval(intervalId);
      intervalId = window.setInterval(() => {
        void tick();
      }, ms);
    };

    async function fetchFull(signal: AbortSignal): Promise<void> {
      try {
        const res = await fetch("/api/account/notifications?take=60", {
          credentials: "same-origin",
          cache: "no-store",
          headers: { Accept: "application/json" },
          signal,
        });
        if (!res.ok) return;
        const data = (await res.json()) as CustomerNotificationsPollBundle | { message?: string };
        if (!data || typeof data !== "object" || !("items" in data) || !Array.isArray(data.items)) return;
        if (disposed) return;
        setState(data as CustomerNotificationsPollBundle);
        lastSummaryRef.current = {
          unread: (data as CustomerNotificationsPollBundle).unread,
          groups: (data as CustomerNotificationsPollBundle).groups,
        };
      } catch {
        /* giữ state — không crash notification center */
      }
    }

    async function fetchUnreadSummary(signal: AbortSignal): Promise<UnreadSummary | null> {
      try {
        const res = await fetch("/api/account/notifications/unread-summary", {
          credentials: "same-origin",
          cache: "no-store",
          headers: { Accept: "application/json" },
          signal,
        });
        if (!res.ok) return null;
        const j = (await res.json()) as Partial<UnreadSummary>;
        if (typeof j.unread !== "number" || !j.groups || typeof j.groups !== "object") return null;
        return {
          unread: j.unread,
          groups: {
            order: Number(j.groups.order ?? 0),
            promotion: Number(j.groups.promotion ?? 0),
            system: Number(j.groups.system ?? 0),
            commission: Number(j.groups.commission ?? 0),
          },
        };
      } catch {
        return null;
      }
    }

    async function tick(): Promise<void> {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;

      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      const signal = ac.signal;

      if (notificationsTabActive) {
        if (affiliateCommissionRealtime) {
          const summary = await fetchUnreadSummary(signal);
          if (disposed || signal.aborted) return;
          if (summary && !sameSummary(summary, lastSummaryRef.current)) {
            await fetchFull(signal);
          }
          return;
        }
        await fetchFull(signal);
        return;
      }

      await fetchFull(signal);
    }

    const pickInterval = (): number => {
      if (notificationsTabActive) return POLL_ACTIVE_MS;
      return POLL_IDLE_MS;
    };

    const onVis = (): void => {
      if (document.visibilityState === "visible") {
        void tick();
        schedule(pickInterval());
      } else if (intervalId != null) {
        window.clearInterval(intervalId);
        intervalId = undefined;
      }
    };

    schedule(pickInterval());
    void tick();
    document.addEventListener("visibilitychange", onVis);

    return () => {
      disposed = true;
      abortRef.current?.abort();
      if (intervalId != null) window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [enabled, notificationsTabActive, affiliateCommissionRealtime]);

  return enabled ? state : initial;
}
