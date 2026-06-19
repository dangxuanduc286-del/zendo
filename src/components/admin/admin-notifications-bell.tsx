"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type NotificationRow = {
  id: string;
  title: string;
  summary: string;
  categoryLabel: string;
  actorLabel: string | null;
  actionHref: string;
  createdAt: string;
  readAt: string | null;
};

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return iso;
  }
}

const POLL_MS = 30_000;

export function useAdminNotificationsUnreadPolling(
  initialCount: number,
  enabled: boolean,
  routeKey: string,
): [number, React.Dispatch<React.SetStateAction<number>>] {
  const [count, setCount] = useState(initialCount);

  const refresh = useCallback(async (disposedRef?: { current: boolean }): Promise<void> => {
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
      if (!disposedRef?.current && next != null) setCount(next);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    setCount(initialCount);
  }, [initialCount, enabled]);

  useEffect(() => {
    if (!enabled) return;
    const disposed = { current: false };
    void refresh(disposed);
    const id = window.setInterval(() => void refresh(disposed), POLL_MS);
    const onVis = () => void refresh(disposed);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      disposed.current = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [enabled, refresh, routeKey]);

  return [count, setCount];
}

export default function AdminNotificationsBell({
  initialUnreadCount = 0,
  enabled = true,
}: {
  initialUnreadCount?: number;
  enabled?: boolean;
}): JSX.Element {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useAdminNotificationsUnreadPolling(initialUnreadCount, enabled, pathname);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties | null>(null);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/notifications?limit=15", {
        credentials: "same-origin",
        cache: "no-store",
      });
      const j = (await res.json()) as { ok?: boolean; items?: NotificationRow[] };
      if (res.ok && j.ok && Array.isArray(j.items)) setItems(j.items);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void loadList();
  }, [open, loadList, unreadCount]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent): void {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const updatePosition = (): void => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const safeGap = 12;
      const panelWidth = Math.min(22 * 16, Math.max(18 * 16, viewportWidth - 24));
      const availableBelow = viewportHeight - rect.bottom - safeGap;
      const availableAbove = rect.top - safeGap;
      const openUpward = availableBelow < 320 && availableAbove > availableBelow;
      const maxHeight = Math.max(220, Math.min(520, (openUpward ? availableAbove : availableBelow) - 8));
      const left = Math.min(Math.max(safeGap, rect.right - panelWidth), viewportWidth - panelWidth - safeGap);
      const top = openUpward ? Math.max(safeGap, rect.top - safeGap) : rect.bottom + 8;
      const transformOrigin = openUpward ? "bottom right" : "top right";

      setPanelStyle({
        position: "fixed",
        left,
        top,
        width: panelWidth,
        maxWidth: `calc(100vw - ${safeGap * 2}px)`,
        maxHeight,
        transformOrigin,
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  async function markRead(id: string): Promise<void> {
    await fetch(`/api/admin/notifications/${id}/read`, {
      method: "POST",
      credentials: "same-origin",
    });
    setItems((prev) => prev.map((r) => (r.id === id ? { ...r, readAt: new Date().toISOString() } : r)));
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }

  async function markAllRead(): Promise<void> {
    await fetch("/api/admin/notifications/read-all", { method: "POST", credentials: "same-origin" });
    setItems((prev) => prev.map((r) => ({ ...r, readAt: r.readAt ?? new Date().toISOString() })));
    setUnreadCount(0);
  }

  const badge = unreadCount > 99 ? "99+" : unreadCount > 0 ? String(unreadCount) : null;
  const safePanelStyle = useMemo<React.CSSProperties | undefined>(() => panelStyle ?? undefined, [panelStyle]);

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        ref={triggerRef}
        type="button"
        aria-label={unreadCount > 0 ? `${unreadCount} thông báo chưa đọc` : "Thông báo quản trị"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-800 shadow-sm transition hover:bg-slate-50"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 3a5 5 0 0 1 5 5v3.5l1.5 2.5H5.5L7 11.5V8a5 5 0 0 1 5-5z" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M10 18.5a2 2 0 0 0 4 0" strokeLinecap="round" />
        </svg>
        {badge ? (
          <span className="absolute -right-1 -top-1 inline-flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#EF4444] px-1 text-[10px] font-bold text-white ring-2 ring-[#F8FAFC]">
            {badge}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          className="fixed z-[9999] flex max-w-[calc(100vw-16px)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl ring-1 ring-slate-900/5"
          style={safePanelStyle}
        >
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
            <p className="min-w-0 truncate text-sm font-bold text-slate-900">Thông báo</p>
            <button
              type="button"
              onClick={() => void markAllRead()}
              className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-50 hover:underline"
            >
              Đánh dấu đã đọc
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 py-1 [scrollbar-gutter:stable]">
            {loading && !items.length ? (
              <p className="px-3 py-6 text-center text-sm text-slate-500">Đang tải…</p>
            ) : null}
            {!loading && !items.length ? (
              <p className="px-3 py-6 text-center text-sm text-slate-500">Chưa có thông báo.</p>
            ) : null}
            {items.map((row) => (
              <Link
                key={row.id}
                href={row.actionHref}
                onClick={() => {
                  if (!row.readAt) void markRead(row.id);
                  setOpen(false);
                }}
                className={`block rounded-xl px-3 py-3 transition hover:bg-slate-50 ${
                  row.readAt ? "opacity-75" : "bg-sky-50/40"
                }`}
              >
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{row.categoryLabel}</p>
                  <p className="text-sm font-semibold leading-5 text-slate-900">{row.title}</p>
                  <p className="text-xs leading-5 text-slate-600">{row.summary}</p>
                  <p className="text-[11px] text-slate-400">{formatWhen(row.createdAt)}</p>
                </div>
              </Link>
            ))}
          </div>
          <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
            <Link
              href="/admin/collaborators?tab=lich-su"
              onClick={() => setOpen(false)}
              className="text-xs font-semibold text-sky-700 hover:underline"
            >
              Xem tất cả
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
