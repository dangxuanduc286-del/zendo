"use client";

import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState, type MouseEvent } from "react";
import { useSupportPanel } from "@/components/support/storefront-support-provider";
import {
  STOREFRONT_SUPPORT_UNREAD_UPDATED_EVENT,
  formatSupportUnreadBadge,
} from "@/lib/storefront-support-sync";
import { useSupportInboxStore } from "@/stores/supportInboxStore";

/** Badge pill — absolute, không bị overflow che (header dùng relative + z-50). */
const TOPBAR_SUPPORT_UNREAD_BADGE_PILL =
  "pointer-events-none absolute -right-1.5 -top-1.5 z-50 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#ef4444] px-1 text-[11px] font-semibold tabular-nums text-white shadow-sm animate-pulse motion-reduce:animate-none";

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
  const unread = useSupportInboxStore((s) => s.storefrontSupportUnreadTotal);
  const [, forceRender] = useState(0);

  useEffect(() => {
    const handler = (): void => {
      forceRender((v) => v + 1);
    };
    window.addEventListener(STOREFRONT_SUPPORT_UNREAD_UPDATED_EVENT, handler);
    return () => window.removeEventListener(STOREFRONT_SUPPORT_UNREAD_UPDATED_EVENT, handler);
  }, []);

  const handleOpenChat = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      onClick?.();
      supportPanel.requestOpen();
    },
    [onClick, supportPanel],
  );

  const hasUnread = Number.isFinite(unread) && unread > 0;
  const showUnreadBadge = status === "authenticated" && session?.user?.role === "USER" && hasUnread;
  const badgeText = formatSupportUnreadBadge(unread);
  const ariaLabel =
    status === "authenticated"
      ? showUnreadBadge
        ? `Hỗ trợ — ${unread > 99 ? "hơn 99" : unread} tin chưa đọc`
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
          <span className="min-w-0 truncate">
            Hỗ trợ
            {showUnreadBadge ? (
              <span className="font-semibold text-[#ef4444]"> ({badgeText})</span>
            ) : null}
          </span>
        </span>
        {showUnreadBadge ? <span className={TOPBAR_SUPPORT_UNREAD_BADGE_PILL}>{badgeText}</span> : null}
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
        <span>
          Hỗ trợ
          {showUnreadBadge ? <span className="font-semibold text-[#ef4444]"> ({badgeText})</span> : null}
        </span>
        {showUnreadBadge ? <span className={TOPBAR_SUPPORT_UNREAD_BADGE_PILL}>{badgeText}</span> : null}
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
        {showUnreadBadge ? <span className={TOPBAR_SUPPORT_UNREAD_BADGE_PILL}>{badgeText}</span> : null}
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
      className={`relative z-[9999] pointer-events-auto inline-flex max-w-full min-h-[44px] min-w-0 shrink-0 items-center justify-center gap-1.5 overflow-visible whitespace-nowrap rounded-xl border border-[var(--z-border)] bg-[var(--z-card)] px-2.5 text-sm font-semibold leading-none text-[var(--z-text-main)] shadow-sm transition hover:border-[var(--z-primary)] hover:text-[var(--z-text-main)] active:bg-slate-50 sm:min-h-10 sm:px-3.5 ${className}`}
    >
      <ChatBubbleIcon className={iconClassHeader} />
      <span className="max-w-[4.5rem] truncate sm:max-w-none">
        Hỗ trợ
        {showUnreadBadge ? <span className="font-semibold text-[#ef4444]"> ({badgeText})</span> : null}
      </span>
      {showUnreadBadge ? <span className={TOPBAR_SUPPORT_UNREAD_BADGE_PILL}>{badgeText}</span> : null}
    </button>
  );
}
