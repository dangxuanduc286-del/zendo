"use client";

import { useMemo, useState } from "react";
import { COMMISSION_HOLD_DAYS } from "@/lib/affiliate/commission-hold";
import { AffiliateCommissionStatusBadge } from "./affiliate/affiliate-commission-status-badge";
import { CtvDataEmpty } from "./ctv/data/ctv-data-states";
import { CTV_LIST_ROW } from "./ctv/data/ctv-data-table";
import { CtvMetricStrip } from "./ctv/data/ctv-metric-strip";
import { CtvTableSkeleton } from "./ctv/data/ctv-skeleton";
import { CTV_V2_SEGMENTED_ITEM, CTV_V2_SEGMENTED_ITEM_ACTIVE, CTV_V2_SEGMENTED_WRAP } from "./ctv/ctv-ui-tokens";
import { CTV_MOTION_CLASS } from "./ctv/ctv-motion-tokens";

type CommissionRow = {
  id: string;
  createdAt: string;
  amount: number;
  orderRevenue?: number;
  status: string;
  statusDisplayVi?: string;
  statusKey?: string;
  orderCode: string;
  approvedAt?: string | null;
  unlockAt?: string | null;
  availableAt?: string | null;
  paidAt?: string | null;
  holdHintVi?: string | null;
};

type RewardRow = {
  id: string;
  createdAt: string;
  points: number;
  status: string;
  reason: string;
};

type CommissionTab = "all" | "pending" | "waiting_release" | "available" | "paid" | "cancelled";

function commissionKey(row: CommissionRow): string {
  return (row.statusKey ?? row.status ?? "").toLowerCase();
}

function rowMatchesTab(row: CommissionRow, tab: CommissionTab): boolean {
  const key = commissionKey(row);
  if (tab === "all") return true;
  if (tab === "available") return key === "available" || key === "approved";
  return key === tab;
}

const CARD_HOVER =
  "transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(15,23,42,0.08)]";

export default function AffiliateEarningsPanel({
  commissions,
  rewards,
  loading,
  variant = "default",
}: {
  commissions: CommissionRow[];
  rewards: RewardRow[];
  loading?: boolean;
  variant?: "default" | "ctv";
}): JSX.Element {
  const isCtv = variant === "ctv";
  const [tab, setTab] = useState<CommissionTab>("all");

  const filtered = useMemo(() => {
    return commissions.filter((row) => rowMatchesTab(row, tab));
  }, [commissions, tab]);

  const sumBy = (predicate: (row: CommissionRow) => boolean) =>
    commissions.filter(predicate).reduce((sum, row) => sum + row.amount, 0);

  const totalPending = sumBy((row) => commissionKey(row) === "pending");
  const totalWaitingRelease = sumBy((row) => commissionKey(row) === "waiting_release");
  const totalAvailable = sumBy((row) => {
    const k = commissionKey(row);
    return k === "available" || k === "approved";
  });
  const totalPaid = sumBy((row) => commissionKey(row) === "paid");
  const totalCancelled = sumBy((row) => commissionKey(row) === "cancelled");

  const pointsAvailable = rewards
    .filter((row) => row.status.toLowerCase() === "available")
    .reduce((sum, row) => sum + row.points, 0);
  const pointsUsed = rewards
    .filter((row) => row.status.toLowerCase() === "used")
    .reduce((sum, row) => sum + row.points, 0);

  const fmtMoney = (n: number) => `${new Intl.NumberFormat("vi-VN").format(n)}đ`;

  const tabItems: Array<{ key: CommissionTab; label: string }> = [
    { key: "all", label: "Tất cả" },
    { key: "pending", label: "Chờ duyệt" },
    { key: "waiting_release", label: "Đang chờ mở khóa" },
    { key: "available", label: "Khả dụng" },
    { key: "paid", label: "Đã thanh toán" },
    { key: "cancelled", label: "Đã hủy" },
  ];

  const metricItems = [
    { id: "pending", label: "Chờ duyệt", value: fmtMoney(totalPending) },
    { id: "waiting", label: "Đang chờ mở khóa", value: fmtMoney(totalWaitingRelease) },
    { id: "available", label: "Khả dụng rút", value: fmtMoney(totalAvailable) },
    { id: "paid", label: "Đã thanh toán", value: fmtMoney(totalPaid) },
    { id: "cancelled", label: "Đã hủy", value: fmtMoney(totalCancelled) },
    { id: "points", label: "Điểm thưởng", value: `${pointsAvailable} / ${pointsUsed}` },
  ];

  return (
    <section
      className={isCtv ? "min-w-0 space-y-4" : "mt-4 rounded-xl border border-[#E2E8F0] bg-white p-3 shadow-sm sm:p-4"}
      aria-labelledby="ctv-earnings-heading"
    >
      <header className="space-y-2">
        <h4
          id="ctv-earnings-heading"
          className={isCtv ? "text-sm font-semibold text-slate-900 lg:text-base" : "text-base font-semibold text-[#0F172A]"}
        >
          Hoa hồng & đối soát
        </h4>
        <p
          className={
            isCtv
              ? "rounded-xl border border-cyan-100/90 bg-cyan-50/60 px-3 py-2 text-xs leading-relaxed text-cyan-950"
              : "rounded-lg border border-cyan-100 bg-cyan-50/80 px-3 py-2 text-xs leading-relaxed text-cyan-950"
          }
          role="note"
        >
          Hoa hồng sẽ được mở khóa sau {COMMISSION_HOLD_DAYS} ngày kể từ khi admin xác nhận để đảm bảo không phát
          sinh hoàn trả hoặc hủy đơn hàng.
        </p>
      </header>

      {isCtv ? (
        <CtvMetricStrip aria-label="Tổng hợp hoa hồng" columns={3} items={metricItems} />
      ) : (
        <div className="mt-3 grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {metricItems.map((item) => (
            <article
              key={item.id}
              className={`rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-2.5 text-xs ${CARD_HOVER}`}
            >
              <p className="text-[#64748B]">{item.label}</p>
              <p className="mt-1 font-semibold tabular-nums text-[#0F172A]">{item.value}</p>
            </article>
          ))}
        </div>
      )}

      <div
        className={isCtv ? `${CTV_V2_SEGMENTED_WRAP} !overflow-x-auto` : "mt-3 flex min-w-0 flex-wrap gap-2"}
        role={isCtv ? "tablist" : undefined}
      >
        {tabItems.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={
              isCtv
                ? `${CTV_V2_SEGMENTED_ITEM} ${CTV_MOTION_CLASS.tab} !min-h-9 shrink-0 !flex-none !px-3 ${
                    tab === item.key ? CTV_V2_SEGMENTED_ITEM_ACTIVE : "hover:bg-white/60"
                  }`
                : `shrink-0 rounded-full px-3 py-1 text-xs ${
                    tab === item.key ? "bg-[#2563EB] text-white" : "bg-[#F8FAFC] text-[#0F172A]"
                  }`
            }
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading ? (
        isCtv ? (
          <CtvTableSkeleton rows={4} />
        ) : (
          <p className="mt-3 text-sm text-[#64748B]">Đang tải lịch sử…</p>
        )
      ) : filtered.length ? (
        <div className={isCtv ? "max-h-[28rem] space-y-2 overflow-y-auto overscroll-contain" : "mt-3 min-w-0 space-y-2"}>
          {filtered.map((row) => (
            <article
              key={row.id}
              className={
                isCtv
                  ? `${CTV_LIST_ROW} ${CARD_HOVER} min-w-0 text-xs`
                  : `rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-2.5 text-xs min-w-0 ${CARD_HOVER}`
              }
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold tabular-nums text-[#0F172A]">{fmtMoney(row.amount)}</p>
                <AffiliateCommissionStatusBadge status={row.status} label={row.statusDisplayVi} />
              </div>
              <p className="mt-1 break-words text-[#64748B]">
                Đơn #{row.orderCode} · {new Date(row.createdAt).toLocaleString("vi-VN")}
                {typeof row.orderRevenue === "number" && row.orderRevenue > 0 ? (
                  <> · GT đơn: {fmtMoney(row.orderRevenue)}</>
                ) : null}
              </p>
              {row.holdHintVi ? (
                <p className="mt-1 text-[11px] font-medium text-cyan-800">{row.holdHintVi}</p>
              ) : null}
              <p className="mt-0.5 text-[#64748B]">
                {row.approvedAt ? `Duyệt: ${new Date(row.approvedAt).toLocaleString("vi-VN")}` : "Chưa duyệt"}
                {row.availableAt ? ` · Khả dụng: ${new Date(row.availableAt).toLocaleString("vi-VN")}` : ""}
                {row.paidAt ? ` · Thanh toán: ${new Date(row.paidAt).toLocaleString("vi-VN")}` : ""}
              </p>
            </article>
          ))}
        </div>
      ) : isCtv ? (
        <CtvDataEmpty title="Chưa có hoa hồng trong mục này" description="Hoa hồng sẽ hiển thị khi có đơn giới thiệu hợp lệ." />
      ) : (
        <p className="mt-3 text-sm text-[#64748B]">Chưa có dữ liệu hoa hồng trong mục này.</p>
      )}

      <div className="mt-4">
        <p className="text-xs font-semibold text-[#0F172A]">Điểm thưởng</p>
        {rewards.length ? (
          <div className="mt-2 space-y-2">
            {rewards.map((rewardRow) => (
              <div
                key={rewardRow.id}
                className={`rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-2.5 text-xs ${CARD_HOVER}`}
              >
                <p className="font-medium text-[#0F172A]">
                  {rewardRow.points} điểm • {rewardRow.status}
                </p>
                <p className="mt-0.5 text-[#64748B]">
                  {rewardRow.reason || "Điểm thưởng CTV"} · {new Date(rewardRow.createdAt).toLocaleDateString("vi-VN")}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-[#64748B]">Chưa có dữ liệu điểm thưởng.</p>
        )}
      </div>
    </section>
  );
}
