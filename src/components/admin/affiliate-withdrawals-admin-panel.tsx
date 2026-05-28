import Link from "next/link";
import type {
  AffiliateWithdrawalKpis,
  AffiliateWithdrawalListSort,
  AffiliateWithdrawalListStatusFilter,
  AffiliateWithdrawalRow,
} from "@/lib/admin/affiliate";
import AffiliateWithdrawalActions from "./affiliate-withdrawal-actions";

function parseWithdrawalPaymentInfo(raw: string): { bank: string; accountName: string } {
  try {
    const parsed = JSON.parse(raw) as { bank?: unknown; accountName?: unknown };
    return {
      bank: String(parsed.bank ?? "").trim() || "—",
      accountName: String(parsed.accountName ?? "").trim() || "—",
    };
  } catch {
    return { bank: "—", accountName: "—" };
  }
}

function withdrawalStatusLabel(status: AffiliateWithdrawalRow["status"]): string {
  const map: Record<AffiliateWithdrawalRow["status"], string> = {
    PENDING: "Chờ xử lý",
    APPROVED: "Đã duyệt",
    PAID: "Đã chi",
    REJECTED: "Từ chối",
  };
  return map[status] ?? status;
}

function withdrawalStatusBadgeClass(status: AffiliateWithdrawalRow["status"]): string {
  if (status === "PENDING") return "bg-amber-100 text-amber-900";
  if (status === "APPROVED") return "bg-sky-100 text-sky-900";
  if (status === "PAID") return "bg-emerald-100 text-emerald-900";
  return "bg-rose-100 text-rose-900";
}

export default function AffiliateWithdrawalsAdminPanel({
  rows,
  kpis,
  query,
  statusFilter,
  sort,
  redirectTo,
  withdrawalError,
  formatCurrency,
  truncateText,
}: {
  rows: AffiliateWithdrawalRow[];
  kpis: AffiliateWithdrawalKpis;
  query: string;
  statusFilter: AffiliateWithdrawalListStatusFilter;
  sort: AffiliateWithdrawalListSort;
  redirectTo: string;
  withdrawalError: string;
  formatCurrency: (value: number) => string;
  truncateText: (value: string | null | undefined, max?: number) => string;
}): JSX.Element {
  return (
    <section className="space-y-4 rounded-2xl border border-[#E2E8F0] bg-white p-4 sm:p-5">
      <div>
        <h2 className="text-lg font-semibold text-[#0F172A]">Rút tiền CTV</h2>
        <p className="mt-1 text-sm text-[#64748B]">
          Xem và xử lý yêu cầu rút tiền: duyệt → đánh dấu đã thanh toán, hoặc từ chối khi cần.
        </p>
      </div>

      {withdrawalError ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800" role="alert">
          {withdrawalError}
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <article className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
          <p className="text-[11px] font-medium text-[#64748B]">Tổng yêu cầu</p>
          <p className="mt-1 text-lg font-bold tabular-nums text-[#0F172A]">{kpis.totalRequests}</p>
        </article>
        <article className="rounded-xl border border-amber-200 bg-amber-50/80 p-3">
          <p className="text-[11px] font-medium text-amber-900">Chờ xử lý</p>
          <p className="mt-1 text-lg font-bold tabular-nums text-amber-950">{kpis.pendingCount}</p>
        </article>
        <article className="rounded-xl border border-sky-200 bg-sky-50/80 p-3">
          <p className="text-[11px] font-medium text-sky-900">Đã duyệt</p>
          <p className="mt-1 text-lg font-bold tabular-nums text-sky-950">{kpis.approvedCount}</p>
        </article>
        <article className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3">
          <p className="text-[11px] font-medium text-emerald-900">Đã chi</p>
          <p className="mt-1 text-lg font-bold tabular-nums text-emerald-950">{kpis.paidCount}</p>
        </article>
        <article className="rounded-xl border border-rose-200 bg-rose-50/80 p-3">
          <p className="text-[11px] font-medium text-rose-900">Từ chối</p>
          <p className="mt-1 text-lg font-bold tabular-nums text-rose-950">{kpis.rejectedCount}</p>
        </article>
        <article className="col-span-2 rounded-xl border border-[#E2E8F0] bg-white p-3 sm:col-span-1 lg:col-span-1">
          <p className="text-[11px] font-medium text-[#64748B]">Tiền chờ xử lý</p>
          <p className="mt-1 text-base font-bold tabular-nums text-[#0F172A] sm:text-lg">
            {formatCurrency(kpis.pendingAmountTotal)}
          </p>
        </article>
      </div>

      <form className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12" action="/admin/collaborators" method="GET">
        <input type="hidden" name="tab" value="rut-tien" />
        <label className="space-y-1 sm:col-span-2 lg:col-span-4">
          <span className="text-xs font-medium text-[#64748B]">Tên CTV / SĐT / ref</span>
          <input
            id="admin-affiliate-withdrawals-q"
            name="wd_q"
            defaultValue={query}
            placeholder="Tên, số điện thoại, mã ref…"
            className="h-10 w-full min-w-0 rounded-2xl border border-[#E2E8F0] px-3 text-sm text-[#0F172A] outline-none focus:border-[#2563EB]"
          />
        </label>
        <label className="space-y-1 sm:col-span-1 lg:col-span-3">
          <span className="text-xs font-medium text-[#64748B]">Trạng thái</span>
          <select
            id="admin-affiliate-withdrawals-status"
            name="wd_status"
            defaultValue={statusFilter}
            className="h-10 w-full rounded-2xl border border-[#E2E8F0] px-3 text-sm text-[#0F172A] outline-none focus:border-[#2563EB]"
          >
            <option value="ALL">Tất cả</option>
            <option value="PENDING">Chờ xử lý</option>
            <option value="APPROVED">Đã duyệt</option>
            <option value="PAID">Đã chi</option>
            <option value="REJECTED">Từ chối</option>
          </select>
        </label>
        <label className="space-y-1 sm:col-span-1 lg:col-span-3">
          <span className="text-xs font-medium text-[#64748B]">Sắp xếp</span>
          <select
            id="admin-affiliate-withdrawals-sort"
            name="wd_sort"
            defaultValue={sort}
            className="h-10 w-full rounded-2xl border border-[#E2E8F0] px-3 text-sm text-[#0F172A] outline-none focus:border-[#2563EB]"
          >
            <option value="newest">Mới nhất</option>
            <option value="oldest">Cũ nhất</option>
            <option value="highest_amount">Số tiền cao nhất</option>
          </select>
        </label>
        <div className="flex flex-col gap-2 sm:col-span-2 sm:flex-row sm:items-end lg:col-span-2">
          <button
            type="submit"
            className="inline-flex h-10 w-full items-center justify-center rounded-2xl bg-[#2563EB] px-4 text-sm font-semibold text-white hover:bg-[#1D4ED8] sm:w-auto"
          >
            Lọc
          </button>
          <Link
            href="/admin/collaborators?tab=rut-tien"
            className="inline-flex h-10 w-full items-center justify-center rounded-2xl border border-[#E2E8F0] px-4 text-sm font-semibold text-[#0F172A] hover:bg-slate-50 sm:w-auto"
          >
            Đặt lại
          </Link>
        </div>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-[#E2E8F0]">
        <table className="w-full min-w-[1080px] text-left text-sm">
          <thead className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[#0F172A]">
            <tr>
              <th className="px-3 py-3 font-semibold sm:px-4">Ngày tạo</th>
              <th className="px-3 py-3 font-semibold sm:px-4">CTV</th>
              <th className="px-3 py-3 font-semibold sm:px-4">Số tiền</th>
              <th className="px-3 py-3 font-semibold sm:px-4">Ngân hàng</th>
              <th className="px-3 py-3 font-semibold sm:px-4">Chủ tài khoản</th>
              <th className="px-3 py-3 font-semibold sm:px-4">Trạng thái</th>
              <th className="px-3 py-3 font-semibold sm:px-4">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const payment = parseWithdrawalPaymentInfo(row.paymentInfo);
              return (
                <tr key={row.id} className="border-b border-[#E2E8F0] align-top last:border-none">
                  <td className="whitespace-nowrap px-3 py-3 text-xs text-[#334155] sm:px-4 sm:text-sm">
                    {new Date(row.createdAt).toLocaleString("vi-VN")}
                  </td>
                  <td className="max-w-[220px] px-3 py-3 sm:px-4">
                    <p className="truncate font-medium text-[#0F172A]" title={row.affiliateDisplayName}>
                      {truncateText(row.affiliateDisplayName, 40)}
                    </p>
                    <p className="font-mono text-xs text-[#64748B]">{row.refCode}</p>
                    {row.customerPhone ? (
                      <p className="mt-0.5 text-xs text-[#64748B] tabular-nums">{row.customerPhone}</p>
                    ) : null}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 font-semibold tabular-nums text-[#0F172A] sm:px-4">
                    {formatCurrency(row.amount)}
                  </td>
                  <td className="max-w-[180px] px-3 py-3 text-[#0F172A] sm:px-4">
                    <span className="block truncate" title={payment.bank}>
                      {truncateText(payment.bank, 48)}
                    </span>
                  </td>
                  <td className="max-w-[200px] px-3 py-3 text-[#0F172A] sm:px-4">
                    <span className="block truncate" title={payment.accountName}>
                      {truncateText(payment.accountName, 52)}
                    </span>
                  </td>
                  <td className="px-3 py-3 sm:px-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${withdrawalStatusBadgeClass(row.status)}`}
                    >
                      {withdrawalStatusLabel(row.status)}
                    </span>
                    {row.status === "REJECTED" && row.adminNote ? (
                      <p className="mt-1 max-w-[200px] text-[11px] text-rose-800" title={row.adminNote}>
                        {truncateText(row.adminNote, 80)}
                      </p>
                    ) : null}
                  </td>
                  <td className="min-w-[160px] px-3 py-3 sm:px-4">
                    {row.status === "PENDING" || row.status === "APPROVED" ? (
                      <AffiliateWithdrawalActions
                        withdrawalId={row.id}
                        status={row.status}
                        redirectTo={redirectTo}
                      />
                    ) : (
                      <span className="text-xs text-[#64748B]">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {!rows.length ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-[#64748B]">
                  Chưa có yêu cầu rút tiền phù hợp bộ lọc.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
