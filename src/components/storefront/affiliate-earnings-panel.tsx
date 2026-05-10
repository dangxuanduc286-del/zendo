"use client";

import { useMemo, useState } from "react";

type CommissionRow = {
  id: string;
  createdAt: string;
  amount: number;
  /** doanh thu đơn (đối soát), có thể 0 */
  orderRevenue?: number;
  status: string;
  statusDisplayVi?: string;
  /** trùng prisma enum lowercase */
  statusKey?: string;
  orderCode: string;
  approvedAt?: string | null;
  paidAt?: string | null;
};

type RewardRow = {
  id: string;
  createdAt: string;
  points: number;
  status: string;
  reason: string;
};

type CommissionTab = "all" | "pending" | "approved" | "paid" | "cancelled";

function commissionKey(row: CommissionRow): string {
  return (row.statusKey ?? row.status ?? "").toLowerCase();
}

export default function AffiliateEarningsPanel({
  commissions,
  rewards,
  loading,
}: {
  commissions: CommissionRow[];
  rewards: RewardRow[];
  loading?: boolean;
}): JSX.Element {
  const [tab, setTab] = useState<CommissionTab>("all");

  const filtered = useMemo(() => {
    if (tab === "all") return commissions;
    return commissions.filter((row) => commissionKey(row) === tab);
  }, [commissions, tab]);

  const totalPending = commissions
    .filter((row) => commissionKey(row) === "pending")
    .reduce((sum, row) => sum + row.amount, 0);
  const totalApproved = commissions
    .filter((row) => commissionKey(row) === "approved")
    .reduce((sum, row) => sum + row.amount, 0);
  const totalPaid = commissions.filter((row) => commissionKey(row) === "paid").reduce((sum, row) => sum + row.amount, 0);
  const totalCancelled = commissions
    .filter((row) => commissionKey(row) === "cancelled")
    .reduce((sum, row) => sum + row.amount, 0);

  const pointsAvailable = rewards
    .filter((row) => row.status.toLowerCase() === "available")
    .reduce((sum, row) => sum + row.points, 0);
  const pointsUsed = rewards
    .filter((row) => row.status.toLowerCase() === "used")
    .reduce((sum, row) => sum + row.points, 0);

  const fmtMoney = (n: number) => `${new Intl.NumberFormat("vi-VN").format(n)}đ`;

  return (
    <section className="mt-4 rounded-xl border border-[#E2E8F0] bg-white p-3 shadow-sm sm:p-4">
      <h4 className="text-base font-semibold text-[#0F172A]">Hoa hồng & đối soát</h4>
      <p className="mt-1 text-xs text-[#64748B]">
        Theo dõi PENDING · APPROVED · PAID · CANCELLED. Ngày duyệt/thanh toán hiển thị khi hệ thống đã cập nhật.
      </p>
      <div className="mt-3 grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        <article className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-2.5 text-xs">
          <p className="text-[#64748B]">Chờ duyệt</p>
          <p className="mt-1 font-semibold tabular-nums text-[#0F172A]">{fmtMoney(totalPending)}</p>
        </article>
        <article className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-2.5 text-xs">
          <p className="text-[#64748B]">Đã duyệt (chưa chi)</p>
          <p className="mt-1 font-semibold tabular-nums text-[#0F172A]">{fmtMoney(totalApproved)}</p>
        </article>
        <article className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-2.5 text-xs">
          <p className="text-[#64748B]">Đã thanh toán</p>
          <p className="mt-1 font-semibold tabular-nums text-[#0F172A]">{fmtMoney(totalPaid)}</p>
        </article>
        <article className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-2.5 text-xs">
          <p className="text-[#64748B]">Đã hủy HH</p>
          <p className="mt-1 font-semibold tabular-nums text-[#0F172A]">{fmtMoney(totalCancelled)}</p>
        </article>
        <article className="col-span-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-2.5 text-xs xl:col-span-2">
          <p className="text-[#64748B]">Điểm thưởng (khả dụng / đã dùng)</p>
          <p className="mt-1 font-semibold text-[#0F172A]">
            {pointsAvailable} / {pointsUsed}
          </p>
        </article>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {[
          { key: "all", label: "Tất cả" },
          { key: "pending", label: "Chờ duyệt" },
          { key: "approved", label: "Đã duyệt" },
          { key: "paid", label: "Đã thanh toán" },
          { key: "cancelled", label: "Đã hủy" },
        ].map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key as CommissionTab)}
            className={`rounded-full px-3 py-1 text-xs ${
              tab === item.key ? "bg-[#2563EB] text-white" : "bg-[#F8FAFC] text-[#0F172A]"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="mt-3 text-sm text-[#64748B]">Đang tải lịch sử…</p>
      ) : filtered.length ? (
        <div className="mt-3 min-w-0 space-y-2">
          {filtered.map((row) => (
            <div key={row.id} className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-2.5 text-xs min-w-0">
              <p className="font-medium text-[#0F172A]">
                {fmtMoney(row.amount)} ·{" "}
                <span className="text-[#1D4ED8]">{row.statusDisplayVi ?? row.status}</span>
              </p>
              <p className="mt-1 break-words text-[#64748B]">
                Đơn #{row.orderCode} · Ngày phát sinh: {new Date(row.createdAt).toLocaleString("vi-VN")}
                {typeof row.orderRevenue === "number" && row.orderRevenue > 0 ? (
                  <> · GT đơn: {fmtMoney(row.orderRevenue)}</>
                ) : null}
              </p>
              <p className="mt-0.5 text-[#64748B]">
                {row.approvedAt ? `Duyệt: ${new Date(row.approvedAt).toLocaleString("vi-VN")}` : "Chưa ghi nhận ngày duyệt"}
                {" · "}
                {row.paidAt ? `Thanh toán: ${new Date(row.paidAt).toLocaleString("vi-VN")}` : "Chưa ghi nhận thanh toán"}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-[#64748B]">Chưa có dữ liệu hoa hồng trong mục này.</p>
      )}

      <div className="mt-4">
        <p className="text-xs font-semibold text-[#0F172A]">Điểm thưởng</p>
        {rewards.length ? (
          <div className="mt-2 space-y-2">
            {rewards.map((rewardRow) => (
              <div key={rewardRow.id} className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-2.5 text-xs">
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
