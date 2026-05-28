"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

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

export function useAdminNotificationsUnreadPolling(initialCount: number, enabled: boolean): number {
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    if (!enabled) return;
    setCount(initialCount);
  }, [initialCount, enabled]);

  useEffect(() => {
    if (!enabled) return;
    let disposed = false;

    async function refresh(): Promise<void> {
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
        if (!disposed && next != null) setCount(next);
      } catch {
        /* ignore */
      }
    }

    void refresh();
    const id = window.setInterval(() => void refresh(), POLL_MS);
    const onVis = () => void refresh();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      disposed = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [enabled]);

  return count;
}

export default function AdminNotificationsBell({
  initialUnreadCount = 0,
  enabled = true,
}: {
  initialUnreadCount?: number;
  enabled?: boolean;
}): JSX.Element {
  const unreadCount = useAdminNotificationsUnreadPolling(initialUnreadCount, enabled);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

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

  async function markRead(id: string): Promise<void> {
    await fetch(`/api/admin/notifications/${id}/read`, {
      method: "POST",
      credentials: "same-origin",
    });
    setItems((prev) => prev.map((r) => (r.id === id ? { ...r, readAt: new Date().toISOString() } : r)));
  }

  async function markAllRead(): Promise<void> {
    await fetch("/api/admin/notifications/read-all", { method: "POST", credentials: "same-origin" });
    setItems((prev) => prev.map((r) => ({ ...r, readAt: r.readAt ?? new Date().toISOString() })));
  }

  const badge = unreadCount > 99 ? "99+" : unreadCount > 0 ? String(unreadCount) : null;

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
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
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2.5">
            <p className="text-sm font-bold text-slate-900">Thông báo</p>
            <button
              type="button"
              onClick={() => void markAllRead()}
              className="text-xs font-semibold text-sky-700 hover:underline"
            >
              Đánh dấu đã đọc
            </button>
          </div>
          <div className="max-h-[min(24rem,60vh)] overflow-y-auto">
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
                className={`block border-b border-slate-50 px-3 py-2.5 transition hover:bg-slate-50 ${
                  row.readAt ? "opacity-75" : "bg-sky-50/40"
                }`}
              >
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{row.categoryLabel}</p>
                <p className="text-sm font-semibold text-slate-900">{row.title}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-slate-600">{row.summary}</p>
                <p className="mt-1 text-[11px] text-slate-400">{formatWhen(row.createdAt)}</p>
              </Link>
            ))}
          </div>
          <div className="border-t border-slate-100 px-3 py-2">
            <Link
              href="/admin/collaborators?tab=lich-su"
              onClick={() => setOpen(false)}
              className="text-xs font-semibold text-sky-700 hover:underline"
            >
              Xem lịch sử hoạt động →
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
