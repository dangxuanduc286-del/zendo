"use client";

import Link from "next/link";

export function MobileAccountHeaderAction({
  isAuthenticated,
  myAccountHref,
}: {
  isAuthenticated: boolean;
  myAccountHref: string;
}): JSX.Element {
  void isAuthenticated;
  void myAccountHref;
  return (
    <Link
      href="/tai-khoan"
      aria-label="Tài khoản"
      data-mobile-account-action="account"
      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#E2E8F0] bg-white text-[#0F172A] shadow-sm transition hover:bg-[#F8FAFC] active:bg-[#F1F5F9]"
    >
      <svg viewBox="0 0 24 24" fill="none" className="h-[19px] w-[19px] shrink-0 text-[#64748B]" aria-hidden>
        <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.65" />
        <path
          d="M5 20v-1.2C5 16.3 7.9 15 12 15s7 1.3 7 3.8V20"
          stroke="currentColor"
          strokeWidth="1.65"
          strokeLinecap="round"
        />
      </svg>
    </Link>
  );
}

