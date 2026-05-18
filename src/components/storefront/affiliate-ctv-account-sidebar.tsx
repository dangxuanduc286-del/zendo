"use client";

import Link from "next/link";
import { ChevronDown, ChevronRight, LogOut } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { prefetchStorefrontAccountTab } from "../../lib/account-tab-prefetch";
import type { CtvNavChild, CtvNavEntry } from "./affiliate-ctv-account-menu-config";
import {
  CTV_NAV_ICON,
  CTV_NAV_ICON_ACTIVE,
  CTV_NAV_ICON_SIGNOUT,
  CTV_NAV_ROW,
  CTV_NAV_ROW_ACTIVE,
  CTV_NAV_ROW_IDLE,
  CTV_NAV_ROW_SIGNOUT,
} from "./affiliate/affiliate-ctv-account-ui-tokens";

export type { CtvNavChild, CtvNavEntry, CtvNavBuyerRow } from "./affiliate-ctv-account-menu-config";
export {
  ACCOUNT_MENU_ITEMS,
  MENU_BASE_CLASS,
  buildCtvNavEntries,
  collectNavTabKeys,
  flattenEnabledMenuItems,
} from "./affiliate-ctv-account-menu-config";
export type { AccountMenuItemDef, EnabledAccountMenuItem } from "./affiliate-ctv-account-menu-config";

const rowBaseMobile =
  "flex w-full min-h-[44px] items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium leading-snug tracking-tight text-[#1E293B] transition outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]/40 sm:text-sm";
const rowIdleMobile =
  "border border-transparent transition-[background-color,color,box-shadow] duration-[250ms] ease-out hover:bg-blue-50 hover:text-blue-700";
const rowActiveMobile =
  "border-0 bg-gradient-to-br from-[#2563eb] to-[#3b82f6] font-semibold text-white shadow-[0_10px_25px_rgba(37,99,235,0.25)]";
const subRowBaseMobile = `${rowBaseMobile} min-h-[42px] pl-2.5 text-[12.5px] sm:text-[13px]`;
const subIndentMobile = "ml-2 border-l-2 border-slate-200/90 pl-2";
const subIndentDesktop = "ml-1 space-y-1 border-l border-slate-200/80 pl-2";

function IconWrap({
  Icon,
  active,
  desktop,
}: {
  Icon: LucideIcon;
  active?: boolean;
  desktop?: boolean;
}): JSX.Element {
  if (desktop) {
    return (
      <span className={`${CTV_NAV_ICON} ${active ? CTV_NAV_ICON_ACTIVE : ""}`}>
        <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
      </span>
    );
  }
  return (
    <span
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[12px] transition-[background-color,color] duration-[250ms] ease-out ${
        active ? "bg-white/20 text-white ring-1 ring-white/30" : "bg-slate-100 text-slate-500"
      }`}
    >
      <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
    </span>
  );
}

type RenderProps = {
  entries: CtvNavEntry[];
  activeTab: string;
  onSelectTab: (tab: string) => void;
  activeAffiliateSubTab: string;
  onSelectAffiliateSubTab: (sub: string) => void;
  expandedSections: Record<string, boolean>;
  onToggleSection: (id: string) => void;
  notificationsUnread: number;
  commissionBadge: number;
  showCommissionBadge: boolean;
  onSignOut: () => void;
  onNavigate?: () => void;
  pathname?: string;
};

function tabRowActive(
  tab: string,
  activeTab: string,
  subTab: string | undefined,
  activeAffiliateSubTab: string,
): boolean {
  if (activeTab !== tab) return false;
  if (tab === "affiliate" && subTab) return activeAffiliateSubTab === subTab;
  return true;
}

function runAfterNav(onNavigate?: () => void): void {
  onNavigate?.();
}

function linkRowActive(href: string, pathname: string | undefined): boolean {
  if (!pathname) return false;
  const pathPart = href.split("?")[0] ?? href;
  if (!pathPart) return false;
  if (pathname === pathPart) return true;
  if (pathname.startsWith(`${pathPart}/`)) return true;
  return false;
}

function navRowClass(active: boolean, desktop: boolean, sub = false): string {
  if (desktop) {
    return `${CTV_NAV_ROW} ${active ? CTV_NAV_ROW_ACTIVE : CTV_NAV_ROW_IDLE}`;
  }
  const base = sub ? subRowBaseMobile : rowBaseMobile;
  return `${base} ${active ? rowActiveMobile : rowIdleMobile}`;
}

export function AffiliateCtvAccountSidebar(
  props: RenderProps & { dense?: boolean; layout?: "mobile" | "desktop" },
): JSX.Element {
  const desktop = props.layout === "desktop";
  const gap = props.dense ? "gap-1" : desktop ? "gap-2" : "gap-1.5";
  const handleTabChild = (c: Extract<CtvNavChild, { kind: "tab" }>): void => {
    props.onSelectTab(c.tab);
    if (c.subTab) props.onSelectAffiliateSubTab(c.subTab);
    runAfterNav(props.onNavigate);
    if (c.scrollId) {
      window.requestAnimationFrame(() => {
        document.getElementById(c.scrollId!)?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  };

  return (
    <div className={`flex flex-col ${desktop ? "h-fit w-full" : "min-h-0"}`}>
      <nav className={`flex flex-col ${gap} ${desktop ? "shrink-0" : ""}`}
        aria-label="Menu tài khoản CTV"
      >
        {props.entries.map((entry) => {
          if (entry.kind === "link") {
            const linkActive = linkRowActive(entry.href, props.pathname);
            return (
              <Link
                key={entry.href}
                href={entry.href}
                prefetch={false}
                onClick={() => runAfterNav(props.onNavigate)}
                className={navRowClass(linkActive, desktop)}
                aria-current={linkActive ? "page" : undefined}
              >
                <IconWrap desktop={desktop} Icon={entry.Icon} active={linkActive} />
                <span className="min-w-0 flex-1 truncate">{entry.label}</span>
              </Link>
            );
          }

          if (entry.kind === "expandable") {
            const open = props.expandedSections[entry.id] ?? false;
            return (
              <div key={entry.id} className={desktop ? "space-y-1" : "rounded-xl border border-[#E2E8F0]/70 bg-[#F8FAFC]/40 p-1"}>
                <button
                  type="button"
                  onClick={() => props.onToggleSection(entry.id)}
                  className={`${navRowClass(false, desktop)} w-full ${desktop ? "" : "border-0 bg-transparent"}`}
                  aria-expanded={open}
                >
                  <IconWrap desktop={desktop} Icon={entry.Icon} />
                  <span className="min-w-0 flex-1 truncate text-left">{entry.label}</span>
                  {open ? (
                    <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
                  )}
                </button>
                {open ? (
                  <div className={desktop ? subIndentDesktop : `${subIndentMobile} mt-1 space-y-0.5`}>
                    {entry.children.map((c, idx) => {
                      if (c.kind === "link") {
                        const subLinkActive = linkRowActive(c.href, props.pathname);
                        return (
                          <Link
                            key={`${c.href}-${idx}`}
                            href={c.href}
                            prefetch={false}
                            onClick={() => runAfterNav(props.onNavigate)}
                            className={navRowClass(subLinkActive, desktop, !desktop)}
                            aria-current={subLinkActive ? "page" : undefined}
                          >
                            <IconWrap desktop={desktop} Icon={c.Icon} active={subLinkActive} />
                            <span className="min-w-0 flex-1 truncate">{c.label}</span>
                          </Link>
                        );
                      }
                      const active = tabRowActive(c.tab, props.activeTab, c.subTab, props.activeAffiliateSubTab);
                      return (
                        <button
                          key={`${c.tab}-${c.label}-${idx}`}
                          type="button"
                          onClick={() => handleTabChild(c)}
                          className={navRowClass(active, desktop, !desktop)}
                          aria-current={active ? "page" : undefined}
                        >
                          <IconWrap desktop={desktop} Icon={c.Icon} active={active} />
                          <span className="min-w-0 flex-1 truncate">{c.label}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          }

          const active = tabRowActive(
            entry.tab,
            props.activeTab,
            entry.subTab,
            props.activeAffiliateSubTab,
          );

          return (
            <button
              key={`${entry.tab}-${entry.label}`}
              type="button"
              onPointerEnter={() => prefetchStorefrontAccountTab(entry.tab)}
              onFocus={() => prefetchStorefrontAccountTab(entry.tab)}
              onClick={() => {
                props.onSelectTab(entry.tab);
                if (entry.tab === "affiliate") {
                  props.onSelectAffiliateSubTab(entry.subTab ?? "overview");
                }
                runAfterNav(props.onNavigate);
                if (entry.scrollId) {
                  window.requestAnimationFrame(() => {
                    document.getElementById(entry.scrollId!)?.scrollIntoView({ behavior: "smooth", block: "start" });
                  });
                }
              }}
              aria-current={active ? "page" : undefined}
              className={`${navRowClass(active, desktop)} justify-between`}
            >
              <span className="flex min-w-0 items-center gap-3">
                <IconWrap desktop={desktop} Icon={entry.Icon} active={active} />
                <span className="min-w-0 truncate">{entry.label}</span>
              </span>
              {entry.tab === "notifications" ? (
                <span className="flex shrink-0 items-center gap-1">
                  {props.showCommissionBadge && props.commissionBadge > 0 ? (
                    <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-emerald-600 px-1 text-[10px] font-semibold tabular-nums leading-none text-white">
                      HH {props.commissionBadge > 99 ? "99+" : props.commissionBadge}
                    </span>
                  ) : null}
                  {props.notificationsUnread > 0 ? (
                    <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold tabular-nums leading-none text-white">
                      {props.notificationsUnread > 99 ? "99+" : props.notificationsUnread}
                    </span>
                  ) : null}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      <button
        type="button"
        onClick={() => {
          props.onSignOut();
          runAfterNav(props.onNavigate);
        }}
        className={
          desktop
            ? `${CTV_NAV_ROW_SIGNOUT} mt-3 shrink-0 border-t border-slate-100/90 pt-4`
            : `${rowBaseMobile} mt-1 shrink-0 text-rose-700 hover:bg-rose-50/90`
        }
      >
        <span
          className={
            desktop
              ? `${CTV_NAV_ICON} ${CTV_NAV_ICON_SIGNOUT}`
              : "flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100 text-rose-600"
          }
        >
          <LogOut className="h-4 w-4" strokeWidth={1.75} aria-hidden />
        </span>
        <span>Đăng xuất</span>
      </button>
    </div>
  );
}
