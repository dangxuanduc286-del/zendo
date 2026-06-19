"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";

const POLL_MS = 30_000;
const ADMIN_ROLES = new Set(["SUPER_ADMIN", "ADMIN", "CONTENT_MANAGER"]);

function isAdminRole(role: unknown): boolean {
  return typeof role === "string" && ADMIN_ROLES.has(role);
}

export function useAdminNotificationsUnreadCount(enabled = true): number {
  const { status, data: session } = useSession();
  const isAdmin = status === "authenticated" && isAdminRole(session?.user?.role);
  const [count, setCount] = useState(0);
  const countRef = useRef(0);

  const refresh = useCallback(async (disposedRef?: { current: boolean }): Promise<void> => {
    if (!enabled || !isAdmin) return;
    if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
    try {
      const res = await fetch("/api/admin/notifications/unread-count", {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as { count?: unknown };
      const next =
        typeof data.count === "number" && Number.isFinite(data.count) ? Math.max(0, Math.floor(data.count)) : null;
      if (disposedRef?.current || next == null) return;
      if (next !== countRef.current) {
        countRef.current = next;
        setCount(next);
      }
    } catch {
      /* ignore */
    }
  }, [enabled, isAdmin]);

  useEffect(() => {
    if (!enabled || !isAdmin) {
      countRef.current = 0;
      setCount(0);
      return;
    }
    void refresh();
    const disposed = { current: false };
    const id = window.setInterval(() => void refresh(disposed), POLL_MS);
    const onVis = () => void refresh(disposed);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      disposed.current = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [enabled, isAdmin, refresh]);

  return isAdmin ? count : 0;
}
