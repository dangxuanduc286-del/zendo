"use client";

import { useEffect, useMemo } from "react";
import { useAccountMobileMenuStore } from "@/stores/accountMobileMenuStore";

export type AccountMobileNavItem =
  | { kind: "tab"; label: string; tab: string; badgeCount?: number; commissionBadgeCount?: number }
  | { kind: "support"; label: string };

export default function AccountMobileMenuDrawer({
  items,
  activeTab,
  onSelectTab,
  onOpenSupport,
  onSignOut,
  supportUnreadTotal,
}: {
  items: AccountMobileNavItem[];
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onOpenSupport: () => void;
  onSignOut: () => void;
  supportUnreadTotal: number;
}): JSX.Element | null {
  const open = useAccountMobileMenuStore((s) => s.open);
  const close = useAccountMobileMenuStore((s) => s.close);

  const rows = useMemo(() => items.filter((i) => i.label.trim().length > 0), [items]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);
    const body = document.body;
    const prev = body.style.overflow;
    body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      body.style.overflow = prev;
    };
  }, [open, close]);

  if (!open) return null;

  return (
    <div
      id="account-mobile-menu"
      role="dialog"
      aria-modal="true"
      aria-label="Menu tài khoản"
      className="fixed inset-0 z-[70] md:hidden"
    >
      <button
        type="button"
        aria-label="Đóng menu"
        className="absolute inset-0 bg-black/35"
        onClick={close}
      />
      <aside
        className="absolute left-0 top-0 h-full w-[min(86vw,340px)] overflow-hidden bg-white shadow-2xl"
        style={{
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-[#E2E8F0] px-4 py-3">
            <p className="text-sm font-extrabold tracking-tight text-[#0F172A]">Tài khoản</p>
            <button
              type="button"
              onClick={close}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#E2E8F0] bg-white text-[#0F172A] shadow-sm transition hover:bg-[#F8FAFC] active:bg-[#F1F5F9]"
              aria-label="Đóng"
            >
              <span className="text-[18px] leading-none">×</span>
            </button>
          </div>

          <nav aria-label="Điều hướng tài khoản" className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
            <div className="flex flex-col gap-2">
              {rows.map((item) => {
                if (item.kind === "support") {
                  return (
                    <button
                      key="mobile-nav-support"
                      type="button"
                      onClick={() => {
                        close();
                        onOpenSupport();
                      }}
                      className="flex min-h-10 w-full items-center justify-between gap-2 rounded-xl border border-[#E2E8F0] bg-white px-3 py-2.5 text-left text-sm font-medium text-[#0F172A] transition hover:bg-[#EFF6FF]"
                    >
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      {supportUnreadTotal > 0 ? (
                        <span className="inline-flex h-5 shrink-0 items-center justify-center rounded-full bg-amber-100 px-1.5 text-[11px] font-bold tabular-nums text-amber-950 ring-1 ring-rose-200/80">
                          {supportUnreadTotal > 99 ? "99+" : supportUnreadTotal}
                        </span>
                      ) : null}
                    </button>
                  );
                }
                const isActive = activeTab === item.tab;
                return (
                  <button
                    key={`mobile-nav-${item.tab}-${item.label}`}
                    type="button"
                    aria-current={isActive ? "page" : undefined}
                    onClick={() => {
                      close();
                      onSelectTab(item.tab);
                    }}
                    className={`flex min-h-10 w-full items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition ${
                      isActive
                        ? "border-blue-300 bg-blue-50 text-blue-900 font-semibold hover:bg-blue-100"
                        : "border-[#E2E8F0] bg-white text-[#0F172A] hover:bg-[#EFF6FF]"
                    }`}
                  >
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    <span className="flex shrink-0 items-center gap-1">
                      {(item.commissionBadgeCount ?? 0) > 0 && item.tab === "notifications" ? (
                        <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-emerald-600 px-[5px] text-[10px] font-semibold tabular-nums leading-none text-white shadow-sm ring-1 ring-black/[0.08]">
                          HH {(item.commissionBadgeCount ?? 0) > 99 ? "99+" : item.commissionBadgeCount}
                        </span>
                      ) : null}
                      {(item.badgeCount ?? 0) > 0 ? (
                        <span
                          className={`inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-[5px] text-[11px] font-semibold tabular-nums leading-none shadow-sm ring-1 ring-black/[0.08] ${
                            item.tab === "notifications"
                              ? "bg-[#EF4444] text-white"
                              : "bg-[#DBEAFE] text-[#1D4ED8]"
                          }`}
                        >
                          {(item.badgeCount ?? 0) > 99 ? "99+" : item.badgeCount}
                        </span>
                      ) : null}
                    </span>
                  </button>
                );
              })}
            </div>
          </nav>

          <div className="border-t border-[#E2E8F0] p-3">
            <button
              type="button"
              onClick={() => {
                close();
                onSignOut();
              }}
              className="w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2.5 text-left text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
            >
              Đăng xuất
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}

