"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ADMIN_MENU_ITEMS, ADMIN_ORDERS_MENU_HREF } from "../../lib/admin-menu";
import { signOutAdminVoluntary } from "../../lib/admin-voluntary-signout-client";
import { AdminOrdersUnreadBadgePill, useAdminOrdersUnreadPolling } from "./admin-orders-unread-badge";
import {
  adminCtaButton,
  adminDangerButton,
  adminMobileHeader,
  adminMobileMenuItemActive,
  adminMobileMenuItemInactive,
} from "../../lib/admin-ui";

const COLLABORATORS_ADMIN_HREF = "/admin/collaborators";

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
}: {
  children: React.ReactNode;
  collaboratorsPendingBadgeCount?: number;
  initialOrdersUnreadCount?: number;
}): JSX.Element {
  const pathname = usePathname();
  const sidebarActive = pathname !== "/admin/login";
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearch, setMobileSearch] = useState("");
  const ordersUnreadCount = useAdminOrdersUnreadPolling(initialOrdersUnreadCount, sidebarActive);

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
            item.href === "/admin/website-appearance" ? "setting settings seo giao dien theme" : ""
          }`,
        );
        return searchIndex.includes(mobileSearchKeyword);
      })
    : mobileMenuItems;
  const shouldShowMobileMenuPanel = mobileMenuOpen || Boolean(mobileSearchKeyword);

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

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="flex w-full items-start">
        <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 border-r border-slate-200 bg-white px-3 py-4 lg:block">
          <Link
            href="/admin"
            className="mb-3 block rounded-xl border border-sky-200/60 bg-gradient-to-r from-sky-600 via-sky-500 to-violet-500 px-3.5 py-3 text-base font-extrabold tracking-tight text-white shadow-sm transition hover:brightness-105"
          >
            Quản trị Zendo
          </Link>
          <Link
            href="/"
            className={`${adminCtaButton} mb-3 flex h-11 w-full justify-center text-base tracking-tight`}
          >
            Trang chủ
          </Link>
          <nav aria-label="Sidebar quản trị" className="space-y-1.5">
            {ADMIN_MENU_ITEMS.map((item) => {
              const active =
                pathname === item.href || (item.href !== "/admin" && pathname.startsWith(`${item.href}/`));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex min-h-[44px] min-w-0 items-center justify-between gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold leading-snug transition ${
                    active
                      ? "bg-[#EFF6FF] text-[#1D4ED8]"
                      : "text-[#0F172A] hover:bg-[#EFF6FF] hover:text-[#1D4ED8]"
                  }`}
                >
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {item.href === COLLABORATORS_ADMIN_HREF ? (
                    <AdminSidebarNumericBadge count={collaboratorsPendingBadgeCount} title="yêu cầu CTV chờ duyệt" />
                  ) : null}
                  {item.href === ADMIN_ORDERS_MENU_HREF ? <AdminOrdersUnreadBadgePill count={ordersUnreadCount} /> : null}
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

        <div className="min-w-0 flex-1">
          <nav aria-label="Menu quản trị mobile" className="border-b border-slate-200 bg-[#F8FAFC] px-2.5 py-3 lg:hidden">
            <div className={adminMobileHeader}>
              <Link
                href="/"
                className={`${adminCtaButton} w-full`}
              >
                Trang chủ
              </Link>
              <div className="flex min-w-0 items-center gap-2">
                <button
                  type="button"
                  aria-label="Mở danh mục quản trị"
                  aria-expanded={mobileMenuOpen}
                  onClick={() => {
                    setMobileMenuOpen((prev) => !prev);
                    if (mobileMenuOpen) setMobileSearch("");
                  }}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#E2E8F0] bg-white text-[#0F172A] transition hover:bg-[#EFF6FF]"
                >
                  <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden>
                    <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                </button>
                <input
                  value={mobileSearch}
                  onChange={(event) => {
                    setMobileSearch(event.target.value);
                    if (event.target.value.trim()) {
                      setMobileMenuOpen(true);
                    }
                  }}
                  placeholder="Tìm kiếm cài đặt..."
                  className="h-10 min-w-0 flex-1 rounded-xl border border-[#E2E8F0] bg-white px-3 text-sm text-[#0F172A] outline-none transition placeholder:text-[#94A3B8] focus:border-[#2563EB] focus:ring-2 focus:ring-[#DBEAFE]"
                />
              </div>

              {shouldShowMobileMenuPanel ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
                  {filteredMobileMenuItems.length ? (
                    <div className="space-y-1">
                      {filteredMobileMenuItems.map((item) => {
                        const active =
                          pathname === item.href || (item.href !== "/admin" && pathname.startsWith(`${item.href}/`));
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => {
                              setMobileMenuOpen(false);
                              setMobileSearch("");
                            }}
                            className={`flex min-h-[44px] min-w-0 items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                              active ? adminMobileMenuItemActive : adminMobileMenuItemInactive
                            }`}
                          >
                            <span className="min-w-0 flex-1 truncate">{item.label}</span>
                            {item.href === COLLABORATORS_ADMIN_HREF ? (
                              <AdminSidebarNumericBadge count={collaboratorsPendingBadgeCount} title="yêu cầu CTV chờ duyệt" />
                            ) : null}
                            {item.href === ADMIN_ORDERS_MENU_HREF ? (
                              <AdminOrdersUnreadBadgePill count={ordersUnreadCount} />
                            ) : null}
                          </Link>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="px-2 py-3 text-sm text-slate-500">Không tìm thấy mục phù hợp.</p>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleAdminLogout().catch(() => {});
                    }}
                    disabled={isLoggingOut}
                    className={`${adminDangerButton} mt-2 w-full justify-start px-3`}
                  >
                    {isLoggingOut ? "Đang đăng xuất..." : "Đăng xuất"}
                  </button>
                </div>
              ) : null}
            </div>
          </nav>
          <div className="w-full max-w-none px-3 pb-6 pt-4 sm:px-6 sm:pt-6 lg:px-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
