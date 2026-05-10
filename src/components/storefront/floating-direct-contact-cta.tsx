"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useStorefrontSupportUnreadTotal } from "../../lib/use-storefront-support-unread-total";

const CHAT_PATH = "/chat";
const ACCOUNT_LOGIN_HREF = `/tai-khoan?callbackUrl=${encodeURIComponent(CHAT_PATH)}`;

export default function FloatingDirectContactCta(): JSX.Element {
  const { data: session, status } = useSession();
  const isStorefrontCustomer = status === "authenticated" && session?.user?.role === "USER";
  const unreadTotal = useStorefrontSupportUnreadTotal(isStorefrontCustomer);

  const href = isStorefrontCustomer ? CHAT_PATH : ACCOUNT_LOGIN_HREF;
  const showBadge = isStorefrontCustomer && unreadTotal > 0;
  const badgeLabel = unreadTotal > 99 ? "99+" : String(unreadTotal);

  return (
    <aside className="pointer-events-none fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-2 z-40 flex max-w-[calc(100vw-1rem)] justify-end sm:right-4 sm:max-w-[calc(100vw-2rem)] lg:bottom-[max(1.25rem,env(safe-area-inset-bottom))]">
      <Link
        href={href}
        aria-label={
          showBadge
            ? `Liên hệ trực tiếp — ${unreadTotal > 99 ? "hơn 99" : unreadTotal} tin ticket chưa đọc`
            : "Liên hệ trực tiếp — Ticket hỗ trợ"
        }
        className="pointer-events-auto relative inline-flex max-w-full min-w-0 items-center justify-center rounded-2xl border border-slate-200/90 bg-white/95 px-3 py-2 text-xs font-semibold leading-tight text-[#0F172A] shadow-md shadow-slate-900/10 ring-1 ring-slate-900/[0.06] backdrop-blur-sm transition hover:border-[#93C5FD] hover:bg-[#F8FAFC] hover:text-[#1D4ED8] hover:shadow-lg sm:px-4 sm:py-2.5 sm:text-sm"
      >
        <span className="min-w-0 truncate pr-0.5">Liên hệ trực tiếp</span>
        {showBadge ? (
          <span className="absolute -right-1 -top-1 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-amber-100 px-0.5 text-[10px] font-bold tabular-nums text-amber-950 ring-1 ring-rose-300/90">
            {badgeLabel}
          </span>
        ) : null}
      </Link>
    </aside>
  );
}
