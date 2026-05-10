"use client";

import { useSession } from "next-auth/react";
import { useCallback, type MouseEvent } from "react";
import { useSupportPanel } from "@/components/support/storefront-support-provider";
import { useStorefrontSupportUnreadTotal } from "@/lib/use-storefront-support-unread-total";
import { formatSupportUnreadBadge } from "@/lib/storefront-support-sync";

function ChatBubbleIcon({ className }: { className?: string }): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M12 3C7.03 3 3 6.58 3 11c0 1.63.58 3.13 1.56 4.38L3.8 19.2a1 1 0 0 0 1.2 1.2l3.82-.76A8.96 8.96 0 0 0 12 19c4.97 0 9-3.58 9-8s-4.03-8-9-8Z"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinejoin="round"
      />
      <circle cx="9" cy="11" r="1.1" fill="currentColor" />
      <circle cx="12" cy="11" r="1.1" fill="currentColor" />
      <circle cx="15" cy="11" r="1.1" fill="currentColor" />
    </svg>
  );
}

export type TopbarSupportButtonVariant = "headerPill" | "megaMenu" | "mobileTile";
export type TopbarSupportButtonPresentation = "default" | "iconOnly";

export function TopbarSupportButton({
  className = "",
  variant = "headerPill",
  presentation = "default",
  onClick,
}: {
  className?: string;
  variant?: TopbarSupportButtonVariant;
  presentation?: TopbarSupportButtonPresentation;
  onClick?: () => void;
}): JSX.Element {
  const { status, data: session } = useSession();
  const supportPanel = useSupportPanel();
  const unreadTotal = useStorefrontSupportUnreadTotal(true);

  const handleOpenChat = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      onClick?.();
      supportPanel.toggle();
    },
    [onClick, supportPanel],
  );

  const showUnreadBadge = status === "authenticated" && session?.user?.role === "USER" && unreadTotal > 0;
  const badgeText = formatSupportUnreadBadge(unreadTotal);
  const ariaLabel =
    status === "authenticated"
      ? showUnreadBadge
        ? `Hỗ trợ — ${unreadTotal > 99 ? "hơn 99" : unreadTotal} tin chưa đọc`
        : "Hỗ trợ — mở chat"
      : "Hỗ trợ — mở chat (đăng nhập trong khung chat nếu cần)";

  const iconClassMega = "h-5 w-5 shrink-0 text-zinc-600 sm:h-5 sm:w-5";
  const iconClassTile = "h-5 w-5 shrink-0 text-[#2563EB]";
  const iconClassHeader = "h-5 w-5 shrink-0 text-[#64748B] sm:h-6 sm:w-6";

  if (variant === "mobileTile") {
    return (
      <button
        type="button"
        data-support-panel-trigger
        aria-label={ariaLabel}
        aria-expanded={supportPanel.open}
        onClick={handleOpenChat}
        className={`relative z-[9999] pointer-events-auto block min-h-[44px] rounded-xl border border-[#E2E8F0] bg-white px-3 py-2.5 text-sm font-semibold text-[#0F172A] transition hover:bg-[#F8FAFC] ${className}`}
      >
        <span className="flex min-w-0 items-center justify-center gap-1.5">
          <ChatBubbleIcon className={iconClassTile} />
          <span className="min-w-0 truncate">Hỗ trợ</span>
        </span>
        {showUnreadBadge ? (
          <span className="absolute -right-0.5 -top-0.5 inline-flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold tabular-nums text-white ring-2 ring-white">
            {badgeText}
          </span>
        ) : null}
      </button>
    );
  }

  if (variant === "megaMenu") {
    return (
      <button
        type="button"
        data-support-panel-trigger
        aria-label={ariaLabel}
        aria-expanded={supportPanel.open}
        onClick={handleOpenChat}
        className={`relative z-[9999] pointer-events-auto inline-flex min-h-[40px] items-center gap-1.5 rounded-md px-3 py-2 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100 hover:text-zinc-900 ${className}`}
      >
        <ChatBubbleIcon className={iconClassMega} />
        <span>Hỗ trợ</span>
        {showUnreadBadge ? (
          <span className="absolute -right-0.5 -top-0.5 inline-flex min-h-[16px] min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-0.5 text-[9px] font-bold tabular-nums text-white ring-2 ring-white">
            {badgeText}
          </span>
        ) : null}
      </button>
    );
  }

  if (presentation === "iconOnly") {
    return (
      <button
        type="button"
        data-support-panel-trigger
        aria-label={ariaLabel}
        aria-expanded={supportPanel.open}
        onClick={handleOpenChat}
        className={`relative z-[9999] pointer-events-auto inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#E2E8F0] bg-white text-[#0F172A] shadow-sm transition hover:bg-[#F8FAFC] active:bg-[#F1F5F9] ${className}`}
      >
        <ChatBubbleIcon className="h-[19px] w-[19px] shrink-0 text-[#64748B]" />
        {showUnreadBadge ? (
          <span className="absolute -right-0.5 -top-0.5 inline-flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold tabular-nums text-white ring-2 ring-white">
            {badgeText}
          </span>
        ) : null}
      </button>
    );
  }

  return (
    <button
      type="button"
      data-support-panel-trigger
      aria-label={ariaLabel}
      aria-expanded={supportPanel.open}
      onClick={handleOpenChat}
      className={`relative z-[9999] pointer-events-auto inline-flex max-w-full min-h-[44px] min-w-0 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-[var(--z-border)] bg-[var(--z-card)] px-2.5 text-sm font-semibold leading-none text-[var(--z-text-main)] shadow-sm transition hover:border-[var(--z-primary)] hover:text-[var(--z-text-main)] active:bg-slate-50 sm:min-h-10 sm:px-3.5 ${className}`}
    >
      <ChatBubbleIcon className={iconClassHeader} />
      <span className="max-w-[4.5rem] truncate sm:max-w-none">Hỗ trợ</span>
      {showUnreadBadge ? (
        <span className="absolute -right-0.5 -top-0.5 inline-flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold tabular-nums text-white ring-2 ring-[var(--z-card)]">
          {badgeText}
        </span>
      ) : null}
    </button>
  );
}
