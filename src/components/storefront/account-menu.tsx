"use client";

import Link from "next/link";
import { CircleUser } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getSession, signOut, useSession } from "next-auth/react";
import { signOutAdminVoluntary } from "@/lib/admin-voluntary-signout-client";
import { useAdminNotificationsUnreadCount } from "@/lib/use-admin-notifications-unread-count";
import {
  fetchAuthSessionSnapshot,
  logAuthTrace,
} from "@/lib/auth-runtime-trace";

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
  const adminUnreadCount = useAdminNotificationsUnreadCount(isAuthenticated && isAdmin);
  const adminBadgeLabel = adminUnreadCount > 99 ? "99+" : adminUnreadCount > 0 ? String(adminUnreadCount) : null;
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
        className="inline-flex h-10 min-w-[118px] items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white px-3.5 text-sm font-semibold text-zinc-700 shadow-sm transition hover:border-[#2563EB] hover:bg-sky-50 hover:text-[#1D4ED8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/30 active:bg-sky-100 sm:h-11 sm:px-4"
        aria-label="Đăng nhập tài khoản"
      >
        <CircleUser className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden />
        <span className="truncate">Đăng nhập</span>
      </Link>
    );
  }

  return (
    <div ref={rootRef} className="relative">
      <div className="relative inline-flex overflow-visible">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="relative inline-flex h-10 min-w-[118px] max-w-[168px] cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-xl border border-zinc-300 bg-white px-3.5 pr-10 text-sm font-semibold text-zinc-700 shadow-sm transition hover:border-[#2563EB] hover:bg-sky-50 hover:text-[#1D4ED8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/30 active:bg-sky-100 sm:h-11 sm:max-w-[190px] sm:px-4 sm:pr-11"
          aria-label={`Tài khoản của ${preferredLabel}`}
          aria-expanded={open}
        >
          <CircleUser className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden />
          <span className="min-w-0 truncate">{preferredLabel}</span>
          {adminBadgeLabel ? (
            <span className="pointer-events-none absolute right-[6px] top-[6px] z-20 inline-flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#EF4444] px-1 text-[10px] font-bold leading-none text-white shadow-[0_2px_6px_rgba(239,68,68,0.28)] ring-2 ring-white sm:right-[7px] sm:top-[7px]">
              {adminBadgeLabel}
            </span>
          ) : null}
        </button>
      </div>
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
              void (async () => {
                setOpen(false);
                if (isSigningOut) return;
                setIsSigningOut(true);

                const beforeSnapshot = await fetchAuthSessionSnapshot();
                logAuthTrace("account-menu.signOut:before", {
                  isAdmin,
                  useSessionStatus: sessionState.status,
                  useSessionUserId: session?.user?.id ?? null,
                  getSessionUserId: (await getSession())?.user?.id ?? null,
                  serverSnapshot: beforeSnapshot,
                });

                try {
                  if (isAdmin) {
                    await signOutAdminVoluntary();
                    return;
                  }

                  // Giống production: redirect mặc định true → full navigation, không await sau redirect.
                  logAuthTrace("account-menu.signOut:customer-call", {
                    options: { callbackUrl: "/", redirectDefault: true },
                  });
                  await signOut({ callbackUrl: "/" });
                } catch (error) {
                  logAuthTrace("account-menu.signOut:error", {
                    message: error instanceof Error ? error.message : String(error),
                  });
                  setIsSigningOut(false);
                }
              })();
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
