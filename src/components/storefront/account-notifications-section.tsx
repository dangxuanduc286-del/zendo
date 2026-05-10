"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { AffiliateCommissionTabSettings } from "@/lib/affiliate-commission-tab-settings";
import { formatOrderStatus } from "@/lib/admin-order";
import type { CustomerNotificationsPollBundle } from "@/lib/use-customer-notifications-poll";

export type AccountNotificationListItem = CustomerNotificationsPollBundle["items"][number];

type IncomeSummary = {
  todayCommission: number;
  monthCommission: number;
  pendingTotal: number;
  paidTotal: number;
  affiliateOrderCount: number;
  statusTotals: { PENDING: number; APPROVED: number; PAID: number; CANCELLED: number };
};

type NotificationFilter = "all" | "order" | "commission" | "promotion" | "system";

type CommissionHistoryRange = "today" | "7d" | "30d" | "month";

function fmtVnd(n: number): string {
  return `${new Intl.NumberFormat("vi-VN").format(Math.round(n))}đ`;
}

function isCommissionishRow(item: AccountNotificationListItem): boolean {
  if (item.category === "commission") return true;
  const t = item.metadata && typeof item.metadata === "object" ? (item.metadata as Record<string, unknown>).type : null;
  return item.category === "order" && t === "AFFILIATE_REFERRAL";
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

function isOrderCustomerRow(item: AccountNotificationListItem): boolean {
  return metaType(item) === "ORDER_CUSTOMER";
}

function isPromotionCampaignRow(item: AccountNotificationListItem): boolean {
  return metaType(item) === "PROMOTION_CAMPAIGN";
}

function isSystemCustomerRow(item: AccountNotificationListItem): boolean {
  return metaType(item) === "SYSTEM_CUSTOMER";
}

function systemSeverityTone(sev: string | undefined): { icon: string; ring: string; bg: string } {
  if (sev === "critical") return { icon: "⛔", ring: "ring-rose-400", bg: "bg-rose-50" };
  if (sev === "warning") return { icon: "⚠️", ring: "ring-amber-300", bg: "bg-amber-50" };
  return { icon: "ℹ️", ring: "ring-sky-300", bg: "bg-sky-50" };
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
    <p className="mt-1 text-[11px] text-slate-600">
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
  commissionTab,
  affiliateProgramEnabled,
  isAffiliateActive,
}: {
  title: string;
  notifications: CustomerNotificationsPollBundle;
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
  const prevCommissionUnreadRef = useRef(notifications.groups.commission);

  const markReadQuiet = async (ids: string[]) => {
    if (!ids.length) return;
    try {
      const res = await fetch("/api/account/notifications/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ ids }),
      });
      const j = (await res.json()) as { ok?: boolean };
      if (res.ok && j.ok) router.refresh();
    } catch {
      /* noop */
    }
  };

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
    if (filter === "commission") return notifications.items.filter((item) => isCommissionishRow(item));
    if (filter === "order") {
      return notifications.items.filter((item) => item.category === "order" && !isReferralRow(item));
    }
    return notifications.items.filter((item) => item.category === filter);
  }, [filter, notifications.items]);

  const commissionDisplayRows = useMemo(() => {
    if (filter !== "commission") return null;
    const windowMs = commissionTab.groupWindowSeconds * 1000;
    return groupCommissionTabItems(filteredBase, windowMs, commissionTab.groupSimilarEnabled);
  }, [filter, filteredBase, commissionTab.groupSimilarEnabled, commissionTab.groupWindowSeconds]);

  const groupRows = [
    { key: "order", label: "Đơn hàng", count: notifications.groups.order },
    ...(showCommissionHub ? [{ key: "commission" as const, label: "Hoa hồng", count: notifications.groups.commission }] : []),
    { key: "promotion", label: "Khuyến mãi", count: notifications.groups.promotion },
    { key: "system", label: "Hệ thống", count: notifications.groups.system },
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

  const referralMeta = (item: AccountNotificationListItem) =>
    (item.metadata && typeof item.metadata === "object" ? item.metadata : null) as Record<string, unknown> | null;

  const swipeTabClass =
    "snap-center shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition whitespace-nowrap";

  return (
    <section id="thong-bao" className="w-full min-w-0 rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm sm:p-5 lg:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-[#0F172A]">{title}</h3>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {notifications.unread > 0 ? (
            <span className="rounded-full bg-[#EF4444] px-2 py-0.5 font-semibold text-white shadow-sm">
              {notifications.unread > 99 ? "99+ mới" : `${notifications.unread} mới`}
            </span>
          ) : null}
          {showCommissionHub && notifications.groups.commission > 0 ? (
            <span className="rounded-full bg-emerald-600 px-2 py-0.5 font-semibold text-white shadow-sm">
              Hoa hồng {notifications.groups.commission > 99 ? "99+" : notifications.groups.commission}
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-3 -mx-1 flex gap-1 overflow-x-auto pb-1 snap-x snap-mandatory sm:mx-0 sm:flex-wrap sm:overflow-visible">
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
          {notifications.groups.order > 0
            ? ` (${notifications.groups.order > 99 ? "99+" : notifications.groups.order})`
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
            {commissionTab.realtimeBadgeEnabled && notifications.groups.commission > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 animate-pulse rounded-full bg-rose-500 ring-2 ring-white" />
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
          {notifications.groups.promotion > 0
            ? ` (${notifications.groups.promotion > 99 ? "99+" : notifications.groups.promotion})`
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
          {notifications.groups.system > 0
            ? ` (${notifications.groups.system > 99 ? "99+" : notifications.groups.system})`
            : ""}
        </button>
      </div>

      {showCommissionHub && filter === "commission" && commissionTab.showIncomeSummary ? (
        <div className="sticky top-0 z-10 mt-3 space-y-2 rounded-xl border border-emerald-100 bg-emerald-50/95 p-3 shadow-sm backdrop-blur sm:static sm:bg-emerald-50">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-900">Thu nhập CTV</p>
            {incomeLoading ? <span className="text-[11px] text-emerald-800">Đang cập nhật…</span> : null}
          </div>
          {income ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              <div className="rounded-lg bg-white/90 p-2 shadow-sm">
                <p className="text-[10px] font-medium text-[#64748B]">Hôm nay</p>
                <p className="text-sm font-bold tabular-nums text-emerald-700">+{fmtVnd(income.todayCommission)}</p>
              </div>
              <div className="rounded-lg bg-white/90 p-2 shadow-sm">
                <p className="text-[10px] font-medium text-[#64748B]">Tháng này</p>
                <p className="text-sm font-bold tabular-nums text-emerald-700">+{fmtVnd(income.monthCommission)}</p>
              </div>
              {commissionTab.showPendingCommission ? (
                <div className="rounded-lg bg-white/90 p-2 shadow-sm">
                  <p className="text-[10px] font-medium text-[#64748B]">Chờ duyệt</p>
                  <p className="text-sm font-bold tabular-nums text-amber-700">{fmtVnd(income.pendingTotal)}</p>
                </div>
              ) : null}
              {commissionTab.showPaidCommission ? (
                <div className="rounded-lg bg-white/90 p-2 shadow-sm">
                  <p className="text-[10px] font-medium text-[#64748B]">Đã thanh toán</p>
                  <p className="text-sm font-bold tabular-nums text-[#0F172A]">{fmtVnd(income.paidTotal)}</p>
                </div>
              ) : null}
              {commissionTab.showAffiliateOrderCount ? (
                <div className="rounded-lg bg-white/90 p-2 shadow-sm">
                  <p className="text-[10px] font-medium text-[#64748B]">Đơn affiliate</p>
                  <p className="text-sm font-bold tabular-nums text-[#0F172A]">{income.affiliateOrderCount}</p>
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

      {(() => {
        const rangeCut = (createdAt: string): boolean => {
          if (filter !== "commission") return true;
          const t = new Date(createdAt).getTime();
          const now = Date.now();
          const day = 86400000;
          if (commissionHistoryRange === "today") return t >= now - day;
          if (commissionHistoryRange === "7d") return t >= now - 7 * day;
          if (commissionHistoryRange === "30d") return t >= now - 30 * day;
          const d = new Date();
          const startMonth = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
          return t >= startMonth;
        };

        const list: GroupedCommissionRow[] =
          filter === "commission" && commissionDisplayRows
            ? commissionDisplayRows.filter((row) => {
                if (row.kind === "bundle") return rangeCut(row.latestAt);
                return rangeCut(row.item.createdAt);
              })
            : filteredBase
                .filter((row) => rangeCut(row.createdAt))
                .map((item) => ({ kind: "single" as const, item }));

        const display = list.slice(0, listTake);

        if (!display.length) {
          return <p className="mt-4 text-sm text-[#64748B]">Chưa có thông báo trong mục này.</p>;
        }

        return (
          <ul className="mt-4 space-y-2" aria-label="Danh sách thông báo">
            {display.map((entry, idx) => {
              if (entry.kind === "bundle") {
                return (
                  <li key={`bundle-${idx}`}>
                    <div className="w-full rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] px-3 py-3 text-left">
                      <p className="text-sm font-semibold text-[#0F172A]">
                        {entry.orderCount} đơn hàng mới qua link affiliate của bạn.
                      </p>
                      <p className="mt-1 text-xs text-[#64748B]">
                        Tổng hoa hồng (ước tính): <span className="font-semibold text-emerald-700">{fmtVnd(entry.totalCommission)}</span>
                        {" · "}
                        Mới nhất: {new Date(entry.latestAt).toLocaleString("vi-VN")}
                      </p>
                      <button
                        type="button"
                        className="mt-2 text-xs font-semibold text-[#2563EB] hover:underline"
                        onClick={() => void markReadQuiet(entry.items.map((i) => i.id))}
                      >
                        Đánh dấu đã đọc nhóm
                      </button>
                    </div>
                  </li>
                );
              }

              const item = entry.item;
              const meta = referralMeta(item);
              const isRef = isReferralRow(item);
              const isPayout = isPayoutFlowRow(item);
              const badge =
                item.category === "order"
                  ? "Đơn hàng"
                  : item.category === "promotion"
                    ? "Khuyến mãi"
                    : item.category === "commission"
                      ? "Hoa hồng"
                      : "Hệ thống";
              const img =
                commissionTab.previewProductEnabled && typeof meta?.firstProductImageUrl === "string"
                  ? meta.firstProductImageUrl
                  : null;
              const buyer =
                commissionTab.maskedCustomerEnabled && typeof meta?.buyerLabel === "string" ? (meta.buyerLabel as string) : null;

              if (isOrderCustomerRow(item) && meta) {
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
                  <li key={item.id}>
                    <div
                      className={`w-full rounded-xl border px-3 py-3 text-left ${
                        item.read ? "border-[#E2E8F0] bg-white" : "border-[#BFDBFE] bg-[#EFF6FF]"
                      }`}
                    >
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
                          <dl className="mt-1 grid grid-cols-1 gap-0.5 text-[11px] text-[#475569] sm:grid-cols-2">
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
                              onClick={() => onOpenItem(item, viewHref)}
                            >
                              Xem đơn
                            </button>
                            <button
                              type="button"
                              className="rounded-lg border border-[#E2E8F0] bg-white px-2 py-1 text-xs font-semibold text-[#2563EB]"
                              onClick={() => onOpenItem(item, trackHref)}
                            >
                              Theo dõi đơn
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              }

              if (isPromotionCampaignRow(item) && meta) {
                const banner = typeof meta.banner === "string" ? (meta.banner as string) : null;
                const cta = typeof meta.ctaLabel === "string" ? (meta.ctaLabel as string) : "Xem ưu đãi";
                const expireAt = typeof meta.expireAt === "string" ? (meta.expireAt as string) : null;
                const deep = typeof meta.deepLink === "string" && meta.deepLink.startsWith("/") ? (meta.deepLink as string) : "/";
                return (
                  <li key={item.id}>
                    <div
                      className={`w-full rounded-xl border px-3 py-3 text-left ${
                        item.read ? "border-[#E2E8F0] bg-white" : "border-fuchsia-200 bg-fuchsia-50/60"
                      }`}
                    >
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
                          onClick={() => onOpenItem(item, deep)}
                        >
                          {cta}
                        </button>
                        <button
                          type="button"
                          className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-semibold text-[#2563EB]"
                          onClick={() => onOpenItem(item, "/")}
                        >
                          Mua ngay
                        </button>
                      </div>
                    </div>
                  </li>
                );
              }

              if (isSystemCustomerRow(item) && meta) {
                const sev = typeof meta.severity === "string" ? meta.severity : "info";
                const tone = systemSeverityTone(sev);
                const deep =
                  typeof meta.deepLink === "string" && meta.deepLink.startsWith("/") ? (meta.deepLink as string) : null;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => onOpenItem(item, deep ?? undefined)}
                      className={`w-full rounded-xl border px-3 py-3 text-left transition hover:bg-[#F8FAFC] ring-1 ${tone.ring} ${tone.bg} ${
                        item.read ? "border-[#E2E8F0] bg-white" : "border-slate-200"
                      }`}
                    >
                      <div className="flex gap-2">
                        <span className="text-lg" aria-hidden>
                          {tone.icon}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-sm font-semibold text-[#0F172A]">{item.title}</span>
                            <span className="text-[11px] text-[#64748B]">
                              {new Date(item.createdAt).toLocaleString("vi-VN")}
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] font-medium text-slate-700">Hệ thống · {String(meta.systemType ?? "")}</p>
                          <p className="mt-1 whitespace-pre-wrap text-sm text-[#334155]">{item.body}</p>
                          {deep ? (
                            <p className="mt-2 text-xs font-semibold text-[#2563EB]">Mở chi tiết →</p>
                          ) : null}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              }

              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.matchMedia("(max-width: 767px)").matches && (isRef || isPayout)) {
                        setActionSheet(item);
                        return;
                      }
                      onOpenItem(item);
                    }}
                    className={`w-full rounded-xl border px-3 py-3 text-left transition hover:bg-[#F8FAFC] ${
                      item.read ? "border-[#E2E8F0] bg-white" : "border-[#BFDBFE] bg-[#EFF6FF]"
                    }`}
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
                          <dl className="mt-1 grid grid-cols-1 gap-0.5 text-[11px] text-[#475569] sm:grid-cols-2">
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
                  </button>
                </li>
              );
            })}
          </ul>
        );
      })()}

      {(() => {
        if (listTake >= 500) return null;
        const rangeCut = (createdAt: string): boolean => {
          if (filter !== "commission") return true;
          const t = new Date(createdAt).getTime();
          const now = Date.now();
          const day = 86400000;
          if (commissionHistoryRange === "today") return t >= now - day;
          if (commissionHistoryRange === "7d") return t >= now - 7 * day;
          if (commissionHistoryRange === "30d") return t >= now - 30 * day;
          const d = new Date();
          const startMonth = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
          return t >= startMonth;
        };
        const listLen =
          filter === "commission" && commissionDisplayRows
            ? commissionDisplayRows.filter((row) => {
                if (row.kind === "bundle") return rangeCut(row.latestAt);
                return rangeCut(row.item.createdAt);
              }).length
            : filteredBase.filter((row) => rangeCut(row.createdAt)).length;
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
              <button type="button" className="h-10 text-sm text-[#64748B]" onClick={() => setActionSheet(null)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
