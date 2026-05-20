"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { customerNotificationsPollMs } from "@/lib/next-dev-stability";

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

export type CustomerNotificationPollMutators = {
  removeIds: (ids: string[]) => void;
  markReadIds: (ids: string[]) => void;
  replaceBundle: (bundle: CustomerNotificationsPollBundle) => void;
  reload: () => Promise<void>;
};

type UnreadSummary = { unread: number; groups: CustomerNotificationsPollBundle["groups"] };

function sameSummary(a: UnreadSummary, b: UnreadSummary): boolean {
  return (
    a.unread === b.unread &&
    a.groups.order === b.groups.order &&
    a.groups.promotion === b.groups.promotion &&
    a.groups.system === b.groups.system &&
    a.groups.commission === b.groups.commission
  );
}

function recomputeFromItems(items: CustomerNotificationsPollBundle["items"]): Pick<CustomerNotificationsPollBundle, "unread" | "groups"> {
  const groups = { order: 0, promotion: 0, system: 0, commission: 0 };
  let unread = 0;
  for (const item of items) {
    if (item.read) continue;
    unread++;
    if (item.category === "order") groups.order++;
    else if (item.category === "promotion") groups.promotion++;
    else if (item.category === "system") groups.system++;
    else groups.commission++;
  }
  return { unread, groups };
}

export function useCustomerNotificationsPoll(
  initial: CustomerNotificationsPollBundle,
  enabled: boolean,
  notificationsTabActive = false,
  affiliateCommissionRealtime = false,
): [CustomerNotificationsPollBundle, CustomerNotificationPollMutators] {
  const [state, setState] = useState(initial);
  const lastSummaryRef = useRef<UnreadSummary>({
    unread: initial.unread,
    groups: initial.groups,
  });
  const notificationsTabActiveRef = useRef(notificationsTabActive);
  notificationsTabActiveRef.current = notificationsTabActive;

  useEffect(() => {
    setState(initial);
    lastSummaryRef.current = { unread: initial.unread, groups: initial.groups };
  }, [initial]);

  const removeIds = useCallback((ids: string[]) => {
    const idSet = new Set(ids);
    setState((prev) => {
      const items = prev.items.filter((i) => !idSet.has(i.id));
      return { items, ...recomputeFromItems(items) };
    });
  }, []);

  const markReadIds = useCallback((ids: string[]) => {
    const idSet = new Set(ids);
    setState((prev) => {
      const items = prev.items.map((i) => (idSet.has(i.id) ? { ...i, read: true } : i));
      return { items, ...recomputeFromItems(items) };
    });
  }, []);

  const replaceBundle = useCallback((bundle: CustomerNotificationsPollBundle) => {
    setState(bundle);
    lastSummaryRef.current = { unread: bundle.unread, groups: bundle.groups };
  }, []);

  const reload = useCallback(async () => {
    try {
      const res = await fetch("/api/account/notifications?take=60", {
        credentials: "same-origin",
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) return;
      const data = (await res.json()) as CustomerNotificationsPollBundle | { message?: string };
      if (!data || typeof data !== "object" || !("items" in data) || !Array.isArray(data.items)) return;
      const bundle = data as CustomerNotificationsPollBundle;
      setState(bundle);
      lastSummaryRef.current = { unread: bundle.unread, groups: bundle.groups };
    } catch {
      /* noop */
    }
  }, []);

  const noopMutators = useMemo<CustomerNotificationPollMutators>(
    () => ({
      removeIds: () => {},
      markReadIds: () => {},
      replaceBundle: () => {},
      reload: async () => {},
    }),
    [],
  );

  const mutators = useMemo<CustomerNotificationPollMutators>(
    () => ({
      removeIds,
      markReadIds,
      replaceBundle,
      reload,
    }),
    [removeIds, markReadIds, replaceBundle, reload],
  );

  useEffect(() => {
    if (!enabled) return;

    let disposed = false;
    let intervalId: number | undefined;
    const abortRef = { current: undefined as AbortController | undefined };
    let tickInFlight = false;

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
        const bundle = data as CustomerNotificationsPollBundle;
        setState(bundle);
        lastSummaryRef.current = {
          unread: bundle.unread,
          groups: bundle.groups,
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
      if (tickInFlight) return;
      tickInFlight = true;

      try {
        abortRef.current?.abort();
        const ac = new AbortController();
        abortRef.current = ac;
        const signal = ac.signal;

        if (notificationsTabActiveRef.current) {
          await fetchFull(signal);
          return;
        }

        const summary = await fetchUnreadSummary(signal);
        if (disposed || signal.aborted) return;
        if (summary && !sameSummary(summary, lastSummaryRef.current)) {
          lastSummaryRef.current = summary;
          if (affiliateCommissionRealtime) {
            await fetchFull(signal);
          } else {
            setState((prev) => ({ ...prev, unread: summary.unread, groups: summary.groups }));
          }
        }
      } finally {
        tickInFlight = false;
      }
    }

    const pickInterval = (): number => customerNotificationsPollMs(notificationsTabActiveRef.current);

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
  }, [enabled, affiliateCommissionRealtime]);

  const bundle = enabled ? state : initial;
  return [bundle, enabled ? mutators : noopMutators];
}
