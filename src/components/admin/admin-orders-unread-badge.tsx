"use client";

import { useEffect, useState } from "react";

const POLL_MS = 20000;

function formatUnreadAria(count: number): string {
  if (count <= 0) return "";
  return count > 99 ? "Hơn 99 đơn chờ xác nhận" : `${count} đơn chờ xác nhận`;
}

/** Pill đỏ (Shopee-style) hiển thị số đơn `PENDING`; ẩn khi 0; “99+” khi > 99. */
export function AdminOrdersUnreadBadgePill({ count }: { count: number }): JSX.Element | null {
  if (count <= 0) return null;

  const label = count > 99 ? "99+" : String(count);

  return (
    <span
      role="status"
      aria-label={formatUnreadAria(count)}
      title={formatUnreadAria(count)}
      className="inline-flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-[#EF4444] px-[5px] text-[11px] font-semibold tabular-nums leading-none text-white shadow-sm ring-1 ring-black/[0.08]"
    >
      {label}
    </span>
  );
}

/**
 * Một nguồn polling cho toàn admin shell (desktop + mobile dùng chung state).
 * Chỉ setState khi `count` đổi → tránh re-render không cần thiết.
 * `enabled`: tắt khi không hiển thị sidebar (VD: `/admin/login`).
 */
export function useAdminOrdersUnreadPolling(initialCount: number, enabled: boolean): number {
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
        const res = await fetch("/api/admin/orders/unread-count", {
          credentials: "same-origin",
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        if (!res.ok) return;
        const data = (await res.json()) as { count?: unknown };
        const next =
          typeof data.count === "number" && Number.isFinite(data.count) ? Math.max(0, Math.floor(data.count)) : null;
        if (next !== null && !disposed) {
          setCount((prev) => (prev === next ? prev : next));
        }
      } catch {
        /* giữ số hiện tại */
      }
    }

    const intervalId = window.setInterval(refresh, POLL_MS);
    const onVisibility = (): void => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      disposed = true;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled]);

  return enabled ? count : 0;
}
