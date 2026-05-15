/**
 * Cấu hình menu tài khoản CTV / Affiliate — single source of truth cho sidebar desktop + drawer mobile.
 */
import {
  BarChart3,
  Bell,
  Copy,
  FileText,
  HandCoins,
  LayoutDashboard,
  Megaphone,
  Share2,
  Shield,
  ShoppingBag,
  Sparkles,
  Target,
  UserRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/** Dùng chung cho nút/link phụ trong trang tài khoản CTV (đồng bộ tone với buyer account). */
export const MENU_BASE_CLASS =
  "rounded-xl border border-[#E2E8F0] bg-white px-3 py-2.5 text-sm font-medium text-[#0F172A] transition hover:bg-[#EFF6FF]";

export type CtvNavChild =
  | { kind: "tab"; tab: string; label: string; Icon: LucideIcon; subTab?: string; scrollId?: string }
  | { kind: "link"; href: string; label: string; Icon: LucideIcon };

export type CtvNavEntry =
  | { kind: "tab"; tab: string; label: string; Icon: LucideIcon; enabled: boolean }
  | { kind: "link"; href: string; label: string; Icon: LucideIcon; enabled: boolean }
  | {
      kind: "expandable";
      id: string;
      label: string;
      Icon: LucideIcon;
      enabled: boolean;
      children: CtvNavChild[];
    };

export type CtvNavBuyerRow = { tab: string; label: string; Icon: LucideIcon; enabled: boolean };

/** Mô tả menu cấp cao (key dùng cho analytics / debug; group cho nhóm UI). */
export type AccountMenuItemDef = {
  key: string;
  label: string;
  icon: LucideIcon;
  tab?: string;
  href?: string;
  group: "primary" | "ctv" | "insights" | "account" | "commerce";
  mobile: boolean;
  desktop: boolean;
  kind: "tab" | "link" | "expandable";
  expandableId?: string;
  children?: Array<{
    key: string;
    label: string;
    icon: LucideIcon;
    tab?: string;
    href?: string;
    subTab?: string;
    scrollId?: string;
    kind: "tab" | "link";
  }>;
};

export const ACCOUNT_MENU_ITEMS: readonly AccountMenuItemDef[] = [
  {
    key: "overview",
    kind: "tab",
    group: "primary",
    mobile: true,
    desktop: true,
    label: "Tổng quan",
    icon: LayoutDashboard,
    tab: "overview",
  },
  {
    key: "ctv-tools",
    kind: "expandable",
    group: "ctv",
    mobile: true,
    desktop: true,
    label: "Công cụ CTV",
    icon: Sparkles,
    expandableId: "ctv-tools",
    children: [
      {
        key: "copy-link",
        kind: "tab",
        label: "Sao chép liên kết",
        icon: Copy,
        tab: "affiliate",
        subTab: "overview",
        scrollId: "affiliate-promo-tools",
      },
      { key: "share", kind: "tab", label: "Chia sẻ", icon: Share2, tab: "affiliate", subTab: "links" },
      {
        key: "promo",
        kind: "link",
        label: "Quảng bá",
        icon: Megaphone,
        href: "/tai-khoan/affiliate/analytics?tab=campaign",
      },
    ],
  },
  {
    key: "analytics",
    kind: "link",
    group: "insights",
    mobile: true,
    desktop: true,
    label: "Thống kê hiệu suất",
    icon: BarChart3,
    href: "/tai-khoan/affiliate/analytics",
  },
  {
    key: "attribution",
    kind: "link",
    group: "insights",
    mobile: true,
    desktop: true,
    label: "Attribution",
    icon: Target,
    href: "/tai-khoan/affiliate/attribution",
  },
  {
    key: "notifications",
    kind: "tab",
    group: "account",
    mobile: true,
    desktop: true,
    label: "Thông báo",
    icon: Bell,
    tab: "notifications",
  },
  {
    key: "profile",
    kind: "tab",
    group: "account",
    mobile: true,
    desktop: true,
    label: "Thông tin cá nhân",
    icon: UserRound,
    tab: "profile",
  },
  {
    key: "policyHub",
    kind: "tab",
    group: "account",
    mobile: true,
    desktop: true,
    label: "Tra cứu & chính sách",
    icon: FileText,
    tab: "policyHub",
  },
  {
    key: "affiliate-hub",
    kind: "tab",
    group: "ctv",
    mobile: true,
    desktop: true,
    label: "CTV / Affiliate",
    icon: HandCoins,
    tab: "affiliate",
  },
  {
    key: "security",
    kind: "tab",
    group: "account",
    mobile: true,
    desktop: true,
    label: "Bảo mật tài khoản",
    icon: Shield,
    tab: "security",
  },
];

export type EnabledAccountMenuItem = { kind: "tab"; tab: string; label: string };

function defToEntry(
  def: AccountMenuItemDef,
  flags: {
    showOverview: boolean;
    showAffiliate: boolean;
    affiliateActive: boolean;
    showNotifications: boolean;
    showProfile: boolean;
    showPolicyHub: boolean;
    showSecurity: boolean;
  },
): CtvNavEntry | null {
  const a = flags.affiliateActive;
  const enabled = (() => {
    switch (def.key) {
      case "overview":
        return flags.showOverview;
      case "ctv-tools":
        return flags.showAffiliate && a;
      case "analytics":
        return flags.showAffiliate && a;
      case "attribution":
        return flags.showAffiliate && a;
      case "notifications":
        return flags.showNotifications;
      case "profile":
        return flags.showProfile;
      case "policyHub":
        return flags.showPolicyHub;
      case "affiliate-hub":
        return flags.showAffiliate;
      case "security":
        return flags.showSecurity;
      default:
        return false;
    }
  })();

  if (!enabled) return null;

  if (def.kind === "tab" && def.tab) {
    return { kind: "tab", tab: def.tab, label: def.label, Icon: def.icon, enabled: true };
  }
  if (def.kind === "link" && def.href) {
    return { kind: "link", href: def.href, label: def.label, Icon: def.icon, enabled: true };
  }
  if (def.kind === "expandable" && def.expandableId && def.children?.length) {
    const children: CtvNavChild[] = def.children.map((ch) => {
      if (ch.kind === "link" && ch.href) {
        return { kind: "link", href: ch.href, label: ch.label, Icon: ch.icon };
      }
      if (ch.kind === "tab" && ch.tab) {
        return {
          kind: "tab",
          tab: ch.tab,
          label: ch.label,
          Icon: ch.icon,
          subTab: ch.subTab,
          scrollId: ch.scrollId,
        };
      }
      throw new Error(`Invalid menu child: ${ch.key}`);
    });
    return {
      kind: "expandable",
      id: def.expandableId,
      label: def.label,
      Icon: def.icon,
      enabled: true,
      children,
    };
  }
  return null;
}

export function buildCtvNavEntries(args: {
  showOverview: boolean;
  showAffiliate: boolean;
  affiliateActive: boolean;
  showNotifications: boolean;
  showProfile: boolean;
  showPolicyHub: boolean;
  showSecurity: boolean;
  buyerRows: CtvNavBuyerRow[];
}): CtvNavEntry[] {
  const flags = {
    showOverview: args.showOverview,
    showAffiliate: args.showAffiliate,
    affiliateActive: args.affiliateActive,
    showNotifications: args.showNotifications,
    showProfile: args.showProfile,
    showPolicyHub: args.showPolicyHub,
    showSecurity: args.showSecurity,
  };

  const fromPlan = ACCOUNT_MENU_ITEMS.map((d) => defToEntry(d, flags)).filter((e): e is CtvNavEntry => e !== null);

  const buyerEnabled = args.buyerRows.filter((r) => r.enabled);
  const shoppingGroup: CtvNavEntry | null =
    buyerEnabled.length > 0
      ? {
          kind: "expandable",
          id: "shopping",
          label: "Đơn hàng & mua sắm",
          Icon: ShoppingBag,
          enabled: true,
          children: buyerEnabled.map((r) => ({
            kind: "tab" as const,
            tab: r.tab,
            label: r.label,
            Icon: r.Icon,
          })),
        }
      : null;

  const profileIdx = fromPlan.findIndex((e) => e.kind === "tab" && e.tab === "profile");
  const insertAt = profileIdx >= 0 ? profileIdx + 1 : fromPlan.length;
  const head = fromPlan.slice(0, insertAt);
  const tail = fromPlan.slice(insertAt);
  return [...head, ...(shoppingGroup ? [shoppingGroup] : []), ...tail];
}

export function flattenEnabledMenuItems(entries: CtvNavEntry[]): EnabledAccountMenuItem[] {
  const result: EnabledAccountMenuItem[] = [];
  for (const e of entries) {
    if (e.kind === "tab") result.push({ kind: "tab", tab: e.tab, label: e.label });
    if (e.kind === "expandable") {
      for (const c of e.children) {
        if (c.kind === "tab") result.push({ kind: "tab", tab: c.tab, label: c.label });
      }
    }
  }
  return result;
}

export function collectNavTabKeys(entries: CtvNavEntry[]): string[] {
  return [
    ...new Set(
      flattenEnabledMenuItems(entries)
        .filter((i): i is { kind: "tab"; tab: string; label: string } => i.kind === "tab")
        .map((i) => i.tab),
    ),
  ];
}
