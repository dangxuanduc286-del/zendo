"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ADMIN_AFFILIATE_ANALYTICS_HREF,
  ADMIN_AFFILIATE_APPLICATIONS_HREF,
  ADMIN_AFFILIATE_FRAUD_HREF,
  ADMIN_MENU_ITEMS,
  ADMIN_ORDERS_MENU_HREF,
} from "../../lib/admin-menu";
import { ADMIN_SUPPORT_DM_PAGE_HREF } from "@/lib/support-dm/admin-inbox-nav";
import { signOutAdminVoluntary } from "../../lib/admin-voluntary-signout-client";
import { useSupportChatStore } from "../../stores/supportChatStore";
import SupportChatPopup from "../support/support-chat-popup";
import { AdminOrdersUnreadBadgePill, useAdminOrdersUnreadPolling } from "./admin-orders-unread-badge";
import {
  ADMIN_SUPPORT_NEW_MESSAGE_TOAST_EVENT,
  AdminSupportUnreadBadgePill,
  type AdminSupportNewMessageToastDetail,
  useAdminSupportTicketUnreadPolling,
} from "./admin-support-unread-badge";
import AdminNotificationsBell from "./admin-notifications-bell";
import {
  adminDangerButton,
  adminMobileMenuItemActive,
  adminMobileMenuItemInactive,
  adminShellContentPadding,
} from "../../lib/admin-ui";

const COLLABORATORS_ADMIN_HREF = "/admin/collaborators";

/** Không mount popup/toast chat support trên trang «Tài khoản của tôi» / đổi mật khẩu — tránh chồng UI form. */
const ADMIN_ROUTES_HIDE_GLOBAL_SUPPORT_CHAT_PREFIXES = ["/admin/account", "/admin/change-password"] as const;

function shouldHideAdminGlobalSupportChat(pathname: string | null): boolean {
  const p = pathname ?? "";
  return ADMIN_ROUTES_HIDE_GLOBAL_SUPPORT_CHAT_PREFIXES.some(
    (prefix) => p === prefix || p.startsWith(`${prefix}/`),
  );
}

/** Nút storefront «Trang chủ»: nổi bật khi đang ở trang chủ site hoặc tổng quan admin (theo spec). */
function storefrontHomeCtaActive(pathname: string): boolean {
  return pathname === "/" || pathname === "/admin" || pathname === "/admin/dashboard";
}

function adminStorefrontHomeButtonClass(active: boolean): string {
  const base =
    "flex w-full min-h-[52px] shrink-0 items-center justify-center rounded-2xl border px-5 py-3.5 text-center text-sm font-semibold leading-snug tracking-tight transition duration-200 ease-out";
  if (active) {
    return `${base} border-sky-300/90 bg-gradient-to-br from-sky-50 via-white to-violet-50/90 text-sky-950 shadow-[0_8px_24px_-4px_rgba(14,165,233,0.35),0_4px_12px_-4px_rgba(139,92,246,0.2)] ring-2 ring-sky-400/35 hover:brightness-[1.02]`;
  }
  return `${base} border-slate-200/90 bg-gradient-to-br from-white via-slate-50/80 to-sky-50/40 text-slate-800 shadow-md shadow-slate-900/[0.06] ring-1 ring-slate-200/70 hover:border-sky-200/90 hover:bg-gradient-to-br hover:from-white hover:via-sky-50/50 hover:to-violet-50/30 hover:text-slate-900 hover:shadow-lg hover:shadow-sky-500/10 hover:ring-sky-200/50`;
}

function isAdminMenuItemActive(pathname: string, href: string): boolean {
  if (href === ADMIN_AFFILIATE_ANALYTICS_HREF && pathname.startsWith(ADMIN_AFFILIATE_FRAUD_HREF)) {
    return true;
  }
  return pathname === href || (href !== "/admin" && pathname.startsWith(`${href}/`));
}

function AffiliateApplicationsPendingBadge({ count }: { count: number }): JSX.Element | null {
  if (count <= 0) return null;
  return <AdminSidebarNumericBadge count={count} title="yêu cầu CTV chờ duyệt" />;
}

function AdminSidebarNumericBadge({ count, title }: { count: number; title: string }): JSX.Element | null {
  if (count <= 0) return null;
  const label = count > 99 ? "99+" : String(count);
  const fullTitle = count > 99 ? `Hơn 99 ${title}` : `${count} ${title}`;
  return (
    <span
      className="inline-flex h-5 shrink-0 items-center justify-center rounded-full bg-amber-100 px-1.5 text-[11px] font-bold tabular-nums text-amber-950 ring-1 ring-rose-300/90"
      title={fullTitle}
    >
      {label}
    </span>
  );
}

export default function AdminShell({
  children,
  collaboratorsPendingBadgeCount = 0,
  initialOrdersUnreadCount = 0,
  initialAdminNotificationUnreadCount = 0,
  supportTicketSidebarEnabled = false,
  initialSupportTicketUnreadCount = 0,
}: {
  children: React.ReactNode;
  collaboratorsPendingBadgeCount?: number;
  initialOrdersUnreadCount?: number;
  initialAdminNotificationUnreadCount?: number;
  supportTicketSidebarEnabled?: boolean;
  initialSupportTicketUnreadCount?: number;
}): JSX.Element {
  const pathname = usePathname();
  const sidebarActive = pathname !== "/admin/login";
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearch, setMobileSearch] = useState("");
  const [supportToastVisible, setSupportToastVisible] = useState(false);
  const [supportToastDetail, setSupportToastDetail] = useState<AdminSupportNewMessageToastDetail | null>(null);
  const ordersUnreadCount = useAdminOrdersUnreadPolling(initialOrdersUnreadCount, sidebarActive);
  const supportDmUnreadCount = useAdminSupportTicketUnreadPolling(
    initialSupportTicketUnreadCount,
    sidebarActive && supportTicketSidebarEnabled,
  );
  const hideAdminGlobalSupportChat =
    supportTicketSidebarEnabled && shouldHideAdminGlobalSupportChat(pathname);

  useEffect(() => {
    useSupportChatStore.getState().close();
  }, [pathname]);

  useEffect(() => {
    if (!hideAdminGlobalSupportChat) return;
    useSupportChatStore.getState().close();
    setSupportToastVisible(false);
    setSupportToastDetail(null);
  }, [hideAdminGlobalSupportChat]);

  const normalizeKeyword = (value: string): string =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

  const mobileMenuItems = ADMIN_MENU_ITEMS;
  const mobileSearchKeyword = normalizeKeyword(mobileSearch);
  const filteredMobileMenuItems = mobileSearchKeyword
    ? mobileMenuItems.filter((item) => {
        const searchIndex = normalizeKeyword(
          `${item.label} ${item.href} ${
            item.href === "/admin/website-appearance"
              ? "setting settings seo giao dien theme"
              : item.href === "/admin/affiliate-analytics"
                ? "affiliate analytics ctv hoa hong commission traffic fraud export"
                : item.href === ADMIN_AFFILIATE_APPLICATIONS_HREF
                  ? "dang ky ctv affiliate application yeu cau duyet"
                  : item.href === "/admin/system-operations"
                    ? "operations cron queue health cache maintenance system vận hành"
                    : item.href === ADMIN_SUPPORT_DM_PAGE_HREF
                      ? "ho tro chat support dm inbox"
                      : ""
          }`,
        );
        return searchIndex.includes(mobileSearchKeyword);
      })
    : mobileMenuItems;
  const mobileDrawerOpen = mobileMenuOpen || Boolean(mobileSearchKeyword);

  const closeMobileDrawer = (): void => {
    setMobileMenuOpen(false);
    setMobileSearch("");
  };

  useEffect(() => {
    setMobileMenuOpen(false);
    setMobileSearch("");
  }, [pathname]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (!mobileDrawerOpen) return;
    const mq = window.matchMedia("(min-width: 1024px)");
    if (mq.matches) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileDrawerOpen]);

  useEffect(() => {
    if (!supportTicketSidebarEnabled || !sidebarActive) return;
    const onBump = (ev: Event): void => {
      if (hideAdminGlobalSupportChat) return;
      if (useSupportChatStore.getState().isOpen) return;
      const ce = ev as CustomEvent<AdminSupportNewMessageToastDetail>;
      setSupportToastDetail(ce.detail && typeof ce.detail === "object" ? ce.detail : null);
      setSupportToastVisible(true);
    };
    window.addEventListener(ADMIN_SUPPORT_NEW_MESSAGE_TOAST_EVENT, onBump as EventListener);
    return () => window.removeEventListener(ADMIN_SUPPORT_NEW_MESSAGE_TOAST_EVENT, onBump as EventListener);
  }, [supportTicketSidebarEnabled, sidebarActive, hideAdminGlobalSupportChat]);

  useEffect(() => {
    if (!supportToastVisible) return;
    const t = window.setTimeout(() => {
      setSupportToastVisible(false);
      setSupportToastDetail(null);
    }, 6000);
    return () => window.clearTimeout(t);
  }, [supportToastVisible]);

  const handleAdminLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await signOutAdminVoluntary();
    } catch {
      setIsLoggingOut(false);
    }
  };

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  const storefrontHomeActive = storefrontHomeCtaActive(pathname);

  return (
    <div className="min-h-screen bg-[#F8FAFC] lg:flex lg:h-[100dvh] lg:min-h-0 lg:flex-col lg:overflow-hidden">
      <div className="flex w-full min-w-0 flex-1 flex-col lg:min-h-0 lg:flex-1 lg:flex-row lg:overflow-hidden">
        <aside className="hidden w-full min-w-0 max-w-[17.5rem] shrink-0 basis-[minmax(13rem,17.5rem)] border-r border-slate-200 bg-white px-2.5 py-4 lg:flex lg:h-full lg:min-h-0 lg:w-[minmax(13rem,17.5rem)] lg:flex-col lg:overflow-y-auto">
          <Link
            href="/admin"
            className="mb-4 block rounded-xl border border-sky-200/60 bg-gradient-to-r from-sky-600 via-sky-500 to-violet-500 px-3.5 py-3.5 text-base font-extrabold tracking-tight text-white shadow-md shadow-sky-900/15 transition hover:brightness-105"
          >
            Quản trị Zendo
          </Link>
          <Link
            href="/"
            className={`${adminStorefrontHomeButtonClass(storefrontHomeActive)} mb-3.5 w-full`}
          >
            Trang chủ
          </Link>
          <div className="mb-3 flex justify-end">
            <AdminNotificationsBell
              initialUnreadCount={initialAdminNotificationUnreadCount}
              enabled={sidebarActive}
            />
          </div>
          <nav aria-label="Sidebar quản trị" className="space-y-1">
            {ADMIN_MENU_ITEMS.map((item) => {
              const active = isAdminMenuItemActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex min-h-[42px] min-w-0 items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold leading-snug transition ${
                    active
                      ? "border border-sky-200/80 bg-sky-50 text-sky-900 shadow-sm ring-1 ring-sky-100"
                      : "border border-transparent text-slate-800 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {item.href === COLLABORATORS_ADMIN_HREF || item.href === ADMIN_AFFILIATE_APPLICATIONS_HREF ? (
                    <AffiliateApplicationsPendingBadge count={collaboratorsPendingBadgeCount} />
                  ) : null}
                  {item.href === ADMIN_ORDERS_MENU_HREF ? <AdminOrdersUnreadBadgePill count={ordersUnreadCount} /> : null}
                  {item.href === ADMIN_SUPPORT_DM_PAGE_HREF ? (
                    <AdminSupportUnreadBadgePill count={supportDmUnreadCount} />
                  ) : null}
                </Link>
              );
            })}
          </nav>
          <button
            type="button"
            onClick={handleAdminLogout}
            disabled={isLoggingOut}
            className={`${adminDangerButton} mt-3 w-full justify-start px-3`}
          >
            {isLoggingOut ? "Đang đăng xuất..." : "Đăng xuất"}
          </button>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col lg:h-full lg:min-h-0 lg:overflow-hidden">
          <header className="sticky top-0 z-40 shrink-0 border-b border-slate-200 bg-[#F8FAFC] lg:hidden">
            <div className="flex items-center gap-2 px-3 py-3 sm:px-4">
              <button
                type="button"
                aria-label="Mở menu quản trị"
                aria-expanded={mobileDrawerOpen}
                onClick={() => {
                  setMobileMenuOpen((prev) => !prev);
                  if (mobileMenuOpen) setMobileSearch("");
                }}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-900 transition hover:bg-slate-50"
              >
                <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden>
                  <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
              <Link href="/admin" className="min-w-0 flex-1 truncate text-center text-sm font-bold tracking-tight text-slate-900">
                Quản trị Zendo
              </Link>
              <AdminNotificationsBell
                initialUnreadCount={initialAdminNotificationUnreadCount}
                enabled={sidebarActive}
              />
            </div>
            <div className="px-3 pb-3 sm:px-4">
              <input
                value={mobileSearch}
                onChange={(event) => {
                  setMobileSearch(event.target.value);
                  if (event.target.value.trim()) {
                    setMobileMenuOpen(true);
                  }
                }}
                placeholder="Tìm mục menu..."
                className="h-11 w-full max-w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              />
            </div>
          </header>

          {mobileDrawerOpen ? (
            <div className="fixed inset-0 z-50 lg:hidden" role="presentation">
              <button
                type="button"
                aria-label="Đóng menu"
                className="absolute inset-0 bg-slate-900/40"
                onClick={closeMobileDrawer}
              />
              <div className="absolute left-0 top-0 flex h-[100dvh] w-[min(20rem,88vw)] max-w-full flex-col border-r border-slate-200 bg-white shadow-2xl">
                <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-100 px-3 py-3">
                  <span className="text-sm font-bold text-slate-900">Danh mục</span>
                  <button
                    type="button"
                    aria-label="Đóng"
                    onClick={closeMobileDrawer}
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  >
                    <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden>
                      <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-3 py-3">
                  <Link
                    href="/admin"
                    onClick={closeMobileDrawer}
                    className="block rounded-xl border border-sky-200/60 bg-gradient-to-r from-sky-600 via-sky-500 to-violet-500 px-4 py-3 text-center text-sm font-extrabold tracking-tight text-white shadow-md"
                  >
                    Bảng điều khiển
                  </Link>
                  <Link
                    href="/"
                    onClick={closeMobileDrawer}
                    className={`${adminStorefrontHomeButtonClass(storefrontHomeActive)} w-full`}
                  >
                    Trang chủ
                  </Link>
                  <nav aria-label="Menu quản trị" className="space-y-1.5">
                    {filteredMobileMenuItems.length ? (
                      filteredMobileMenuItems.map((item) => {
                        const active = isAdminMenuItemActive(pathname, item.href);
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={closeMobileDrawer}
                            className={active ? adminMobileMenuItemActive : adminMobileMenuItemInactive}
                          >
                            <span className="min-w-0 flex-1 truncate">{item.label}</span>
                            {item.href === COLLABORATORS_ADMIN_HREF || item.href === ADMIN_AFFILIATE_APPLICATIONS_HREF ? (
                              <AffiliateApplicationsPendingBadge count={collaboratorsPendingBadgeCount} />
                            ) : null}
                            {item.href === ADMIN_ORDERS_MENU_HREF ? (
                              <AdminOrdersUnreadBadgePill count={ordersUnreadCount} />
                            ) : null}
                            {item.href === ADMIN_SUPPORT_DM_PAGE_HREF ? (
                              <AdminSupportUnreadBadgePill count={supportDmUnreadCount} />
                            ) : null}
                          </Link>
                        );
                      })
                    ) : (
                      <p className="px-1 py-3 text-sm text-slate-500">Không tìm thấy mục phù hợp.</p>
                    )}
                  </nav>
                  <button
                    type="button"
                    onClick={() => {
                      closeMobileDrawer();
                      handleAdminLogout().catch(() => {});
                    }}
                    disabled={isLoggingOut}
                    className={`${adminDangerButton} justify-start`}
                  >
                    {isLoggingOut ? "Đang đăng xuất..." : "Đăng xuất"}
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          <div
            className={`admin-scrollbar flex min-h-0 min-w-0 flex-1 flex-col overflow-x-clip overflow-y-auto pb-6 [-webkit-overflow-scrolling:touch] md:pb-8 lg:min-h-0 lg:flex-1 ${adminShellContentPadding}`}
          >
            <div className="w-full min-w-0 max-w-full flex-1 overflow-x-clip">{children}</div>
          </div>
        </div>
      </div>
      {supportTicketSidebarEnabled && !hideAdminGlobalSupportChat ? <SupportChatPopup /> : null}
      {supportTicketSidebarEnabled && !hideAdminGlobalSupportChat && supportToastVisible ? (
        <div className="pointer-events-none fixed bottom-4 right-4 z-[10001] flex max-w-[min(360px,calc(100vw-2rem))] flex-col items-end gap-2">
          <button
            type="button"
            onClick={() => {
              useSupportChatStore.getState().open();
              setSupportToastVisible(false);
              setSupportToastDetail(null);
            }}
            className="pointer-events-auto rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-left text-sm text-slate-800 shadow-lg shadow-slate-900/10 ring-1 ring-slate-900/[0.04] transition hover:bg-slate-50"
          >
            <span className="font-semibold text-slate-900">
              {supportToastDetail?.customerName?.trim()
                ? `${supportToastDetail.customerName.trim()} vừa nhắn hỗ trợ`
                : "Khách hàng mới nhắn hỗ trợ"}
            </span>
            {supportToastDetail?.preview?.trim() ? (
              <span className="mt-0.5 line-clamp-2 block text-xs font-normal text-slate-600">
                {supportToastDetail.preview.trim()}
              </span>
            ) : null}
            <span className="mt-0.5 block text-xs text-slate-500">Nhấn để mở chat</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
