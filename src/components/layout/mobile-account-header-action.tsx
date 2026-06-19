"use client";

import Link from "next/link";
import { CircleUser } from "lucide-react";
import { useAdminNotificationsUnreadCount } from "@/lib/use-admin-notifications-unread-count";

function getAdminBadgeClass(label: string): string {
  if (label.length < 2) {
    return "pointer-events-none absolute right-[4px] top-[4px] z-20 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#EF4444] px-[5px] text-[10px] font-bold leading-none text-white shadow-[0_1px_4px_rgba(239,68,68,0.18)] md:right-[6px] md:top-[6px] md:h-[20px] md:min-w-[20px] md:px-[6px] md:text-[11px] xl:right-[8px] xl:top-[8px] xl:h-[22px] xl:min-w-[22px] xl:px-[7px] xl:text-[12px]";
  }

  return "pointer-events-none absolute right-[4px] top-[4px] z-20 inline-flex h-[18px] min-w-[22px] items-center justify-center rounded-full bg-[#EF4444] px-[6px] text-[10px] font-bold leading-none tracking-tight text-white shadow-[0_1px_4px_rgba(239,68,68,0.18)] md:right-[6px] md:top-[6px] md:h-[20px] md:min-w-[24px] md:px-[7px] md:text-[11px] xl:right-[8px] xl:top-[8px] xl:h-[22px] xl:min-w-[26px] xl:px-[8px] xl:text-[12px]";
}

export function MobileAccountHeaderAction({
  href,
  isAuthenticated,
  displayName,
  isAdmin,
}: {
  href: string;
  isAuthenticated: boolean;
  displayName?: string;
  isAdmin: boolean;
}): JSX.Element {
  const label = isAuthenticated ? displayName?.trim() || "Tài khoản" : "Đăng nhập";
  const adminUnreadCount = useAdminNotificationsUnreadCount(isAuthenticated && isAdmin);
  const adminBadgeLabel = adminUnreadCount > 99 ? "99+" : adminUnreadCount > 0 ? String(adminUnreadCount) : null;

  return (
    <Link
      href={href}
      prefetch
      aria-label={isAuthenticated ? `Tài khoản của ${label}` : "Đăng nhập tài khoản"}
      data-mobile-account-action="account"
      className="pointer-events-auto relative z-10 inline-flex h-10 min-w-10 max-w-[104px] cursor-pointer items-center justify-center gap-1.5 overflow-hidden rounded-xl border border-[#E2E8F0] bg-white px-2 text-[#0F172A] shadow-sm transition hover:border-[#2563EB] hover:bg-[#EFF6FF] hover:text-[#1D4ED8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/30 active:bg-[#DBEAFE]"
    >
      <CircleUser className="h-[22px] w-[22px] shrink-0 text-current" strokeWidth={2} aria-hidden />
      <span className="min-w-0 truncate text-[11px] font-semibold leading-none text-current">{label}</span>
      {adminBadgeLabel ? (
        <span className={getAdminBadgeClass(adminBadgeLabel)}>{adminBadgeLabel}</span>
      ) : null}
    </Link>
  );
}
