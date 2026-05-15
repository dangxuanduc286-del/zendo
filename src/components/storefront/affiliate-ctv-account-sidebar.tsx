"use client";

import Link from "next/link";
import { ChevronDown, ChevronRight, LogOut } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { CtvNavChild, CtvNavEntry } from "./affiliate-ctv-account-menu-config";

export type { CtvNavChild, CtvNavEntry, CtvNavBuyerRow } from "./affiliate-ctv-account-menu-config";
export {
  ACCOUNT_MENU_ITEMS,
  MENU_BASE_CLASS,
  buildCtvNavEntries,
  collectNavTabKeys,
  flattenEnabledMenuItems,
} from "./affiliate-ctv-account-menu-config";
export type { AccountMenuItemDef, EnabledAccountMenuItem } from "./affiliate-ctv-account-menu-config";

const rowBase =
  "flex w-full min-h-[44px] items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium leading-snug tracking-tight text-[#1E293B] transition outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]/40 sm:text-sm";
const rowIdle = "border border-transparent hover:border-[#E2E8F0]/90 hover:bg-[#F8FAFC]/90";
const rowActive = "border border-[#BFDBFE] bg-[#EFF6FF]/95 font-semibold text-[#0F172A] shadow-sm ring-1 ring-[#DBEAFE]/80";
const subRowBase = `${rowBase} min-h-[42px] pl-2.5 text-[12.5px] sm:text-[13px]`;
const subIndent = "ml-2 border-l-2 border-[#E2E8F0]/80 pl-2";

function IconWrap({ Icon, active }: { Icon: LucideIcon; active?: boolean }): JSX.Element {
  return (
    <span
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
        active ? "bg-[#2563EB]/15 text-[#1D4ED8]" : "bg-[#F1F5F9] text-[#64748B]"
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
  /** Khi có (vd. `/tai-khoan/affiliate/analytics`), highlight mục `link` khớp URL. */
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

export function AffiliateCtvAccountSidebar(props: RenderProps & { dense?: boolean }): JSX.Element {
  const gap = props.dense ? "gap-1" : "gap-1.5";

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
    <div className={`flex flex-col ${gap}`}>
      {props.entries.map((entry) => {
        if (entry.kind === "link") {
          const linkActive = linkRowActive(entry.href, props.pathname);
          return (
            <Link
              key={entry.href}
              href={entry.href}
              prefetch={false}
              onClick={() => runAfterNav(props.onNavigate)}
              className={`${rowBase} ${linkActive ? rowActive : rowIdle}`}
              aria-current={linkActive ? "page" : undefined}
            >
              <IconWrap Icon={entry.Icon} active={linkActive} />
              <span className="min-w-0 flex-1 truncate">{entry.label}</span>
            </Link>
          );
        }

        if (entry.kind === "expandable") {
          const open = props.expandedSections[entry.id] ?? false;
          return (
            <div key={entry.id} className="rounded-xl border border-[#E2E8F0]/70 bg-[#F8FAFC]/40 p-1">
              <button
                type="button"
                onClick={() => props.onToggleSection(entry.id)}
                className={`${rowBase} w-full border-0 bg-transparent hover:bg-white/90`}
                aria-expanded={open}
              >
                <IconWrap Icon={entry.Icon} />
                <span className="min-w-0 flex-1 truncate text-left font-semibold text-[#0F172A]">{entry.label}</span>
                {open ? (
                  <ChevronDown className="h-4 w-4 shrink-0 text-[#64748B]" aria-hidden />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0 text-[#64748B]" aria-hidden />
                )}
              </button>
              {open ? (
                <div className={`mt-1 space-y-0.5 ${subIndent}`}>
                  {entry.children.map((c, idx) => {
                    if (c.kind === "link") {
                      const subLinkActive = linkRowActive(c.href, props.pathname);
                      return (
                        <Link
                          key={`${c.href}-${idx}`}
                          href={c.href}
                          prefetch={false}
                          onClick={() => runAfterNav(props.onNavigate)}
                          className={`${subRowBase} ${subLinkActive ? rowActive : rowIdle}`}
                          aria-current={subLinkActive ? "page" : undefined}
                        >
                          <IconWrap Icon={c.Icon} active={subLinkActive} />
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
                        className={`${subRowBase} ${active ? rowActive : rowIdle}`}
                        aria-current={active ? "page" : undefined}
                      >
                        <IconWrap Icon={c.Icon} active={active} />
                        <span className="min-w-0 flex-1 truncate">{c.label}</span>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        }

        const isAffiliateNav = entry.tab === "affiliate";
        const active = isAffiliateNav
          ? props.activeTab === "affiliate"
          : props.activeTab === entry.tab;

        return (
          <button
            key={`${entry.tab}-${entry.label}`}
            type="button"
            onClick={() => {
              props.onSelectTab(entry.tab);
              if (entry.tab === "affiliate") {
                props.onSelectAffiliateSubTab("overview");
              }
              runAfterNav(props.onNavigate);
            }}
            aria-current={active ? "page" : undefined}
            className={`${rowBase} justify-between ${active ? rowActive : rowIdle}`}
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <IconWrap Icon={entry.Icon} active={active} />
              <span className="min-w-0 truncate">{entry.label}</span>
            </span>
            {entry.tab === "notifications" ? (
              <span className="flex shrink-0 items-center gap-1">
                {props.showCommissionBadge && props.commissionBadge > 0 ? (
                  <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-emerald-600 px-[4px] text-[10px] font-semibold tabular-nums leading-none text-white shadow-sm ring-1 ring-black/[0.08]">
                    HH {props.commissionBadge > 99 ? "99+" : props.commissionBadge}
                  </span>
                ) : null}
                {props.notificationsUnread > 0 ? (
                  <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#EF4444] px-[5px] text-[11px] font-semibold tabular-nums leading-none text-white shadow-sm ring-1 ring-black/[0.08]">
                    {props.notificationsUnread > 99 ? "99+" : props.notificationsUnread}
                  </span>
                ) : null}
              </span>
            ) : null}
          </button>
        );
      })}

      <button
        type="button"
        onClick={() => {
          props.onSignOut();
          runAfterNav(props.onNavigate);
        }}
        className={`${rowBase} mt-1 border border-rose-100 bg-rose-50/60 text-rose-800 hover:bg-rose-50`}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-600">
          <LogOut className="h-4 w-4" strokeWidth={1.75} aria-hidden />
        </span>
        <span className="font-semibold">Đăng xuất</span>
      </button>
    </div>
  );
}
