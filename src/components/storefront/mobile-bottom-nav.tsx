"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useEffect, useState, type MouseEvent } from "react";
import {
  STOREFRONT_SUPPORT_UNREAD_UPDATED_EVENT,
  formatSupportUnreadBadge,
} from "../../lib/storefront-support-sync";
import { MARKETING_FRAME } from "../../lib/storefront-frame";
import { useStorefrontSupportUnreadTotal } from "../../lib/use-storefront-support-unread-total";
import { useSupportPanel } from "../support/storefront-support-provider";

type MobileNavCategory = {
  id: string;
  name: string;
  slug: string;
  children?: MobileNavCategory[];
};

function IconHome({ active }: { active: boolean }): JSX.Element {
  const c = active ? "text-[#2563EB]" : "text-[#64748B]";
  return (
    <svg viewBox="0 0 24 24" fill="none" className={`h-[19px] w-[19px] shrink-0 ${c}`} aria-hidden>
      <path
        d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconGrid({ active }: { active: boolean }): JSX.Element {
  const c = active ? "text-[#2563EB]" : "text-[#64748B]";
  return (
    <svg viewBox="0 0 24 24" fill="none" className={`h-[19px] w-[19px] shrink-0 ${c}`} aria-hidden>
      <path d="M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h6v6h-6v-6Z" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function IconTag({ active }: { active: boolean }): JSX.Element {
  const c = active ? "text-[#2563EB]" : "text-[#64748B]";
  return (
    <svg viewBox="0 0 24 24" fill="none" className={`h-[19px] w-[19px] shrink-0 ${c}`} aria-hidden>
      <path
        d="M4 5.5A1.5 1.5 0 0 1 5.5 4H9l11 11-4 4L4 9V5.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="7.5" cy="7.5" r="1" fill="currentColor" />
    </svg>
  );
}

function IconSupport({ active }: { active: boolean }): JSX.Element {
  const c = active ? "text-[#2563EB]" : "text-[#64748B]";
  return (
    <svg viewBox="0 0 24 24" fill="none" className={`h-[19px] w-[19px] shrink-0 ${c}`} aria-hidden>
      <path
        d="M12 3a8.5 8.5 0 0 0-8.5 8.5V13a3 3 0 0 0 3 3h1.5v-4H6.5a1 1 0 0 1-1-1v-.5A6.5 6.5 0 0 1 12 5a6.5 6.5 0 0 1 6.5 6.5V12a1 1 0 0 1-1 1H16v4h1.5a3 3 0 0 0 3-3v-2.5A8.5 8.5 0 0 0 12 3Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M10 18.5c.8.4 1.7.5 2 .5 2.8 0 4-1.8 4-4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

const BOTTOM_NAV_SUPPORT_UNREAD_BADGE =
  "pointer-events-none absolute -right-1.5 -top-1.5 z-[2] flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#ef4444] px-1 text-[11px] font-semibold tabular-nums text-white shadow-sm ring-1 ring-black/[0.08]";

export default function MobileBottomNav({
  categories,
}: {
  categories: MobileNavCategory[];
}): JSX.Element {
  const pathname = usePathname() ?? "/";
  const { status, data: session } = useSession();
  const isStorefrontCustomer = status === "authenticated" && session?.user?.role === "USER";
  const supportUnreadTotal = useStorefrontSupportUnreadTotal(isStorefrontCustomer);
  const [, forceUnreadRender] = useState(0);
  const supportPanel = useSupportPanel();
  const supportChatOpen = supportPanel.open;
  const [hash, setHash] = useState("");
  const [categorySheetOpen, setCategorySheetOpen] = useState(false);
  const [expandedParentId, setExpandedParentId] = useState<string | null>(null);

  useEffect(() => {
    const read = () => setHash(window.location.hash);
    read();
    const onHash = () => read();
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [pathname]);

  useEffect(() => {
    if (!categorySheetOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCategorySheetOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [categorySheetOpen]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (!categorySheetOpen) return;
    const body = document.body;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";
    return () => {
      body.style.overflow = previousOverflow;
    };
  }, [categorySheetOpen]);

  useEffect(() => {
    const onUnreadEvent = (): void => {
      forceUnreadRender((v) => v + 1);
    };
    window.addEventListener(STOREFRONT_SUPPORT_UNREAD_UPDATED_EVENT, onUnreadEvent);
    return () => window.removeEventListener(STOREFRONT_SUPPORT_UNREAD_UPDATED_EVENT, onUnreadEvent);
  }, []);

  const onHome = pathname === "/" && hash !== "#uu-dai";
  const onDeals = pathname === "/uu-dai";
  const onCategory = pathname.startsWith("/danh-muc") || pathname === "/cua-hang";

  const items: Array<{
    href?: string;
    label: string;
    active: boolean;
    Icon: (p: { active: boolean }) => JSX.Element;
    kind?: "link" | "sheet" | "support";
  }> = [
    { kind: "link", href: "/", label: "Trang chủ", active: onHome, Icon: IconHome },
    { kind: "sheet", href: "/cua-hang", label: "Danh mục", active: onCategory, Icon: IconGrid },
    { kind: "link", href: "/uu-dai", label: "Ưu đãi", active: onDeals, Icon: IconTag },
    { kind: "support", label: "Hỗ trợ", active: supportChatOpen, Icon: IconSupport },
  ];

  const showSupportUnreadBadge = isStorefrontCustomer && supportUnreadTotal > 0;
  const supportBadgeText = formatSupportUnreadBadge(supportUnreadTotal);
  const supportAriaLabel =
    status === "authenticated"
      ? showSupportUnreadBadge
        ? `Hỗ trợ — ${supportUnreadTotal > 99 ? "hơn 99" : supportUnreadTotal} tin chưa đọc`
        : "Hỗ trợ — mở chat"
      : "Hỗ trợ — mở chat (đăng nhập trong khung chat nếu cần)";

  const onOpenSupport = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    supportPanel.requestOpen();
  };

  return (
    <>
      {categorySheetOpen ? (
        <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label="Danh mục">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setCategorySheetOpen(false)}
            aria-hidden
          />
          <div
            className="absolute inset-x-0 bottom-0 max-h-[min(80dvh,720px)] rounded-t-3xl border border-[#E2E8F0] bg-white shadow-xl"
            style={{ paddingBottom: "max(0px, env(safe-area-inset-bottom))" }}
          >
            <div className="sticky top-0 z-10 border-b border-[#E2E8F0] bg-white px-4 pt-3 pb-2">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-base font-bold tracking-tight text-[#0F172A]">Danh mục</p>
                  <p className="mt-0.5 text-[12px] font-medium text-[#64748B]">Chọn danh mục bạn muốn xem</p>
                </div>
                <button
                  type="button"
                  onClick={() => setCategorySheetOpen(false)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#E2E8F0] bg-white text-[#0F172A] shadow-sm transition hover:bg-[#F8FAFC] active:bg-[#F1F5F9]"
                  aria-label="Đóng"
                >
                  <span className="text-[18px] leading-none">×</span>
                </button>
              </div>
            </div>

            <div className="px-4 pb-4 pt-3">
              <div className="flex flex-col gap-2.5">
                {categories.map((parent) => {
                  const hasChildren = Boolean(parent.children?.length);
                  const expanded = expandedParentId === parent.id;
                  return (
                    <div key={parent.id} className="min-w-0">
                      <div className="flex min-w-0 items-stretch overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-sm">
                        <Link
                          href={`/danh-muc/${parent.slug}`}
                          className="flex min-w-0 flex-1 items-center gap-2 px-3 py-3 text-sm font-semibold text-[#0F172A] transition hover:bg-[#F8FAFC] active:bg-[#F1F5F9]"
                          onClick={() => {
                            setCategorySheetOpen(false);
                          }}
                        >
                          <span className="min-w-0 flex-1 truncate">{parent.name}</span>
                        </Link>
                        {hasChildren ? (
                          <button
                            type="button"
                            className="inline-flex w-12 items-center justify-center text-[#64748B] transition hover:bg-[#F8FAFC] active:bg-[#F1F5F9]"
                            aria-label={expanded ? `Thu gọn ${parent.name}` : `Mở ${parent.name}`}
                            aria-expanded={expanded}
                            onClick={() => setExpandedParentId((cur) => (cur === parent.id ? null : parent.id))}
                          >
                            <span className={`text-[14px] leading-none transition ${expanded ? "rotate-90" : ""}`}>›</span>
                          </button>
                        ) : (
                          <span className="inline-flex w-12 items-center justify-center text-[#CBD5E1]" aria-hidden>
                            ›
                          </span>
                        )}
                      </div>

                      {hasChildren && expanded ? (
                        <div className="mt-2 overflow-hidden rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-2">
                          <ul className="space-y-1">
                            {(parent.children ?? []).map((child) => (
                              <li key={child.id}>
                                <Link
                                  href={`/danh-muc/${child.slug}`}
                                  className="block rounded-xl px-3 py-2 text-[13px] font-semibold text-[#334155] transition hover:bg-white active:bg-white"
                                  onClick={() => setCategorySheetOpen(false)}
                                >
                                  {child.name}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <nav
        className="fixed bottom-0 left-0 right-0 z-[35] bg-white shadow-[0_-3px_12px_rgba(15,23,42,0.05)] lg:hidden"
        style={{ paddingBottom: "max(0px, env(safe-area-inset-bottom))" }}
        aria-label="Menu điều hướng dưới"
      >
        <div className={`${MARKETING_FRAME} flex h-14 items-stretch px-1 sm:px-2`}>
          {items.map((item) => {
            if (item.kind === "sheet") {
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => setCategorySheetOpen(true)}
                  className={`relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-0.5 text-[11px] font-semibold transition-colors ${
                    item.active ? "text-[#2563EB]" : "text-[#64748B] hover:bg-[#EFF6FF]"
                  }`}
                  aria-label="Danh mục"
                  aria-expanded={categorySheetOpen}
                >
                  <span className="relative inline-flex">
                    <item.Icon active={item.active} />
                  </span>
                  <span className="max-w-full truncate">{item.label}</span>
                </button>
              );
            }
            if (item.kind === "support") {
              return (
                <button
                  key={item.label}
                  type="button"
                  data-support-panel-trigger
                  aria-label={supportAriaLabel}
                  aria-expanded={supportChatOpen}
                  onClick={onOpenSupport}
                  className={`relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-0.5 text-[11px] font-semibold transition-colors ${
                    item.active ? "text-[#2563EB]" : "text-[#64748B] hover:bg-[#EFF6FF]"
                  }`}
                >
                  <span className="relative inline-flex">
                    <item.Icon active={item.active} />
                    {showSupportUnreadBadge ? (
                      <span className={BOTTOM_NAV_SUPPORT_UNREAD_BADGE}>{supportBadgeText}</span>
                    ) : null}
                  </span>
                  <span className="max-w-full truncate">{item.label}</span>
                </button>
              );
            }
            return (
              <Link
                key={item.label}
                href={item.href ?? "/"}
                className={`relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-0.5 text-[11px] font-semibold transition-colors ${
                  item.active ? "text-[#2563EB]" : "text-[#64748B] hover:bg-[#EFF6FF]"
                }`}
              >
                <span className="relative inline-flex">
                  <item.Icon active={item.active} />
                </span>
                <span className="max-w-full truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
