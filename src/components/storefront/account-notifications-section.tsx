"use client";

import Link from "next/link";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { AffiliateCommissionTabSettings } from "@/lib/affiliate-commission-tab-settings";
import { formatOrderStatus } from "@/lib/admin-order";
import {
  normalizeCustomerNotificationCategory,
  type CustomerNotificationTabCategory,
} from "@/lib/customer-account-notification-category";
import type {
  CustomerNotificationPollMutators,
  CustomerNotificationsPollBundle,
} from "@/lib/use-customer-notifications-poll";
import {
  commissionLifecycleNotificationVisual,
  readAffiliateCommissionNotificationType,
} from "@/lib/affiliate/affiliate-commission-notification-types";
import { AccountPageTabPanel } from "./account-page-tab-panel";
import { CtvFormattedValue } from "./ctv/ctv-formatted-value";
import {
  ACCOUNT_PAGE_HEADER_TOOLBAR_BTN,
  ACCOUNT_PAGE_HEADER_TOOLBAR_BTN_DANGER,
} from "./account-page-header-tokens";

export type AccountNotificationListItem = CustomerNotificationsPollBundle["items"][number];

type IncomeSummary = {
  todayCommission: number;
  monthCommission: number;
  pendingTotal: number;
  paidTotal: number;
  affiliateOrderCount: number;
  statusTotals: {
    PENDING: number;
    WAITING_RELEASE?: number;
    AVAILABLE?: number;
    APPROVED?: number;
    PAID: number;
    CANCELLED: number;
  };
};

type NotificationFilter = "all" | "order" | "commission" | "promotion" | "system";

type CommissionHistoryRange = "today" | "7d" | "30d" | "month";

function commissionHistoryIncludes(createdAt: string, range: CommissionHistoryRange): boolean {
  const t = new Date(createdAt).getTime();
  if (!Number.isFinite(t)) return false;
  const now = Date.now();
  const day = 86400000;
  if (range === "today") return t >= now - day;
  if (range === "7d") return t >= now - 7 * day;
  if (range === "30d") return t >= now - 30 * day;
  const d = new Date();
  const startMonth = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  return t >= startMonth;
}

/** Card có thể bấm toàn bộ — không dùng <button> bọc ngoài (tránh nested button với CTA bên trong). */
function NotificationRowClickable(props: { onActivate: () => void; className: string; children: ReactNode }): JSX.Element {
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    props.onActivate();
  };
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => props.onActivate()}
      onKeyDown={onKeyDown}
      className={props.className}
    >
      {props.children}
    </div>
  );
}

function NotificationOverflowMenu(props: {
  menuKey: string;
  openMenuKey: string | null;
  setOpenMenuKey: (key: string | null) => void;
  onMarkRead: () => void | Promise<void>;
  onDelete: () => void | Promise<void>;
}): JSX.Element {
  const open = props.openMenuKey === props.menuKey;
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const fn = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) props.setOpenMenuKey(null);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [open, props]);

  return (
    <div className="relative shrink-0" ref={wrapRef}>
      <button
        type="button"
        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-lg leading-none text-slate-600 hover:bg-slate-100 active:bg-slate-200"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Thao tác thông báo"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          props.setOpenMenuKey(open ? null : props.menuKey);
        }}
      >
        ⋮
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-[50] mt-1 min-w-[190px] rounded-xl border border-[#E2E8F0] bg-white py-1 shadow-lg"
        >
          <button
            role="menuitem"
            type="button"
            className="flex min-h-[44px] w-full items-center px-4 text-left text-sm text-[#0F172A] hover:bg-[#F8FAFC]"
            onClick={(e) => {
              e.stopPropagation();
              props.setOpenMenuKey(null);
              void props.onMarkRead();
            }}
          >
            Đánh dấu đã đọc
          </button>
          <button
            role="menuitem"
            type="button"
            className="flex min-h-[44px] w-full items-center px-4 text-left text-sm font-medium text-rose-700 hover:bg-rose-50"
            onClick={(e) => {
              e.stopPropagation();
              props.setOpenMenuKey(null);
              void props.onDelete();
            }}
          >
            Xóa thông báo
          </button>
        </div>
      ) : null}
    </div>
  );
}

function NotificationRowChrome(props: {
  rowKey: string;
  ids: string[];
  selectedIds: Set<string>;
  onToggleMany: (ids: string[], selected: boolean) => void;
  openMenuKey: string | null;
  setOpenMenuKey: (key: string | null) => void;
  onMarkRead: () => void | Promise<void>;
  onDelete: () => void | Promise<void>;
  children: ReactNode;
}): JSX.Element {
  const { ids, selectedIds } = props;
  const allOn = ids.length > 0 && ids.every((id) => selectedIds.has(id));
  const someOn = ids.some((id) => selectedIds.has(id));
  const indeterminate = someOn && !allOn;
  const cbRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (cbRef.current) cbRef.current.indeterminate = indeterminate;
  }, [indeterminate]);

  const menuKey = `row-${props.rowKey}`;

  return (
    <div className="flex items-stretch gap-2 sm:gap-3">
      <label className="mt-1 flex shrink-0 cursor-pointer items-start justify-center pt-1">
        <span className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg hover:bg-slate-100 active:bg-slate-200">
          <input
            ref={cbRef}
            type="checkbox"
            className="h-5 w-5 rounded border-slate-300"
            checked={allOn}
            onChange={() => props.onToggleMany(ids, !allOn)}
            onClick={(e) => e.stopPropagation()}
            aria-label="Chọn thông báo"
          />
        </span>
      </label>
      <div className="min-w-0 flex-1">{props.children}</div>
      <div className="shrink-0 pt-0.5">
        <NotificationOverflowMenu
          menuKey={menuKey}
          openMenuKey={props.openMenuKey}
          setOpenMenuKey={props.setOpenMenuKey}
          onMarkRead={props.onMarkRead}
          onDelete={props.onDelete}
        />
      </div>
    </div>
  );
}

function fmtVnd(n: number): string {
  return `${new Intl.NumberFormat("vi-VN").format(Math.round(n))}đ`;
}

function tabCategoryOf(item: AccountNotificationListItem): CustomerNotificationTabCategory {
  return normalizeCustomerNotificationCategory(item.category);
}

function isReferralRow(item: AccountNotificationListItem): boolean {
  const t = item.metadata && typeof item.metadata === "object" ? (item.metadata as Record<string, unknown>).type : null;
  return t === "AFFILIATE_REFERRAL";
}

function isPayoutFlowRow(item: AccountNotificationListItem): boolean {
  const t = item.metadata && typeof item.metadata === "object" ? (item.metadata as Record<string, unknown>).type : null;
  return t === "AFFILIATE_PAYOUT_FLOW";
}

function metaType(item: AccountNotificationListItem): string | null {
  const t = item.metadata && typeof item.metadata === "object" ? (item.metadata as Record<string, unknown>).type : null;
  return typeof t === "string" ? t : null;
}

/** Chỉ chọn layout/CTA — không dùng để lọc tab. */
function isOrderCustomerUiVariant(item: AccountNotificationListItem): boolean {
  return metaType(item) === "ORDER_CUSTOMER";
}

function isSystemCustomerUiVariant(item: AccountNotificationListItem): boolean {
  return metaType(item) === "SYSTEM_CUSTOMER";
}

function formatRelativeViFromNow(iso: string, nowMs: number): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";
  let diffSec = Math.round((nowMs - t) / 1000);
  if (diffSec < 0) diffSec = 0;
  if (diffSec < 45) return "vừa xong";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} phút trước`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} giờ trước`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)} ngày trước`;
  return new Date(iso).toLocaleString("vi-VN");
}

const NotificationRelativeTimeContext = createContext<number>(Date.now());

/** Một interval 60s cho toàn bộ thời gian tương đối trong panel (thay N timer / hàng). */
function NotificationRelativeTimeProvider({ children }: { children: ReactNode }): JSX.Element {
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  return <NotificationRelativeTimeContext.Provider value={nowMs}>{children}</NotificationRelativeTimeContext.Provider>;
}

function RelativeTimeVi({ iso }: { iso: string }): JSX.Element {
  const nowMs = useContext(NotificationRelativeTimeContext);
  const label = useMemo(() => formatRelativeViFromNow(iso, nowMs), [iso, nowMs]);
  return <span className="tabular-nums">{label}</span>;
}

function systemSeverityTone(sev: string | undefined): {
  icon: string;
  ring: string;
  bg: string;
  badgeClass: string;
  labelVi: string;
} {
  if (sev === "critical" || sev === "danger") {
    return {
      icon: "🛡",
      ring: "ring-rose-500",
      bg: "bg-rose-50",
      badgeClass: "border border-rose-200 bg-rose-100 text-rose-800",
      labelVi: "Nguy hiểm",
    };
  }
  if (sev === "warning") {
    return {
      icon: "⚠️",
      ring: "ring-amber-300",
      bg: "bg-[#FFFDF8]",
      badgeClass: "border border-amber-200 bg-amber-100 text-amber-900",
      labelVi: "Cảnh báo",
    };
  }
  return {
    icon: "ℹ️",
    ring: "ring-sky-300",
    bg: "bg-sky-50",
    badgeClass: "border border-sky-200 bg-sky-100 text-sky-900",
    labelVi: "Thông tin",
  };
}

function metaString(meta: Record<string, unknown> | null, key: string): string {
  const v = meta?.[key];
  return typeof v === "string" ? v.trim() : "";
}

function systemTypeLabel(meta: Record<string, unknown> | null): string {
  const st = metaString(meta, "systemType");
  const map: Record<string, string> = {
    NEW_SIGN_IN: "Đăng nhập",
    PASSWORD_CHANGED: "Mật khẩu",
    POLICY_UPDATED: "Chính sách",
  };
  return map[st] ?? st;
}

function PromotionCountdown({ expireAt }: { expireAt: string | null | undefined }): JSX.Element | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!expireAt) return undefined;
    const t = new Date(expireAt).getTime();
    if (!Number.isFinite(t)) return undefined;
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, [expireAt]);
  if (!expireAt) return null;
  const t = new Date(expireAt).getTime();
  if (!Number.isFinite(t)) return null;
  const left = Math.max(0, t - now);
  const h = Math.floor(left / 3600000);
  const m = Math.floor((left % 3600000) / 60000);
  if (left <= 0) return <p className="mt-1 text-[11px] font-semibold text-rose-600">Đã hết hạn</p>;
  return (
    <p className="mt-1 text-[11px] text-[#64748B]">
      Còn lại:{" "}
      <span className="font-semibold tabular-nums text-rose-700">
        {h > 0 ? `${h} giờ ` : ""}
        {m} phút
      </span>
    </p>
  );
}

function playDefaultChime(): void {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    g.gain.value = 0.06;
    o.frequency.value = 880;
    o.start();
    o.stop(ctx.currentTime + 0.14);
  } catch {
    /* noop */
  }
}

function playSoundFromSettings(tab: AffiliateCommissionTabSettings): void {
  if (!tab.soundEnabled) return;
  if (tab.soundMode === "off") return;
  if (tab.soundMode === "custom" && tab.soundCustomUrl.trim().startsWith("/")) {
    try {
      const a = new Audio(tab.soundCustomUrl.trim());
      void a.play().catch(() => {});
    } catch {
      playDefaultChime();
    }
    return;
  }
  playDefaultChime();
}

async function postAnalytics(
  eventName: "affiliate_notification_click" | "affiliate_commission_tab_open",
  metadata: Record<string, unknown>,
): Promise<void> {
  try {
    await fetch("/api/analytics/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventName,
        pathname: "/tai-khoan",
        metadata,
      }),
    });
  } catch {
    /* noop */
  }
}

type GroupedCommissionRow =
  | { kind: "single"; item: AccountNotificationListItem }
  | {
      kind: "bundle";
      items: AccountNotificationListItem[];
      latestAt: string;
      totalCommission: number;
      orderCount: number;
    };

/** Gộp các thông báo ORDER_PLACED liền nhau trong cửa sổ thời gian (theo cấu hình admin). */
function groupCommissionTabItems(
  items: AccountNotificationListItem[],
  windowMs: number,
  enabled: boolean,
): GroupedCommissionRow[] {
  if (!enabled) return items.map((item) => ({ kind: "single" as const, item }));

  const out: GroupedCommissionRow[] = [];
  let i = 0;
  while (i < items.length) {
    const cur = items[i]!;
    if (!isReferralRow(cur)) {
      out.push({ kind: "single", item: cur });
      i += 1;
      continue;
    }
    const meta = cur.metadata as Record<string, unknown> | null | undefined;
    const ev = typeof meta?.event === "string" ? meta.event : "";
    if (ev !== "ORDER_PLACED") {
      out.push({ kind: "single", item: cur });
      i += 1;
      continue;
    }
    const cluster: AccountNotificationListItem[] = [cur];
    const t0 = new Date(cur.createdAt).getTime();
    let j = i + 1;
    while (j < items.length) {
      const next = items[j]!;
      if (!isReferralRow(next)) break;
      const nm = next.metadata as Record<string, unknown> | null | undefined;
      const ne = typeof nm?.event === "string" ? nm.event : "";
      if (ne !== "ORDER_PLACED") break;
      if (t0 - new Date(next.createdAt).getTime() > windowMs) break;
      cluster.push(next);
      j += 1;
    }
    if (cluster.length >= 3) {
      const totalCommission = cluster.reduce((s, row) => {
        const m = row.metadata as Record<string, unknown> | undefined;
        const v = typeof m?.commissionAmount === "number" ? m.commissionAmount : Number(m?.commissionAmount ?? 0);
        return s + (Number.isFinite(v) ? v : 0);
      }, 0);
      out.push({
        kind: "bundle",
        items: cluster,
        latestAt: cluster[0]!.createdAt,
        totalCommission,
        orderCount: cluster.length,
      });
      i = j;
    } else {
      for (const row of cluster) out.push({ kind: "single", item: row });
      i = j;
    }
  }
  return out;
}

export function AccountNotificationsSection({
  title,
  notifications,
  notificationMutators,
  commissionTab,
  affiliateProgramEnabled,
  isAffiliateActive,
}: {
  title: string;
  notifications: CustomerNotificationsPollBundle;
  notificationMutators: CustomerNotificationPollMutators;
  commissionTab: AffiliateCommissionTabSettings;
  /** `website.affiliateEnabled` */
  affiliateProgramEnabled: boolean;
  isAffiliateActive: boolean;
}): JSX.Element {
  const router = useRouter();
  const showCommissionHub = Boolean(
    affiliateProgramEnabled && isAffiliateActive && commissionTab.tabEnabled,
  );

  const [filter, setFilter] = useState<NotificationFilter>("all");
  const [commissionHistoryRange, setCommissionHistoryRange] = useState<CommissionHistoryRange>("7d");
  const [income, setIncome] = useState<IncomeSummary | null>(null);
  const [incomeLoading, setIncomeLoading] = useState(false);
  const [listTake, setListTake] = useState(45);
  const [actionSheet, setActionSheet] = useState<AccountNotificationListItem | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [openMenuKey, setOpenMenuKey] = useState<string | null>(null);
  const prevCommissionUnreadRef = useRef(notifications.groups.commission);

  const setManySelected = useCallback((ids: string[], selected: boolean) => {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      for (const id of ids) {
        if (selected) n.add(id);
        else n.delete(id);
      }
      return n;
    });
  }, []);

  const markReadIdsOnly = useCallback(
    async (ids: string[]) => {
      if (!ids.length) return;
      try {
        const res = await fetch("/api/account/notifications/mark-read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ ids }),
        });
        const j = (await res.json()) as { ok?: boolean };
        if (res.ok && j.ok) notificationMutators.markReadIds(ids);
      } catch {
        /* noop */
      }
    },
    [notificationMutators],
  );

  const markReadQuiet = async (ids: string[]) => {
    await markReadIdsOnly(ids);
  };

  const confirmAndDeleteIds = useCallback(
    async (ids: string[], confirmMessage: string) => {
      if (!ids.length) return;
      if (!window.confirm(confirmMessage)) return;
      try {
        const res = await fetch("/api/account/notifications/bulk", {
          method: "DELETE",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ ids }),
        });
        const j = (await res.json()) as { ok?: boolean };
        if (!res.ok || !j.ok) return;
        notificationMutators.removeIds(ids);
        setManySelected(ids, false);
      } catch {
        /* noop */
      }
    },
    [notificationMutators, setManySelected],
  );

  const confirmDeleteAll = useCallback(async () => {
    if (!notifications.items.length) return;
    if (!window.confirm("Bạn có chắc muốn xóa toàn bộ thông báo?")) return;
    try {
      const res = await fetch("/api/account/notifications/all", {
        method: "DELETE",
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      });
      const j = (await res.json()) as { ok?: boolean };
      if (!res.ok || !j.ok) return;
      notificationMutators.replaceBundle({
        unread: 0,
        groups: { order: 0, promotion: 0, system: 0, commission: 0 },
        items: [],
      });
      setSelectedIds(new Set());
    } catch {
      /* noop */
    }
  }, [notificationMutators, notifications.items.length]);

  const confirmDeleteRead = useCallback(async () => {
    const readIds = notifications.items.filter((i) => i.read).map((i) => i.id);
    if (!readIds.length) return;
    if (!window.confirm("Bạn có chắc muốn xóa các thông báo đã đọc?")) return;
    try {
      const res = await fetch("/api/account/notifications/read", {
        method: "DELETE",
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      });
      const j = (await res.json()) as { ok?: boolean };
      if (!res.ok || !j.ok) return;
      setSelectedIds(new Set());
      await notificationMutators.reload();
    } catch {
      /* noop */
    }
  }, [notificationMutators, notifications.items]);

  const deleteOneById = useCallback(
    async (id: string) => {
      if (!window.confirm("Bạn có chắc muốn xóa thông báo này?")) return;
      try {
        const res = await fetch(`/api/account/notifications/${encodeURIComponent(id)}`, {
          method: "DELETE",
          credentials: "same-origin",
          headers: { Accept: "application/json" },
        });
        const j = (await res.json()) as { ok?: boolean };
        if (!res.ok || !j.ok) return;
        notificationMutators.removeIds([id]);
        setSelectedIds((prev) => {
          const n = new Set(prev);
          n.delete(id);
          return n;
        });
      } catch {
        /* noop */
      }
    },
    [notificationMutators],
  );

  const loadIncome = useCallback(async () => {
    if (!showCommissionHub || !commissionTab.showIncomeSummary) return;
    setIncomeLoading(true);
    try {
      const res = await fetch("/api/account/affiliate/income-summary", { credentials: "same-origin", cache: "no-store" });
      const j = (await res.json()) as Partial<IncomeSummary> & { ok?: boolean };
      if (!res.ok) {
        setIncome(null);
        return;
      }
      setIncome({
        todayCommission: Number(j.todayCommission ?? 0),
        monthCommission: Number(j.monthCommission ?? 0),
        pendingTotal: Number(j.pendingTotal ?? 0),
        paidTotal: Number(j.paidTotal ?? 0),
        affiliateOrderCount: Number(j.affiliateOrderCount ?? 0),
        statusTotals: {
          PENDING: Number(j.statusTotals?.PENDING ?? 0),
          WAITING_RELEASE: Number(j.statusTotals?.WAITING_RELEASE ?? 0),
          AVAILABLE: Number(j.statusTotals?.AVAILABLE ?? 0),
          APPROVED: Number(j.statusTotals?.APPROVED ?? 0),
          PAID: Number(j.statusTotals?.PAID ?? 0),
          CANCELLED: Number(j.statusTotals?.CANCELLED ?? 0),
        },
      });
    } catch {
      setIncome(null);
    } finally {
      setIncomeLoading(false);
    }
  }, [showCommissionHub, commissionTab.showIncomeSummary]);

  useEffect(() => {
    void loadIncome();
  }, [loadIncome, notifications.unread]);

  useEffect(() => {
    if (!showCommissionHub && filter === "commission") {
      setFilter("all");
    }
  }, [showCommissionHub, filter]);

  useEffect(() => {
    if (!showCommissionHub) return;
    const prev = prevCommissionUnreadRef.current;
    const next = notifications.groups.commission;
    if (next > prev && commissionTab.soundEnabled) {
      playSoundFromSettings(commissionTab);
    }
    prevCommissionUnreadRef.current = next;
  }, [notifications.groups.commission, commissionTab, showCommissionHub]);

  useEffect(() => {
    if (filter === "commission" && showCommissionHub) {
      void postAnalytics("affiliate_commission_tab_open", { source: "account_notifications_filter" });
    }
  }, [filter, showCommissionHub]);

  const filteredBase = useMemo(() => {
    if (filter === "all") return notifications.items;
    return notifications.items.filter((item) => tabCategoryOf(item) === filter);
  }, [filter, notifications.items]);

  /** Badge tab đồng bộ với payload (tránh DB groupBy > 0 nhưng take 60 không chứa bản ghi unread của tab). */
  const unreadInPayloadByCategory = useMemo(() => {
    const m = { order: 0, promotion: 0, system: 0, commission: 0 };
    for (const item of notifications.items) {
      if (item.read) continue;
      const c = tabCategoryOf(item);
      if (c === "order") m.order += 1;
      else if (c === "promotion") m.promotion += 1;
      else if (c === "system") m.system += 1;
      else m.commission += 1;
    }
    return m;
  }, [notifications.items]);

  const commissionUnreadInActiveHistoryRange = useMemo(
    () =>
      notifications.items.filter(
        (i) =>
          !i.read &&
          tabCategoryOf(i) === "commission" &&
          commissionHistoryIncludes(i.createdAt, commissionHistoryRange),
      ).length,
    [notifications.items, commissionHistoryRange],
  );

  const commissionDisplayRows = useMemo(() => {
    if (filter !== "commission") return null;
    const windowMs = commissionTab.groupWindowSeconds * 1000;
    return groupCommissionTabItems(filteredBase, windowMs, commissionTab.groupSimilarEnabled);
  }, [filter, filteredBase, commissionTab.groupSimilarEnabled, commissionTab.groupWindowSeconds]);

  /** Chuỗi render: chỉ category + grouping commission (metadata.type chỉ trong groupCommissionTabItems UI, không dùng loại khỏi tab khác). */
  const notificationGroupedRows = useMemo((): GroupedCommissionRow[] => {
    const inCommissionHistory = (createdAt: string): boolean =>
      filter !== "commission" || commissionHistoryIncludes(createdAt, commissionHistoryRange);

    if (filter === "commission" && commissionDisplayRows) {
      return commissionDisplayRows.filter((row) =>
        row.kind === "bundle" ? inCommissionHistory(row.latestAt) : inCommissionHistory(row.item.createdAt),
      );
    }

    return filteredBase.map((item) => ({ kind: "single" as const, item }));
  }, [filter, filteredBase, commissionDisplayRows, commissionHistoryRange]);

  const visibleNotificationRows = useMemo(
    () => notificationGroupedRows.slice(0, listTake),
    [notificationGroupedRows, listTake],
  );

  const commissionTabBadgeCount =
    filter === "commission" ? commissionUnreadInActiveHistoryRange : unreadInPayloadByCategory.commission;

  const groupRows = [
    { key: "order", label: "Đơn hàng", count: unreadInPayloadByCategory.order },
    ...(showCommissionHub ? [{ key: "commission" as const, label: "Hoa hồng", count: commissionTabBadgeCount }] : []),
    { key: "promotion", label: "Khuyến mãi", count: unreadInPayloadByCategory.promotion },
    { key: "system", label: "Hệ thống", count: unreadInPayloadByCategory.system },
  ] as const;
  const visibleGroups = filter === "all" ? groupRows : groupRows.filter((item) => item.key === filter);

  const onOpenItem = (item: AccountNotificationListItem, hrefOverride?: string) => {
    if (!item.read) void markReadQuiet([item.id]);
    if (isReferralRow(item) || isPayoutFlowRow(item)) {
      void postAnalytics("affiliate_notification_click", { notificationId: item.id, category: item.category });
    }
    const href = (hrefOverride || item.actionHref || "").trim();
    if (!href.startsWith("/") || href.startsWith("//")) return;
    router.push(href);
  };

  const hasAnyReadInFeed = useMemo(() => notifications.items.some((i) => i.read), [notifications.items]);

  const rowShell = (rowKey: string, ids: string[], markIds: string[]) => ({
    rowKey,
    ids,
    selectedIds,
    onToggleMany: setManySelected,
    openMenuKey,
    setOpenMenuKey,
    onMarkRead: () => void markReadIdsOnly(markIds),
    onDelete: () =>
      void (ids.length === 1
        ? deleteOneById(ids[0]!)
        : confirmAndDeleteIds(ids, "Bạn có chắc muốn xóa nhóm thông báo này?")),
  });

  const referralMeta = (item: AccountNotificationListItem) =>
    (item.metadata && typeof item.metadata === "object" ? item.metadata : null) as Record<string, unknown> | null;

  const swipeTabClass =
    "snap-center shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition whitespace-nowrap";

  return (
    <NotificationRelativeTimeProvider>
      <AccountPageTabPanel
        id="thong-bao"
        title={title}
        headingLevel="h2"
        toolbar={
          <>
            <div className="flex flex-wrap items-center justify-end gap-2 text-xs">
              {notifications.unread > 0 ? (
                <span className="inline-flex h-10 min-h-10 items-center rounded-xl bg-[#EF4444] px-3 font-semibold text-white shadow-sm">
                  {notifications.unread > 99 ? "99+ mới" : `${notifications.unread} mới`}
                </span>
              ) : null}
              {showCommissionHub && unreadInPayloadByCategory.commission > 0 ? (
                <span className="inline-flex h-10 min-h-10 items-center rounded-xl bg-emerald-600 px-3 font-semibold text-white shadow-sm">
                  Hoa hồng {unreadInPayloadByCategory.commission > 99 ? "99+" : unreadInPayloadByCategory.commission}
                </span>
              ) : null}
            </div>
            {notifications.items.length > 0 ? (
              <>
                <button
                  type="button"
                  className={ACCOUNT_PAGE_HEADER_TOOLBAR_BTN}
                  disabled={!hasAnyReadInFeed}
                  onClick={() => void confirmDeleteRead()}
                >
                  Xóa đã đọc
                </button>
                <button
                  type="button"
                  className={ACCOUNT_PAGE_HEADER_TOOLBAR_BTN_DANGER}
                  onClick={() => void confirmDeleteAll()}
                >
                  Xóa tất cả
                </button>
              </>
            ) : null}
          </>
        }
      >
      <div className="-mx-1 flex gap-1 overflow-x-auto pb-1 snap-x snap-mandatory sm:mx-0 sm:flex-wrap sm:overflow-visible">
        <button
          type="button"
          onClick={() => {
            setFilter("all");
            setListTake(45);
          }}
          className={`${swipeTabClass} ${filter === "all" ? "bg-[#2563EB] text-white" : "bg-[#F8FAFC] text-[#0F172A]"}`}
        >
          Tất cả
        </button>
        <button
          type="button"
          onClick={() => {
            setFilter("order");
            setListTake(45);
          }}
          className={`${swipeTabClass} ${filter === "order" ? "bg-[#2563EB] text-white" : "bg-[#F8FAFC] text-[#0F172A]"}`}
        >
          Đơn hàng
          {unreadInPayloadByCategory.order > 0
            ? ` (${unreadInPayloadByCategory.order > 99 ? "99+" : unreadInPayloadByCategory.order})`
            : ""}
        </button>
        {showCommissionHub ? (
          <button
            type="button"
            onClick={() => {
              setFilter("commission");
              setListTake(45);
            }}
            className={`${swipeTabClass} relative ${filter === "commission" ? "bg-[#2563EB] text-white" : "bg-[#F8FAFC] text-[#0F172A]"}`}
          >
            Hoa hồng
            {commissionTabBadgeCount > 0
              ? ` (${commissionTabBadgeCount > 99 ? "99+" : commissionTabBadgeCount})`
              : ""}
            {commissionTab.realtimeBadgeEnabled && commissionTabBadgeCount > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 animate-pulse rounded-full bg-[#EF4444] ring-2 ring-white" />
            ) : null}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => {
            setFilter("promotion");
            setListTake(45);
          }}
          className={`${swipeTabClass} ${filter === "promotion" ? "bg-[#2563EB] text-white" : "bg-[#F8FAFC] text-[#0F172A]"}`}
        >
          Khuyến mãi
          {unreadInPayloadByCategory.promotion > 0
            ? ` (${unreadInPayloadByCategory.promotion > 99 ? "99+" : unreadInPayloadByCategory.promotion})`
            : ""}
        </button>
        <button
          type="button"
          onClick={() => {
            setFilter("system");
            setListTake(45);
          }}
          className={`${swipeTabClass} ${filter === "system" ? "bg-[#2563EB] text-white" : "bg-[#F8FAFC] text-[#0F172A]"}`}
        >
          Hệ thống
          {unreadInPayloadByCategory.system > 0
            ? ` (${unreadInPayloadByCategory.system > 99 ? "99+" : unreadInPayloadByCategory.system})`
            : ""}
        </button>
      </div>

      {selectedIds.size > 0 ? (
        <div
          className="mt-3 flex flex-col gap-3 rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] p-3 sm:flex-row sm:items-center sm:justify-between"
          role="status"
        >
          <p className="text-sm font-medium text-[#0F172A]">
            Đã chọn: {selectedIds.size} thông báo
          </p>
          <button
            type="button"
            className="min-h-[44px] w-full rounded-xl bg-rose-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-rose-700 sm:w-auto"
            onClick={() =>
              void confirmAndDeleteIds(
                [...selectedIds],
                "Bạn có chắc muốn xóa các thông báo đã chọn?",
              )
            }
          >
            Xóa đã chọn
          </button>
        </div>
      ) : null}

      {showCommissionHub && filter === "commission" && commissionTab.showIncomeSummary ? (
        <div className="sticky top-0 z-10 mt-3 space-y-2 rounded-xl border border-emerald-100 bg-emerald-50/95 p-3 shadow-sm backdrop-blur sm:static sm:bg-emerald-50">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-900">Thu nhập CTV</p>
            {incomeLoading ? <span className="text-[11px] text-emerald-800">Đang cập nhật…</span> : null}
          </div>
          {income ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              <div className="@container/metric min-w-0 overflow-hidden rounded-lg bg-white/90 p-2 shadow-sm">
                <p className="text-[10px] font-medium text-[#64748B]">Hôm nay</p>
                <CtvFormattedValue value={`+${fmtVnd(income.todayCommission)}`} variant="money-sm" className="text-emerald-700" />
              </div>
              <div className="@container/metric min-w-0 overflow-hidden rounded-lg bg-white/90 p-2 shadow-sm">
                <p className="text-[10px] font-medium text-[#64748B]">Tháng này</p>
                <CtvFormattedValue value={`+${fmtVnd(income.monthCommission)}`} variant="money-sm" className="text-emerald-700" />
              </div>
              {commissionTab.showPendingCommission ? (
                <div className="@container/metric min-w-0 overflow-hidden rounded-lg bg-white/90 p-2 shadow-sm">
                  <p className="text-[10px] font-medium text-[#64748B]">Chờ duyệt</p>
                  <CtvFormattedValue value={fmtVnd(income.pendingTotal)} variant="money-sm" className="text-amber-700" />
                </div>
              ) : null}
              {commissionTab.showPaidCommission ? (
                <div className="@container/metric min-w-0 overflow-hidden rounded-lg bg-white/90 p-2 shadow-sm">
                  <p className="text-[10px] font-medium text-[#64748B]">Đã thanh toán</p>
                  <CtvFormattedValue value={fmtVnd(income.paidTotal)} variant="money-sm" />
                </div>
              ) : null}
              {commissionTab.showAffiliateOrderCount ? (
                <div className="@container/metric min-w-0 overflow-hidden rounded-lg bg-white/90 p-2 shadow-sm">
                  <p className="text-[10px] font-medium text-[#64748B]">Đơn affiliate</p>
                  <CtvFormattedValue value={String(income.affiliateOrderCount)} variant="metric" />
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-xs text-emerald-900">Chưa tải được tổng quan thu nhập.</p>
          )}
          <div className="flex flex-wrap gap-1">
            {(
              [
                { k: "today" as const, lab: "Hôm nay" },
                { k: "7d" as const, lab: "7 ngày" },
                { k: "30d" as const, lab: "30 ngày" },
                { k: "month" as const, lab: "Tháng này" },
              ] satisfies { k: CommissionHistoryRange; lab: string }[]
            ).map((r) => (
              <button
                key={r.k}
                type="button"
                onClick={() => setCommissionHistoryRange(r.k)}
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                  commissionHistoryRange === r.k ? "bg-emerald-700 text-white" : "bg-white text-emerald-900 ring-1 ring-emerald-200"
                }`}
              >
                {r.lab}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-emerald-800">
            Lọc lịch sử: {commissionHistoryRange} — áp dụng trên danh sách thông báo bên dưới (theo mốc thời gian tạo thông báo).
          </p>
        </div>
      ) : null}

      {visibleGroups.some((item) => item.count > 0) ? (
        <div className="mt-3 space-y-2">
          <p className="text-[11px] font-medium uppercase tracking-wide text-[#64748B]">Chưa đọc theo nhóm</p>
          {visibleGroups.map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-sm"
            >
              <span className="text-[#0F172A]">{item.label}</span>
              <span className="rounded-full bg-white px-2 py-0.5 text-xs text-[#2563EB]">{item.count}</span>
            </div>
          ))}
        </div>
      ) : null}

      {!visibleNotificationRows.length ? (
        notifications.items.length === 0 ? (
          <div className="mt-6 flex flex-col items-center rounded-2xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-6 py-10 text-center">
            <span className="text-4xl" aria-hidden>
              🔔
            </span>
            <p className="mt-3 text-base font-semibold text-[#0F172A]">Không có thông báo nào</p>
            <p className="mt-1 max-w-sm text-sm text-[#64748B]">Bạn đã xem và xử lý tất cả thông báo.</p>
            <button
              type="button"
              className="mt-5 min-h-[44px] rounded-xl bg-[#2563EB] px-5 text-sm font-semibold text-white shadow-sm hover:bg-[#1D4ED8]"
              onClick={() => void notificationMutators.reload()}
            >
              Tải lại
            </button>
          </div>
        ) : (
          <p className="mt-4 text-sm text-[#64748B]">
            {filteredBase.length > 0 && filter === "commission"
              ? "Không có thông báo trong khoảng thời gian đã chọn."
              : "Chưa có thông báo trong mục này."}
          </p>
        )
      ) : (
        <ul className="mt-4 space-y-2" aria-label="Danh sách thông báo">
          {visibleNotificationRows.map((entry, idx) => {
              if (entry.kind === "bundle") {
                const bundleIds = entry.items.map((i) => i.id);
                return (
                  <li key={`bundle-${idx}`} className="overflow-hidden rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] shadow-sm">
                    <div className="p-2 sm:p-3">
                      <NotificationRowChrome {...rowShell(`bundle-${idx}`, bundleIds, bundleIds)}>
                        <div className="w-full text-left">
                          <p className="text-sm font-semibold text-[#0F172A]">
                            {entry.orderCount} đơn hàng mới qua link affiliate của bạn.
                          </p>
                          <p className="mt-1 text-xs text-[#64748B]">
                            Tổng hoa hồng (ước tính):{" "}
                            <span className="font-semibold text-emerald-700">{fmtVnd(entry.totalCommission)}</span>
                            {" · "}
                            Mới nhất: {new Date(entry.latestAt).toLocaleString("vi-VN")}
                          </p>
                          <button
                            type="button"
                            className="mt-2 min-h-[44px] text-left text-xs font-semibold text-[#2563EB] hover:underline"
                            onClick={() => void markReadQuiet(bundleIds)}
                          >
                            Đánh dấu đã đọc nhóm
                          </button>
                        </div>
                      </NotificationRowChrome>
                    </div>
                  </li>
                );
              }

              const item = entry.item;
              const meta = referralMeta(item);
              const isRef = isReferralRow(item);
              const isPayout = isPayoutFlowRow(item);
              const cat = tabCategoryOf(item);
              const badge =
                cat === "order"
                  ? "Đơn hàng"
                  : cat === "promotion"
                    ? "Khuyến mãi"
                    : cat === "commission"
                      ? "Hoa hồng"
                      : "Hệ thống";
              const img =
                commissionTab.previewProductEnabled && typeof meta?.firstProductImageUrl === "string"
                  ? meta.firstProductImageUrl
                  : null;
              const buyer =
                commissionTab.maskedCustomerEnabled && typeof meta?.buyerLabel === "string" ? (meta.buyerLabel as string) : null;

              if (cat === "order" && isOrderCustomerUiVariant(item) && meta) {
                const preview = typeof meta.previewImage === "string" ? (meta.previewImage as string) : null;
                const code = typeof meta.orderCode === "string" ? (meta.orderCode as string) : "";
                const st = typeof meta.orderStatus === "string" ? (meta.orderStatus as string) : "";
                const amtRaw = meta.totalAmount;
                const amt = typeof amtRaw === "number" ? amtRaw : Number(amtRaw ?? 0);
                const trackHref =
                  typeof meta.deepLink === "string" && meta.deepLink.startsWith("/")
                    ? (meta.deepLink as string)
                    : "/tai-khoan?tab=tracking";
                const viewHref = "/tai-khoan?tab=orders";
                return (
                  <li
                    key={item.id}
                    className={`overflow-hidden rounded-xl border text-left ${
                      item.read ? "border-[#E2E8F0] bg-white" : "border-[#BFDBFE] bg-[#EFF6FF]"
                    }`}
                  >
                    <div className="p-1 sm:p-2">
                      <NotificationRowChrome {...rowShell(item.id, [item.id], [item.id])}>
                        <div className="px-2 py-2 sm:px-3 sm:py-3">
                          <div className="flex gap-3">
                        {preview ? (
                          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-[#E2E8F0] bg-[#F8FAFC]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={preview} alt="" className="h-full w-full object-cover" loading="lazy" />
                          </div>
                        ) : (
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-[#E2E8F0] bg-[#F1F5F9] text-xl">
                            📦
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-sm font-semibold text-[#0F172A]">{item.title}</span>
                            <span className="text-[11px] text-[#64748B]">
                              {new Date(item.createdAt).toLocaleString("vi-VN")}
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] font-medium text-[#2563EB]">Đơn hàng</p>
                          <dl className="mt-1 grid grid-cols-1 gap-0.5 text-[11px] text-[#64748B] sm:grid-cols-2">
                            {code ? (
                              <div className="flex justify-between gap-2 sm:block">
                                <dt>Mã đơn</dt>
                                <dd className="font-semibold text-[#0F172A]">{code}</dd>
                              </div>
                            ) : null}
                            {st ? (
                              <div className="flex justify-between gap-2 sm:block">
                                <dt>Trạng thái</dt>
                                <dd className="font-medium">{formatOrderStatus(st)}</dd>
                              </div>
                            ) : null}
                            <div className="flex justify-between gap-2 sm:block">
                              <dt>Tiền đơn</dt>
                              <dd className="font-semibold tabular-nums">{fmtVnd(Number.isFinite(amt) ? amt : 0)}</dd>
                            </div>
                          </dl>
                          <p className="mt-1 whitespace-pre-wrap text-sm text-[#334155]">{item.body}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <button
                              type="button"
                              className="rounded-lg border border-[#E2E8F0] bg-white px-2 py-1 text-xs font-semibold text-[#2563EB]"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenItem(item, viewHref);
                              }}
                            >
                              Xem đơn
                            </button>
                            <button
                              type="button"
                              className="rounded-lg border border-[#E2E8F0] bg-white px-2 py-1 text-xs font-semibold text-[#2563EB]"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenItem(item, trackHref);
                              }}
                            >
                              Theo dõi đơn
                            </button>
                          </div>
                        </div>
                      </div>
                        </div>
                      </NotificationRowChrome>
                    </div>
                  </li>
                );
              }

              if (cat === "order") {
                const href =
                  typeof item.actionHref === "string" && item.actionHref.startsWith("/")
                    ? item.actionHref
                    : "/tai-khoan?tab=orders";
                return (
                  <li
                    key={item.id}
                    className={`overflow-hidden rounded-xl border ${
                      item.read ? "border-[#E2E8F0] bg-white" : "border-[#BFDBFE] bg-[#EFF6FF]"
                    }`}
                  >
                    <div className="p-1 sm:p-2">
                      <NotificationRowChrome {...rowShell(item.id, [item.id], [item.id])}>
                        <NotificationRowClickable
                          onActivate={() => onOpenItem(item, href)}
                          className="w-full cursor-pointer rounded-none border-0 px-2 py-2 text-left transition hover:bg-[#F8FAFC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 sm:px-3 sm:py-3"
                        >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-[#0F172A]">{item.title}</span>
                        <span className="text-[11px] text-[#64748B]">
                          {new Date(item.createdAt).toLocaleString("vi-VN")}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] font-medium text-[#2563EB]">Đơn hàng</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-[#334155]">{item.body}</p>
                      <p className="mt-2 text-xs font-semibold text-[#2563EB]">Xem chi tiết →</p>
                    </NotificationRowClickable>
                      </NotificationRowChrome>
                    </div>
                  </li>
                );
              }

              if (cat === "promotion") {
                const m = (meta && typeof meta === "object" ? meta : null) as Record<string, unknown> | null;
                const banner = typeof m?.banner === "string" ? (m.banner as string) : null;
                const cta = typeof m?.ctaLabel === "string" ? (m.ctaLabel as string) : "Xem ưu đãi";
                const expireAt = typeof m?.expireAt === "string" ? (m.expireAt as string) : null;
                const deep =
                  (typeof m?.deepLink === "string" && (m.deepLink as string).startsWith("/")
                    ? (m.deepLink as string)
                    : typeof item.actionHref === "string" && item.actionHref.startsWith("/")
                      ? item.actionHref
                      : "/") || "/";

                return (
                  <li
                    key={item.id}
                    className={`overflow-hidden rounded-xl border ${
                      item.read ? "border-[#E2E8F0] bg-white" : "border-fuchsia-200 bg-fuchsia-50/60"
                    }`}
                  >
                    <div className="p-1 sm:p-2">
                      <NotificationRowChrome {...rowShell(item.id, [item.id], [item.id])}>
                        <div className="px-2 py-2 text-left sm:px-3 sm:py-3">
                      {banner ? (
                        <div className="mb-2 overflow-hidden rounded-lg border border-[#E2E8F0] bg-[#F8FAFC]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={banner} alt="" className="h-28 w-full object-cover sm:h-32" loading="lazy" />
                        </div>
                      ) : null}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-[#0F172A]">{item.title}</span>
                        <span className="text-[11px] text-[#64748B]">{new Date(item.createdAt).toLocaleString("vi-VN")}</span>
                      </div>
                      <p className="mt-1 text-[11px] font-medium text-fuchsia-700">Khuyến mãi</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-[#334155]">{item.body}</p>
                      <PromotionCountdown expireAt={expireAt} />
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="rounded-lg bg-fuchsia-600 px-3 py-1.5 text-xs font-semibold text-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenItem(item, deep);
                          }}
                        >
                          {cta}
                        </button>
                        <button
                          type="button"
                          className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-semibold text-[#2563EB]"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenItem(item, "/");
                          }}
                        >
                          Mua ngay
                        </button>
                      </div>
                        </div>
                      </NotificationRowChrome>
                    </div>
                  </li>
                );
              }

              if (cat === "system" && isSystemCustomerUiVariant(item) && meta) {
                const sysType = metaString(meta as Record<string, unknown>, "systemType");
                const sevRaw = typeof meta.severity === "string" ? meta.severity : "info";
                const tone = systemSeverityTone(sevRaw);
                const deep =
                  typeof meta.deepLink === "string" && meta.deepLink.startsWith("/") ? (meta.deepLink as string) : null;
                const securityHref = "/tai-khoan?tab=security";
                const m = meta as Record<string, unknown>;

                if (sysType === "NEW_SIGN_IN") {
                  const browser = metaString(m, "browser");
                  const os = metaString(m, "os");
                  const device = metaString(m, "device");
                  const ip = metaString(m, "ip");
                  const providerLabel =
                    metaString(m, "providerLabelVi") || metaString(m, "provider") || "Đăng nhập";

                  const browserOsLine = [browser, os].filter(Boolean).join(" · ") || "";
                  const meHandler = (): void => {
                    void markReadQuiet([item.id]);
                  };

                  return (
                    <li
                      key={item.id}
                      className={`overflow-hidden rounded-xl border text-left shadow-sm ring-1 ${tone.ring} ${tone.bg} ${
                        item.read ? "border-[#E2E8F0] bg-white" : "border-[#E2E8F0]"
                      }`}
                    >
                      <div className="p-1 sm:p-2">
                        <NotificationRowChrome {...rowShell(item.id, [item.id], [item.id])}>
                          <article className="relative w-full border-0 bg-transparent px-2 py-2 text-left sm:px-3 sm:py-3">
                        <div className="absolute right-2 top-2">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${tone.badgeClass}`}>
                            {tone.labelVi}
                          </span>
                        </div>
                        <div className="flex gap-3 pr-20">
                          <span className="text-2xl leading-none text-violet-600" aria-hidden>
                            🔐
                          </span>
                          <div className="min-w-0 flex-1 space-y-1">
                            <p className="text-sm font-semibold text-[#0F172A]">{item.title}</p>
                            {browserOsLine ? (
                              <p className="text-[12px] font-medium text-[#1E293B]">{browserOsLine}</p>
                            ) : null}
                            {device ? (
                              <p className="text-[11px] text-[#64748B]">
                                Loại thiết bị: <span className="font-medium text-[#64748B]">{device}</span>
                              </p>
                            ) : null}
                            <p className="text-[11px] text-[#64748B]">
                              IP:{" "}
                              <span className="font-semibold tabular-nums text-[#0F172A]">
                                {ip || "—"}
                              </span>
                            </p>
                            <p className="text-[11px] text-[#64748B]">
                              Loại đăng nhập: <span className="font-semibold text-[#0F172A]">{providerLabel}</span>
                            </p>
                            <p className="text-[11px] text-[#64748B]">
                              Thời gian:{" "}
                              <RelativeTimeVi iso={item.createdAt} />{" "}
                              <span className="opacity-75">({new Date(item.createdAt).toLocaleString("vi-VN")})</span>
                            </p>
                            <p className="mt-1 whitespace-pre-wrap text-sm text-[#334155]">{item.body}</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <button
                                type="button"
                                className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  meHandler();
                                }}
                              >
                                Đây là tôi
                              </button>
                              <button
                                type="button"
                                className="rounded-lg border border-rose-300 bg-white px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(securityHref);
                                }}
                              >
                                Không phải tôi
                              </button>
                              <button
                                type="button"
                                className="rounded-lg border border-[#E2E8F0] bg-white px-2.5 py-1 text-xs font-semibold text-[#2563EB] hover:bg-[#F8FAFC]"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(securityHref);
                                }}
                              >
                                Đổi mật khẩu
                              </button>
                              {deep ? (
                                <button
                                  type="button"
                                  className="rounded-lg border border-transparent px-2.5 py-1 text-xs font-semibold text-[#64748B] underline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(deep);
                                  }}
                                >
                                  Bảo mật tài khoản →
                                </button>
                              ) : null}
                            </div>
                          </div>
                        </div>
                          </article>
                        </NotificationRowChrome>
                      </div>
                    </li>
                  );
                }

                return (
                  <li
                    key={item.id}
                    className={`overflow-hidden rounded-xl border text-left shadow-sm ring-1 ${tone.ring} ${tone.bg} ${
                      item.read ? "border-[#E2E8F0] bg-white" : "border-[#E2E8F0]"
                    }`}
                  >
                    <div className="p-1 sm:p-2">
                      <NotificationRowChrome {...rowShell(item.id, [item.id], [item.id])}>
                        <NotificationRowClickable
                          onActivate={() => onOpenItem(item, deep ?? undefined)}
                          className="w-full cursor-pointer rounded-none border-0 px-2 py-2 text-left transition hover:bg-[#F8FAFC]/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 sm:px-3 sm:py-3"
                        >
                      <div className="flex gap-2">
                        <span className="text-lg" aria-hidden>
                          {tone.icon}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-sm font-semibold text-[#0F172A]">{item.title}</span>
                            <span className="flex shrink-0 flex-wrap items-center gap-2">
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${tone.badgeClass}`}
                              >
                                {tone.labelVi}
                              </span>
                              <span className="text-[11px] text-[#64748B]">
                                <RelativeTimeVi iso={item.createdAt} />
                              </span>
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] font-medium text-[#334155]">
                            Hệ thống · {systemTypeLabel(meta as Record<string, unknown>) || sysType || " — "}
                          </p>
                          <p className="mt-1 whitespace-pre-wrap text-sm text-[#334155]">{item.body}</p>
                          {deep ? (
                            <p className="mt-2 text-xs font-semibold text-[#2563EB]">Mở chi tiết →</p>
                          ) : null}
                        </div>
                      </div>
                    </NotificationRowClickable>
                      </NotificationRowChrome>
                    </div>
                  </li>
                );
              }

              // promotion handled above (always)

              if (cat === "commission") {
                const m = (meta && typeof meta === "object" ? meta : null) as Record<string, unknown> | null;
                const lifecycleType = readAffiliateCommissionNotificationType(m);
                if (lifecycleType) {
                  const vis = commissionLifecycleNotificationVisual(lifecycleType);
                  const href =
                    typeof item.actionHref === "string" && item.actionHref.startsWith("/")
                      ? item.actionHref
                      : typeof m?.actionWalletHref === "string" && (m.actionWalletHref as string).startsWith("/")
                        ? (m.actionWalletHref as string)
                        : "/tai-khoan?tab=affiliate&sub=earnings";
                  const orderCode =
                    typeof m?.orderCode === "string"
                      ? (m.orderCode as string).length > 14
                        ? `…${(m.orderCode as string).slice(-10)}`
                        : (m.orderCode as string)
                      : null;
                  const amount =
                    typeof m?.commissionAmount === "number"
                      ? (m.commissionAmount as number)
                      : Number(m?.commissionAmount ?? 0);

                  return (
                    <li
                      key={item.id}
                      className={`overflow-hidden rounded-xl border ${
                        item.read ? "border-[#E2E8F0] bg-white" : `${vis.unreadBorder} ${vis.unreadBg}`
                      }`}
                    >
                      <div className="p-1 sm:p-2">
                        <NotificationRowChrome {...rowShell(item.id, [item.id], [item.id])}>
                          <NotificationRowClickable
                            onActivate={() => onOpenItem(item, href)}
                            className="relative w-full cursor-pointer rounded-none border-0 px-2 py-2 text-left transition hover:opacity-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 sm:px-3 sm:py-3"
                          >
                            {!item.read ? (
                              <span
                                className="absolute right-3 top-3 h-2 w-2 rounded-full bg-[#2563EB]"
                                aria-hidden
                              />
                            ) : null}
                            <div className="flex gap-3 pr-4">
                              <span className="text-2xl leading-none" aria-hidden>
                                {vis.icon}
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <span className="text-sm font-semibold text-[#0F172A]">{item.title}</span>
                                  <span className="text-[11px] text-[#64748B]">
                                    <RelativeTimeVi iso={item.createdAt} />
                                  </span>
                                </div>
                                <p className={`mt-0.5 text-[11px] font-semibold ${vis.accentText}`}>{vis.label}</p>
                                {orderCode || Number.isFinite(amount) ? (
                                  <dl className="mt-1 grid grid-cols-1 gap-0.5 text-[11px] text-[#64748B] sm:grid-cols-2">
                                    {orderCode ? (
                                      <div className="flex justify-between gap-2 sm:block">
                                        <dt>Mã đơn</dt>
                                        <dd className="font-semibold text-[#0F172A]">#{orderCode}</dd>
                                      </div>
                                    ) : null}
                                    {Number.isFinite(amount) && amount > 0 ? (
                                      <div className="flex justify-between gap-2 sm:block">
                                        <dt>Hoa hồng</dt>
                                        <dd className="font-semibold tabular-nums text-emerald-700">{fmtVnd(amount)}</dd>
                                      </div>
                                    ) : null}
                                  </dl>
                                ) : null}
                                <p className="mt-1 whitespace-pre-wrap text-sm text-[#334155]">{item.body}</p>
                                <p className="mt-2 text-xs font-semibold text-[#2563EB]">Xem hoa hồng & đối soát →</p>
                              </div>
                            </div>
                          </NotificationRowClickable>
                        </NotificationRowChrome>
                      </div>
                    </li>
                  );
                }
              }

              if (cat === "system") {
                const deep =
                  typeof item.actionHref === "string" && item.actionHref.startsWith("/") ? item.actionHref : null;
                const sevRaw = meta && typeof meta.severity === "string" ? meta.severity : "info";
                const tone = systemSeverityTone(sevRaw);
                return (
                  <li
                    key={item.id}
                    className={`overflow-hidden rounded-xl border text-left shadow-sm ring-1 ${tone.ring} ${tone.bg} ${
                      item.read ? "border-[#E2E8F0] bg-white" : "border-[#E2E8F0]"
                    }`}
                  >
                    <div className="p-1 sm:p-2">
                      <NotificationRowChrome {...rowShell(item.id, [item.id], [item.id])}>
                        <NotificationRowClickable
                          onActivate={() => onOpenItem(item, deep ?? undefined)}
                          className="w-full cursor-pointer rounded-none border-0 px-2 py-2 text-left transition hover:bg-[#F8FAFC]/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 sm:px-3 sm:py-3"
                        >
                      <div className="flex gap-2">
                        <span className="text-lg" aria-hidden>
                          {tone.icon}
                        </span>
                        <div className="min-w-0 flex-1 text-left">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-sm font-semibold text-[#0F172A]">{item.title}</span>
                            <span className="flex shrink-0 flex-wrap items-center gap-2">
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${tone.badgeClass}`}
                              >
                                {tone.labelVi}
                              </span>
                              <span className="text-[11px] text-[#64748B]">
                                <RelativeTimeVi iso={item.createdAt} />
                              </span>
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] font-medium text-[#334155]">Hệ thống</p>
                          <p className="mt-1 whitespace-pre-wrap text-sm text-[#334155]">{item.body}</p>
                          {deep ? <p className="mt-2 text-xs font-semibold text-[#2563EB]">Mở chi tiết →</p> : null}
                        </div>
                      </div>
                    </NotificationRowClickable>
                      </NotificationRowChrome>
                    </div>
                  </li>
                );
              }

              return (
                <li
                  key={item.id}
                  className={`overflow-hidden rounded-xl border ${
                    item.read ? "border-[#E2E8F0] bg-white" : "border-[#BFDBFE] bg-[#EFF6FF]"
                  }`}
                >
                  <div className="p-1 sm:p-2">
                    <NotificationRowChrome {...rowShell(item.id, [item.id], [item.id])}>
                      <NotificationRowClickable
                        onActivate={() => {
                          if (window.matchMedia("(max-width: 767px)").matches && (isRef || isPayout)) {
                            setActionSheet(item);
                            return;
                          }
                          onOpenItem(item);
                        }}
                        className="w-full cursor-pointer rounded-none border-0 px-2 py-2 text-left transition hover:bg-[#F8FAFC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 sm:px-3 sm:py-3"
                      >
                    <div className="flex gap-3">
                      {img ? (
                        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-[#E2E8F0] bg-[#F8FAFC]">
                          {/* eslint-disable-next-line @next/next/no-img-element -- URL sản phẩm từ DB, không ràng buộc domain ảnh cố định */}
                          <img src={img} alt="" className="h-full w-full object-cover" loading="lazy" />
                        </div>
                      ) : isRef ? (
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-[#E2E8F0] bg-[#F1F5F9] text-xl">
                          💹
                        </div>
                      ) : null}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-[#0F172A]">
                            <span className="min-w-0 truncate">{item.title}</span>
                          </span>
                          <span className="text-[11px] text-[#64748B]">
                            {new Date(item.createdAt).toLocaleString("vi-VN")}
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] font-medium text-[#2563EB]">{badge}</p>
                        {buyer ? (
                          <p className="mt-0.5 text-[11px] text-[#64748B]">
                            Khách: <span className="font-medium text-[#0F172A]">{buyer}</span>
                          </p>
                        ) : null}
                        {isRef && meta ? (
                          <dl className="mt-1 grid grid-cols-1 gap-0.5 text-[11px] text-[#64748B] sm:grid-cols-2">
                            {typeof meta.orderCode === "string" ? (
                              <div className="flex justify-between gap-2 sm:block">
                                <dt>Mã đơn</dt>
                                <dd className="font-semibold text-[#0F172A]">{meta.orderCode as string}</dd>
                              </div>
                            ) : null}
                            {typeof meta.orderAmount === "number" ? (
                              <div className="flex justify-between gap-2 sm:block">
                                <dt>Tiền đơn</dt>
                                <dd className="font-semibold tabular-nums">{fmtVnd(meta.orderAmount as number)}</dd>
                              </div>
                            ) : null}
                            {typeof meta.commissionAmount === "number" ? (
                              <div className="flex justify-between gap-2 sm:block">
                                <dt>Hoa hồng</dt>
                                <dd className="font-semibold tabular-nums text-emerald-700">{fmtVnd(meta.commissionAmount as number)}</dd>
                              </div>
                            ) : null}
                            {typeof meta.commissionStatusVi === "string" ? (
                              <div className="flex justify-between gap-2 sm:block">
                                <dt>Trạng thái HH</dt>
                                <dd className="font-medium">{meta.commissionStatusVi as string}</dd>
                              </div>
                            ) : null}
                          </dl>
                        ) : null}
                        <p className="mt-1 whitespace-pre-wrap text-sm text-[#334155]">{item.body}</p>
                        {!isRef && !isPayout ? null : (
                          <div className="mt-2 hidden flex-wrap gap-2 sm:flex">
                            {isRef ? (
                              <>
                                <button
                                  type="button"
                                  className="rounded-lg border border-[#E2E8F0] bg-white px-2 py-1 text-xs font-semibold text-[#2563EB]"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const h = typeof meta?.actionOrderHref === "string" ? meta.actionOrderHref : item.actionHref;
                                    onOpenItem(item, h ?? undefined);
                                  }}
                                >
                                  Xem đơn
                                </button>
                                <button
                                  type="button"
                                  className="rounded-lg border border-[#E2E8F0] bg-white px-2 py-1 text-xs font-semibold text-[#2563EB]"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const h = typeof meta?.actionWalletHref === "string" ? meta.actionWalletHref : "/tai-khoan?tab=affiliate&sub=earnings";
                                    onOpenItem(item, h);
                                  }}
                                >
                                  Xem ví hoa hồng
                                </button>
                                <button
                                  type="button"
                                  className="rounded-lg border border-[#E2E8F0] bg-white px-2 py-1 text-xs font-semibold text-[#2563EB]"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const h =
                                      typeof meta?.actionWithdrawHref === "string"
                                        ? meta.actionWithdrawHref
                                        : "/tai-khoan?tab=affiliate&sub=withdrawal";
                                    onOpenItem(item, h);
                                  }}
                                >
                                  Rút tiền
                                </button>
                              </>
                            ) : (
                              <Link
                                href="/tai-khoan?tab=affiliate&sub=withdrawal#affiliate-payout-account"
                                className="text-xs font-semibold text-[#2563EB] hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                Mở ví nhận tiền
                              </Link>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </NotificationRowClickable>
                    </NotificationRowChrome>
                  </div>
                </li>
              );
          })}
        </ul>
      )}

      {(() => {
        if (listTake >= 500) return null;
        const listLen = notificationGroupedRows.length;
        return listLen > listTake ? (
          <button
            type="button"
            className="mt-3 w-full rounded-xl border border-[#E2E8F0] py-2 text-sm font-semibold text-[#2563EB] hover:bg-[#F8FAFC]"
            onClick={() => setListTake((v) => v + 40)}
          >
            Tải thêm
          </button>
        ) : null;
      })()}

      <p className="mt-6 text-[11px] text-[#94A3B8]">
        Mẹo: bấm thông báo để đánh dấu đã đọc và điều hướng nhanh.{" "}
        <Link href="/tai-khoan?tab=affiliate&sub=withdrawal#affiliate-payout-account" className="text-[#2563EB] hover:underline">
          Tới tài khoản nhận tiền
        </Link>
      </p>

      {actionSheet ? (
        <div className="fixed inset-0 z-[80] md:hidden" role="dialog" aria-modal="true" aria-label="Thao tác thông báo">
          <button type="button" className="absolute inset-0 bg-black/40" onClick={() => setActionSheet(null)} aria-label="Đóng" />
          <div
            className="absolute bottom-0 left-0 right-0 rounded-t-2xl border border-[#E2E8F0] bg-white p-4 shadow-2xl"
            style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}
          >
            <p className="text-sm font-semibold text-[#0F172A] line-clamp-2">{actionSheet.title}</p>
            <div className="mt-3 flex flex-col gap-2">
              <button
                type="button"
                className="h-11 rounded-xl bg-[#2563EB] text-sm font-semibold text-white"
                onClick={() => {
                  const meta = referralMeta(actionSheet);
                  const h = typeof meta?.actionOrderHref === "string" ? meta.actionOrderHref : actionSheet.actionHref;
                  setActionSheet(null);
                  onOpenItem(actionSheet, h ?? undefined);
                }}
              >
                Xem đơn
              </button>
              <button
                type="button"
                className="h-11 rounded-xl border border-[#E2E8F0] text-sm font-semibold text-[#0F172A]"
                onClick={() => {
                  const meta = referralMeta(actionSheet);
                  const h = typeof meta?.actionWalletHref === "string" ? meta.actionWalletHref : "/tai-khoan?tab=affiliate&sub=earnings";
                  setActionSheet(null);
                  onOpenItem(actionSheet, h);
                }}
              >
                Xem ví hoa hồng
              </button>
              <button
                type="button"
                className="h-11 rounded-xl border border-[#E2E8F0] text-sm font-semibold text-[#0F172A]"
                onClick={() => {
                  const meta = referralMeta(actionSheet);
                  const h =
                    typeof meta?.actionWithdrawHref === "string"
                      ? meta.actionWithdrawHref
                      : "/tai-khoan?tab=affiliate&sub=withdrawal";
                  setActionSheet(null);
                  onOpenItem(actionSheet, h);
                }}
              >
                Rút tiền
              </button>
              <button
                type="button"
                className="min-h-[48px] rounded-xl border border-[#E2E8F0] text-sm font-semibold text-[#0F172A]"
                onClick={() => {
                  const id = actionSheet.id;
                  setActionSheet(null);
                  void markReadIdsOnly([id]);
                }}
              >
                Đánh dấu đã đọc
              </button>
              <button
                type="button"
                className="min-h-[48px] rounded-xl border border-rose-200 text-sm font-semibold text-rose-700"
                onClick={() => {
                  const id = actionSheet.id;
                  setActionSheet(null);
                  void deleteOneById(id);
                }}
              >
                Xóa thông báo
              </button>
              <button type="button" className="min-h-[44px] text-sm text-[#64748B]" onClick={() => setActionSheet(null)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      ) : null}
      </AccountPageTabPanel>
    </NotificationRelativeTimeProvider>
  );
}
