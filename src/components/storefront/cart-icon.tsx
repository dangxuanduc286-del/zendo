"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CART_STORAGE_KEY, CART_UPDATED_EVENT } from "../../lib/cart";
import { safeParseJson } from "../../lib/safe-json";

interface CartIconProps {
  withLabel?: boolean;
  className?: string;
}

function readCartCount(): number {
  if (typeof window === "undefined") return 0;

  const raw = window.localStorage.getItem(CART_STORAGE_KEY);
  if (!raw) return 0;

  const parsed = safeParseJson<Array<{ quantity?: number }>>(raw, [], "cart-icon:local-storage");
  if (!Array.isArray(parsed)) return 0;
  return parsed.reduce((sum, item) => sum + Math.max(1, Number(item.quantity ?? 1)), 0);
}

export default function CartIcon({
  withLabel = false,
  className = "",
}: CartIconProps): JSX.Element {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const updateCount = () => setCount(readCartCount());
    updateCount();

    const onStorageChange = (event: StorageEvent) => {
      if (event.key === CART_STORAGE_KEY) {
        updateCount();
      }
    };
    const onCartUpdated = () => updateCount();

    window.addEventListener("storage", onStorageChange);
    window.addEventListener(CART_UPDATED_EVENT, onCartUpdated);


    return () => {
      window.removeEventListener("storage", onStorageChange);
      window.removeEventListener(CART_UPDATED_EVENT, onCartUpdated);
    };
  }, []);

  const headerNavPill = Boolean(withLabel && className);
  const mobileIcon = Boolean(!withLabel && className);

  const linkClass = headerNavPill
    ? `relative inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap transition ${className}`
    : mobileIcon
      ? `relative inline-flex shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-700 transition hover:border-slate-300 hover:text-slate-900 ${className}`
      : `relative inline-flex h-10 items-center justify-center rounded-xl border border-zinc-300 px-2.5 text-sm font-semibold leading-none text-zinc-700 transition hover:border-zinc-400 hover:text-zinc-900 ${withLabel ? "gap-1.5 whitespace-nowrap" : "w-10"} ${className}`.trim();

  return (
    <Link
      href="/gio-hang"
      className={linkClass}
      aria-label="Giỏ hàng"
    >
      <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4 shrink-0">
        <path
          d="M3 4h2l2.2 9.1a2 2 0 0 0 2 1.5h7.8a2 2 0 0 0 2-1.6L21 7H7"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
        <circle cx="10" cy="19" r="1.5" fill="currentColor" />
        <circle cx="18" cy="19" r="1.5" fill="currentColor" />
      </svg>
      {withLabel ? <span>Giỏ hàng</span> : null}
      {count > 0 ? (
        <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-zinc-900 px-1 text-xs font-semibold text-white">
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Link>
  );
}
