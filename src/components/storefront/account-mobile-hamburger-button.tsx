"use client";

import { usePathname } from "next/navigation";
import { useAccountMobileMenuStore } from "@/stores/accountMobileMenuStore";

export default function AccountMobileHamburgerButton(): JSX.Element | null {
  const pathname = usePathname() || "";
  const isAccount = pathname === "/tai-khoan" || pathname.startsWith("/tai-khoan/");
  const open = useAccountMobileMenuStore((s) => s.open);
  const toggle = useAccountMobileMenuStore((s) => s.toggle);

  if (!isAccount) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={open ? "Đóng menu tài khoản" : "Mở menu tài khoản"}
      aria-expanded={open}
      aria-controls="account-mobile-menu"
      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#E2E8F0] bg-white text-[#0F172A] shadow-sm transition hover:bg-[#F8FAFC] active:bg-[#F1F5F9] md:hidden"
    >
      <svg viewBox="0 0 24 24" fill="none" className="h-[19px] w-[19px] shrink-0 text-[#64748B]" aria-hidden>
        <path
          d="M5 7h14M5 12h14M5 17h14"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
}

