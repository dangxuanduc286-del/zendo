"use client";

import Link from "next/link";
import { CircleUser } from "lucide-react";

export function MobileAccountHeaderAction({
  href,
  isAuthenticated,
  displayName,
}: {
  href: string;
  isAuthenticated: boolean;
  displayName?: string;
}): JSX.Element {
  const label = isAuthenticated ? displayName?.trim() || "Tài khoản" : "Đăng nhập";

  return (
    <Link
      href={href}
      prefetch
      aria-label={isAuthenticated ? `Tài khoản của ${label}` : "Đăng nhập tài khoản"}
      data-mobile-account-action="account"
      className="pointer-events-auto relative z-10 inline-flex h-10 min-w-10 max-w-[104px] cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-[#E2E8F0] bg-white px-2 text-[#0F172A] shadow-sm transition hover:border-[#2563EB] hover:bg-[#EFF6FF] hover:text-[#1D4ED8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/30 active:bg-[#DBEAFE]"
    >
      <CircleUser className="h-[22px] w-[22px] shrink-0 text-current" strokeWidth={2} aria-hidden />
      <span className="min-w-0 truncate text-[11px] font-semibold leading-none text-current">{label}</span>
    </Link>
  );
}
