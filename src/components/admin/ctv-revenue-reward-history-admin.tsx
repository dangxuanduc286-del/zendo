"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { CtvRevenueRewardAuditRow } from "@/lib/admin/ctv-revenue-reward-audit";

type TierOption = { id: string; name: string; code: string };

type CtvRevenueRewardHistoryAdminProps = {
  rows: CtvRevenueRewardAuditRow[];
  total: number;
  tiers: TierOption[];
  query: string;
  tierId: string;
  from: string;
  to: string;
  /** Tab Lịch sử thống nhất */
  historyTab?: string;
  historyHist?: string;
};

function formatVnd(n: number): string {
  return `${new Intl.NumberFormat("vi-VN").format(n)}₫`;
}

function formatDt(d: Date): string {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
}

export function CtvRevenueRewardHistoryAdmin({
  rows,
  total,
  tiers,
  query,
  tierId,
  from,
  to,
  historyTab = "lich-su",
  historyHist = "REVENUE_REWARD",
}: CtvRevenueRewardHistoryAdminProps): JSX.Element {
  const exportQs = useMemo(() => {
    const p = new URLSearchParams();
    if (query.trim()) p.set("q", query.trim());
    if (tierId.trim()) p.set("tierId", tierId.trim());
    if (from.trim()) p.set("from", from.trim());
    if (to.trim()) p.set("to", to.trim());
    const s = p.toString();
    return s ? `?${s}` : "";
  }, [query, tierId, from, to]);

  return (
    <section className="space-y-4 rounded-2xl border border-[#E2E8F0] bg-white p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#0F172A]">Lịch sử thưởng doanh thu</h2>
          <p className="mt-1 text-sm text-[#64748B]">
            Audit từ <span className="font-medium">CtvRevenueRewardAuditLog</span> — mỗi tier chỉ một bản ghi thưởng /
            CTV (unique grant + transaction).
          </p>
        </div>
        <a
          href={`/api/admin/ctv-revenue-rewards/export${exportQs}`}
          className="inline-flex h-10 shrink-0 items-center justify-center rounded-2xl bg-[#2563EB] px-4 text-sm font-semibold text-white hover:bg-[#1d4ed8]"
        >
          Xuất CSV
        </a>
      </div>

      <form className="grid grid-cols-1 gap-3 lg:grid-cols-12" action="/admin/collaborators" method="GET">
        <input id={`ctv-revenue-reward-history-${historyTab}-tab`} type="hidden" name="tab" value={historyTab} />
        <input id={`ctv-revenue-reward-history-${historyHist}-hist`} type="hidden" name="hist" value={historyHist} />
        <label className="space-y-1 lg:col-span-3">
          <span className="text-xs font-medium text-[#64748B]">Tìm kiếm</span>
          <input
            id="ctv-revenue-reward-history-q"
            name="rr_q"
            defaultValue={query}
            placeholder="CTV, ref, tier, transaction…"
            className="w-full rounded-2xl border border-[#E2E8F0] px-3 py-2 text-sm text-[#0F172A] outline-none focus:border-[#2563EB]"
          />
        </label>
        <label className="space-y-1 lg:col-span-2">
          <span className="text-xs font-medium text-[#64748B]">Hạng CTV</span>
          <select
            id="ctv-revenue-reward-history-tier"
            name="rr_tier"
            defaultValue={tierId}
            className="w-full rounded-2xl border border-[#E2E8F0] px-3 py-2 text-sm text-[#0F172A] outline-none focus:border-[#2563EB]"
          >
            <option value="">Tất cả</option>
            {tiers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 lg:col-span-2">
          <span className="text-xs font-medium text-[#64748B]">Từ ngày</span>
          <input
            id="ctv-revenue-reward-history-from"
            type="date"
            name="rr_from"
            defaultValue={from}
            className="w-full rounded-2xl border border-[#E2E8F0] px-3 py-2 text-sm text-[#0F172A] outline-none focus:border-[#2563EB]"
          />
        </label>
        <label className="space-y-1 lg:col-span-2">
          <span className="text-xs font-medium text-[#64748B]">Đến ngày</span>
          <input
            id="ctv-revenue-reward-history-to"
            type="date"
            name="rr_to"
            defaultValue={to}
            className="w-full rounded-2xl border border-[#E2E8F0] px-3 py-2 text-sm text-[#0F172A] outline-none focus:border-[#2563EB]"
          />
        </label>
        <div className="flex items-end gap-2 lg:col-span-3">
          <button
            type="submit"
            className="inline-flex h-10 items-center rounded-2xl bg-[#0F172A] px-4 text-sm font-semibold text-white hover:bg-[#1e293b]"
          >
            Lọc
          </button>
          <Link
            href={`/admin/collaborators?tab=${historyTab}&hist=${historyHist}`}
            className="inline-flex h-10 items-center rounded-2xl border border-[#E2E8F0] px-4 text-sm font-semibold text-[#0F172A] hover:bg-slate-50"
          >
            Đặt lại
          </Link>
        </div>
      </form>

      <p className="text-sm text-[#64748B]">
        Hiển thị <strong className="text-[#0F172A]">{rows.length}</strong>
        {total > rows.length ? ` / ${total}` : ""} bản ghi
      </p>

      <div className="overflow-x-auto rounded-2xl border border-[#E2E8F0]">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[#0F172A]">
            <tr>
              <th className="px-4 py-3 font-semibold">CTV</th>
              <th className="px-4 py-3 font-semibold">Ref</th>
              <th className="px-4 py-3 font-semibold">Hạng</th>
              <th className="px-4 py-3 font-semibold">Doanh thu đạt</th>
              <th className="px-4 py-3 font-semibold">Tiền thưởng</th>
              <th className="px-4 py-3 font-semibold">Thời gian nhận</th>
              <th className="px-4 py-3 font-semibold">Transaction ID</th>
              <th className="px-4 py-3 font-semibold">Grant ID</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-[#64748B]">
                  Chưa có bản ghi thưởng doanh thu.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b border-[#E2E8F0] last:border-0">
                  <td className="px-4 py-3 font-medium text-[#0F172A]">{r.affiliateDisplayName}</td>
                  <td className="px-4 py-3 font-mono text-xs text-[#475569]">{r.refCode}</td>
                  <td className="px-4 py-3">
                    {r.tierName}
                    <span className="ml-1 text-xs text-[#94A3B8]">({r.tierCode})</span>
                  </td>
                  <td className="px-4 py-3 tabular-nums">{formatVnd(r.qualifiedRevenue30d)}</td>
                  <td className="px-4 py-3 font-semibold tabular-nums text-emerald-700">
                    {formatVnd(r.rewardAmount)}
                  </td>
                  <td className="px-4 py-3 text-[#475569]">{formatDt(r.receivedAt)}</td>
                  <td className="max-w-[140px] truncate px-4 py-3 font-mono text-xs" title={r.transactionId}>
                    {r.transactionId}
                  </td>
                  <td className="max-w-[140px] truncate px-4 py-3 font-mono text-xs" title={r.grantId}>
                    {r.grantId}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
