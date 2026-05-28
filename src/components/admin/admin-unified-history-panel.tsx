"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CtvRevenueRewardHistoryAdmin } from "@/components/admin/ctv-revenue-reward-history-admin";
import { CtvNotificationsAdminPanel, CtvTierHistoryAdminPanel } from "@/components/admin/ctv-admin-history-panels";
import type { CtvRevenueRewardAuditRow } from "@/lib/admin/ctv-revenue-reward-audit";
import type { CtvTierHistoryRow } from "@/lib/admin/ctv-tier-history-admin";
import type { CtvNotificationRow } from "@/lib/admin/ctv-notifications-admin";
import { adminSecondaryButton, adminTabActive, adminTabBase, adminTabInactive } from "@/lib/admin-ui";

type OperationalItem = {
  id: string;
  categoryLabel: string;
  summary: string;
  actorLabel: string | null;
  actionHref: string;
  createdAt: string;
  hasUnreadNotification: boolean;
};

type TimelineItem = {
  id: string;
  categoryLabel: string;
  summary: string;
  actorLabel: string | null;
  createdAt: string;
  actionHref: string | null;
};

export type AdminUnifiedHistoryPanelProps = {
  revenueRows: CtvRevenueRewardAuditRow[];
  revenueTotal: number;
  tierRows: CtvTierHistoryRow[];
  tierTotal: number;
  notificationRows: CtvNotificationRow[];
  notificationTotal: number;
  tiersForFilter: Array<{ id: string; name: string; code: string }>;
  revenueQuery: string;
  revenueTierId: string;
  revenueFrom: string;
  revenueTo: string;
  tierQuery: string;
  tierFilterId: string;
  tierFrom: string;
  tierTo: string;
  notificationQuery: string;
  notificationType: string;
  notificationFrom: string;
  notificationTo: string;
};

const HISTORY_FILTERS: Array<{ id: string; label: string }> = [
  { id: "ALL", label: "Tất cả" },
  { id: "NOTIFICATION", label: "Thông báo" },
  { id: "REVENUE_REWARD", label: "Thưởng doanh thu" },
  { id: "TIER", label: "Lịch sử cấp" },
  { id: "WITHDRAWAL", label: "Rút tiền" },
  { id: "PAYOUT_ACCOUNT", label: "TK nhận tiền" },
  { id: "CTV_APPLICATION", label: "Đăng ký CTV" },
  { id: "COMMISSION", label: "Hoa hồng" },
  { id: "ORDER", label: "Đơn hàng" },
  { id: "CUSTOMER", label: "Khách hàng" },
  { id: "SUPPORT", label: "Hỗ trợ" },
  { id: "SYSTEM", label: "Hệ thống" },
];

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return iso;
  }
}

function buildHistHref(hist: string, extra?: Record<string, string>): string {
  const qs = new URLSearchParams();
  qs.set("tab", "lich-su");
  qs.set("hist", hist);
  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      if (v) qs.set(k, v);
    }
  }
  return `/admin/collaborators?${qs.toString()}`;
}

export default function AdminUnifiedHistoryPanel(props: AdminUnifiedHistoryPanelProps): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hist = searchParams.get("hist") ?? "ALL";

  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [operational, setOperational] = useState<OperationalItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const embedMode = hist === "REVENUE_REWARD" || hist === "TIER" || hist === "NOTIFICATION";

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/unified-history?scope=${encodeURIComponent(hist)}`, {
        credentials: "same-origin",
        cache: "no-store",
      });
      const j = (await res.json()) as {
        ok?: boolean;
        mode?: string;
        items?: TimelineItem[] | OperationalItem[];
        total?: number;
        message?: string;
      };
      if (!res.ok || !j.ok) {
        setError(j.message ?? "Không tải được lịch sử.");
        setTimeline([]);
        setOperational([]);
        setTotal(0);
        return;
      }
      if (j.mode === "timeline") {
        setTimeline((j.items ?? []) as TimelineItem[]);
        setOperational([]);
      } else if (j.mode === "operational") {
        setOperational((j.items ?? []) as OperationalItem[]);
        setTimeline([]);
      } else {
        setTimeline([]);
        setOperational([]);
      }
      setTotal(typeof j.total === "number" ? j.total : 0);
    } catch {
      setError("Không tải được lịch sử.");
      setTimeline([]);
      setOperational([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [hist]);

  useEffect(() => {
    if (embedMode) return;
    void load();
  }, [embedMode, load]);

  const filterHref = useMemo(
    () => (id: string) => buildHistHref(id),
    [],
  );

  function selectFilter(id: string): void {
    router.push(filterHref(id));
  }

  return (
    <section className="rounded-2xl border border-[#E2E8F0] bg-white">
      <div className="border-b border-slate-100 px-4 py-4 sm:px-5">
        <h2 className="text-lg font-bold text-[#0F172A]">Lịch sử</h2>
        <p className="mt-1 text-sm text-[#64748B]">
          Tổng hợp thưởng doanh thu, thay đổi cấp, thông báo CTV và hoạt động vận hành (rút tiền, đăng ký, đơn hàng…).
        </p>
      </div>

      <div className="overflow-x-auto border-b border-slate-100 p-2">
        <div className="flex min-w-max flex-wrap gap-2">
          {HISTORY_FILTERS.map((f) => {
            const active = f.id === hist;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => selectFilter(f.id)}
                className={`${adminTabBase} font-semibold ${active ? adminTabActive : adminTabInactive}`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {hist === "REVENUE_REWARD" ? (
        <div className="p-2 sm:p-3">
          <CtvRevenueRewardHistoryAdmin
            rows={props.revenueRows}
            total={props.revenueTotal}
            tiers={props.tiersForFilter}
            query={props.revenueQuery}
            tierId={props.revenueTierId}
            from={props.revenueFrom}
            to={props.revenueTo}
            historyTab="lich-su"
            historyHist="REVENUE_REWARD"
          />
        </div>
      ) : null}

      {hist === "TIER" ? (
        <div className="p-2 sm:p-3">
          <CtvTierHistoryAdminPanel
            rows={props.tierRows}
            total={props.tierTotal}
            tiers={props.tiersForFilter.map((t) => ({ id: t.id, name: t.name }))}
            query={props.tierQuery}
            tierId={props.tierFilterId}
            from={props.tierFrom}
            to={props.tierTo}
            historyTab="lich-su"
            historyHist="TIER"
          />
        </div>
      ) : null}

      {hist === "NOTIFICATION" ? (
        <div className="p-2 sm:p-3">
          <CtvNotificationsAdminPanel
            rows={props.notificationRows}
            total={props.notificationTotal}
            query={props.notificationQuery}
            type={props.notificationType}
            from={props.notificationFrom}
            to={props.notificationTo}
            historyTab="lich-su"
            historyHist="NOTIFICATION"
          />
        </div>
      ) : null}

      {!embedMode ? (
        <>
          <div className="flex items-center justify-between gap-2 border-b border-slate-50 px-4 py-2 text-xs text-slate-500 sm:px-5">
            <span>{total} sự kiện{hist === "ALL" ? " (gộp nhiều nguồn)" : ""}</span>
            <button type="button" onClick={() => void load()} className={adminSecondaryButton}>
              Làm mới
            </button>
          </div>

          {error ? <p className="px-4 py-6 text-sm text-rose-700 sm:px-5">{error}</p> : null}
          {loading && !timeline.length && !operational.length ? (
            <p className="px-4 py-10 text-center text-sm text-slate-500 sm:px-5">Đang tải…</p>
          ) : null}
          {!loading && !error && !timeline.length && !operational.length ? (
            <p className="px-4 py-10 text-center text-sm text-slate-500 sm:px-5">Chưa có bản ghi trong bộ lọc này.</p>
          ) : null}

          <ul className="divide-y divide-slate-100">
            {operational.map((row) => (
              <li key={row.id}>
                <Link
                  href={row.actionHref}
                  className="flex flex-col gap-1 px-4 py-3 transition hover:bg-slate-50 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-sky-800">[{row.categoryLabel}]</p>
                    <p className="text-sm font-semibold text-[#0F172A]">
                      {row.actorLabel ? (
                        <>
                          <span>{row.actorLabel}</span>
                          <span className="font-normal text-slate-600"> — {row.summary}</span>
                        </>
                      ) : (
                        row.summary
                      )}
                    </p>
                    {row.hasUnreadNotification ? (
                      <span className="mt-1 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-900">
                        Chưa đọc
                      </span>
                    ) : null}
                  </div>
                  <time className="shrink-0 text-xs tabular-nums text-slate-500 sm:pt-1">{formatWhen(row.createdAt)}</time>
                </Link>
              </li>
            ))}
            {timeline.map((row) => (
              <li key={row.id}>
                {row.actionHref ? (
                  <Link
                    href={row.actionHref}
                    className="flex flex-col gap-1 px-4 py-3 transition hover:bg-slate-50 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <TimelineBody row={row} />
                    <time className="shrink-0 text-xs tabular-nums text-slate-500 sm:pt-1">{formatWhen(row.createdAt)}</time>
                  </Link>
                ) : (
                  <div className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
                    <TimelineBody row={row} />
                    <time className="shrink-0 text-xs tabular-nums text-slate-500 sm:pt-1">{formatWhen(row.createdAt)}</time>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}

function TimelineBody({ row }: { row: TimelineItem }): JSX.Element {
  return (
    <div className="min-w-0 flex-1">
      <p className="text-[11px] font-bold uppercase tracking-wide text-sky-800">[{row.categoryLabel}]</p>
      <p className="text-sm font-semibold text-[#0F172A]">
        {row.actorLabel ? (
          <>
            <span>{row.actorLabel}</span>
            <span className="font-normal text-slate-600"> — {row.summary}</span>
          </>
        ) : (
          row.summary
        )}
      </p>
    </div>
  );
}
