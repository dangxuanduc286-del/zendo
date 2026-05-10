"use client";

import Link from "next/link";
import { signOutAdminVoluntary } from "@/lib/admin-voluntary-signout-client";
import { useEffect, useRef, useState } from "react";

interface StoreAdminMenuProps {
  myAccountHref: string;
  triggerClassName: string;
  menuClassName?: string;
}

export default function StoreAdminMenu({
  myAccountHref,
  triggerClassName,
  menuClassName = "right-0 mt-2 w-56",
}: StoreAdminMenuProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onEsc);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        className={triggerClassName}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Menu Admin"
        onClick={() => setOpen((prev) => !prev)}
      >
        <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4 shrink-0 text-blue-600">
          <path
            d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-3.33 0-6 1.67-6 3.75V20h12v-2.25C18 15.67 15.33 14 12 14Z"
            fill="currentColor"
          />
        </svg>
        <span>Admin</span>
        <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 text-slate-500" aria-hidden>
          <path d="M5.5 7.5 10 12l4.5-4.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      </button>

      {open ? (
        <div
          role="menu"
          className={`absolute z-50 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/15 ${menuClassName}`.trim()}
        >
          <Link
            href={myAccountHref}
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
          >
            Tài khoản của tôi
          </Link>
          <button
            type="button"
            role="menuitem"
            disabled={isSigningOut}
            onClick={() => {
              setOpen(false);
              if (isSigningOut) return;
              setIsSigningOut(true);
              signOutAdminVoluntary().catch(() => {
                setIsSigningOut(false);
              });
            }}
            className="mt-1 block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-rose-600 transition hover:bg-rose-50 disabled:opacity-60"
          >
            Đăng xuất
          </button>
        </div>
      ) : null}
    </div>
  );
}
