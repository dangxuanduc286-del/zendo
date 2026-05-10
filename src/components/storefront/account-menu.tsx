"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import { signOutAdminVoluntary } from "@/lib/admin-voluntary-signout-client";
import { useSession } from "next-auth/react";

interface AccountMenuProps {
  isAuthenticated: boolean;
  isAdmin: boolean;
  displayName?: string;
  myAccountHref: string;
  loginHref?: string;
}

export default function AccountMenu({
  isAuthenticated,
  isAdmin,
  displayName,
  myAccountHref,
  loginHref = "/tai-khoan",
}: AccountMenuProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const sessionState = useSession();
  const session = sessionState?.data;
  const preferredLabel = (
    session?.user?.name?.trim() ||
    displayName?.trim() ||
    // Some sessions keep phone in name field; fallback to email otherwise.
    session?.user?.email?.trim() ||
    "Tài khoản"
  ).trim();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", onPointerDown);
    return () => window.removeEventListener("mousedown", onPointerDown);
  }, [open, isAdmin, myAccountHref, isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <Link
        href={loginHref}
        className="inline-flex h-10 items-center rounded-xl border border-zinc-300 bg-white px-3.5 text-sm font-semibold text-zinc-700 shadow-sm transition hover:border-zinc-400 hover:text-zinc-900 sm:h-11 sm:px-4"
      >
        Đăng nhập
      </Link>
    );
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex h-10 max-w-[120px] items-center rounded-xl border border-zinc-300 bg-white px-3.5 text-sm font-semibold text-zinc-700 shadow-sm transition hover:border-zinc-400 hover:text-zinc-900 sm:h-11 sm:px-4"
        aria-label="Tài khoản"
        aria-expanded={open}
      >
        <span className="truncate">{preferredLabel}</span>
      </button>
      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-52 rounded-xl border border-zinc-200 bg-white p-2 shadow-lg">
          <Link
            href={myAccountHref}
            onClick={() => setOpen(false)}
            className="block rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-900"
          >
            Tài khoản của tôi
          </Link>
          <button
            type="button"
            disabled={isSigningOut}
            onClick={() => {
              setOpen(false);
              if (isSigningOut) return;
              setIsSigningOut(true);
              if (isAdmin) {
                signOutAdminVoluntary().catch(() => {
                  setIsSigningOut(false);
                });
                return;
              }
              signOut({ callbackUrl: "/" }).catch(() => {
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
