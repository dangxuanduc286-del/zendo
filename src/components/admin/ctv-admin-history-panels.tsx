"use client";

import Link from "next/link";
import type { CtvTierHistoryRow } from "@/lib/admin/ctv-tier-history-admin";
import type { CtvRewardTransactionRow } from "@/lib/admin/ctv-reward-transactions-admin";
import type { CtvNotificationRow } from "@/lib/admin/ctv-notifications-admin";
import type { ReactNode } from "react";

function formatVnd(n: number): string {
  return `${new Intl.NumberFormat("vi-VN").format(n)}₫`;
}

function formatDt(d: Date): string {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(d);
}

type TierOption = { id: string; name: string };

export function CtvTierHistoryAdminPanel({
  rows,
  total,
  tiers,
  query,
  tierId,
  from,
  to,
}: {
  rows: CtvTierHistoryRow[];
  total: number;
  tiers: TierOption[];
  query: string;
  tierId: string;
  from: string;
  to: string;
}): JSX.Element {
  const qs = new URLSearchParams();
  if (query) qs.set("th_q", query);
  if (tierId) qs.set("th_tier", tierId);
  if (from) qs.set("th_from", from);
  if (to) qs.set("th_to", to);
  const exportHref = `/api/admin/ctv-tier-history/export${qs.toString() ? `?${qs}` : ""}`;

  return (
    <AdminHistoryShell
      title="Lịch sử lên / xuống hạng"
      description="CtvTierHistory — mỗi lần đổi cấp ghi một bản ghi."
      tab="lich-su-cap"
      exportHref={exportHref}
      total={total}
      rowsShown={rows.length}
      filters={
        <>
          <FilterField name="th_q" label="Tìm kiếm" defaultValue={query} placeholder="CTV, hạng…" />
          <FilterSelect name="th_tier" label="Hạng" defaultValue={tierId} options={[{ value: "", label: "Tất cả" }, ...tiers.map((t) => ({ value: t.id, label: t.name }))]} />
          <FilterDate name="th_from" label="Từ ngày" defaultValue={from} />
          <FilterDate name="th_to" label="Đến ngày" defaultValue={to} />
        </>
      }
    >
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead className="border-b bg-slate-50">
          <tr>
            <th className="px-4 py-3 font-semibold">Thời gian</th>
            <th className="px-4 py-3 font-semibold">CTV</th>
            <th className="px-4 py-3 font-semibold">Từ</th>
            <th className="px-4 py-3 font-semibold">Đến</th>
            <th className="px-4 py-3 font-semibold">Doanh thu</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b last:border-0">
              <td className="px-4 py-3">{formatDt(r.createdAt)}</td>
              <td className="px-4 py-3">
                {r.affiliateDisplayName}
                <span className="ml-1 font-mono text-xs text-slate-500">{r.refCode}</span>
              </td>
              <td className="px-4 py-3">{r.fromTierName ?? "—"}</td>
              <td className="px-4 py-3 font-medium">{r.toTierName}</td>
              <td className="px-4 py-3 tabular-nums">{formatVnd(r.revenue)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </AdminHistoryShell>
  );
}

export function CtvRewardTransactionsAdminPanel({
  rows,
  total,
  query,
  from,
  to,
}: {
  rows: CtvRewardTransactionRow[];
  total: number;
  query: string;
  from: string;
  to: string;
}): JSX.Element {
  const qs = new URLSearchParams();
  if (query) qs.set("tx_q", query);
  if (from) qs.set("tx_from", from);
  if (to) qs.set("tx_to", to);
  const exportHref = `/api/admin/ctv-reward-transactions/export${qs.toString() ? `?${qs}` : ""}`;

  return (
    <AdminHistoryShell
      title="Giao dịch ví thưởng doanh thu"
      description="CtvRevenueRewardTransaction — mỗi lần cộng ví một transaction."
      tab="giao-dich-thuong"
      exportHref={exportHref}
      total={total}
      rowsShown={rows.length}
      filters={
        <>
          <FilterField name="tx_q" label="Tìm kiếm" defaultValue={query} placeholder="Transaction, CTV…" />
          <FilterDate name="tx_from" label="Từ ngày" defaultValue={from} />
          <FilterDate name="tx_to" label="Đến ngày" defaultValue={to} />
        </>
      }
    >
      <table className="w-full min-w-[960px] text-left text-sm">
        <thead className="border-b bg-slate-50">
          <tr>
            <th className="px-4 py-3 font-semibold">Thời gian</th>
            <th className="px-4 py-3 font-semibold">CTV</th>
            <th className="px-4 py-3 font-semibold">Hạng</th>
            <th className="px-4 py-3 font-semibold">Số tiền</th>
            <th className="px-4 py-3 font-semibold">Transaction ID</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b last:border-0">
              <td className="px-4 py-3">{formatDt(r.createdAt)}</td>
              <td className="px-4 py-3">{r.affiliateDisplayName}</td>
              <td className="px-4 py-3">{r.tierName}</td>
              <td className="px-4 py-3 font-semibold text-emerald-700">{formatVnd(r.amount)}</td>
              <td className="max-w-[160px] truncate px-4 py-3 font-mono text-xs" title={r.id}>
                {r.id}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </AdminHistoryShell>
  );
}

export function CtvNotificationsAdminPanel({
  rows,
  total,
  query,
  type,
  from,
  to,
}: {
  rows: CtvNotificationRow[];
  total: number;
  query: string;
  type: string;
  from: string;
  to: string;
}): JSX.Element {
  const qs = new URLSearchParams();
  if (query) qs.set("nt_q", query);
  if (type) qs.set("nt_type", type);
  if (from) qs.set("nt_from", from);
  if (to) qs.set("nt_to", to);
  const exportHref = `/api/admin/ctv-notifications/export${qs.toString() ? `?${qs}` : ""}`;

  return (
    <AdminHistoryShell
      title="Thông báo CTV"
      description="Thông báo thưởng doanh thu và thay đổi cấp bậc (dedupe theo tier / sự kiện)."
      tab="thong-bao-ctv"
      exportHref={exportHref}
      total={total}
      rowsShown={rows.length}
      filters={
        <>
          <FilterField name="nt_q" label="Tìm kiếm" defaultValue={query} placeholder="Tiêu đề, CTV…" />
          <FilterSelect
            name="nt_type"
            label="Loại"
            defaultValue={type}
            options={[
              { value: "", label: "Tất cả" },
              { value: "CTV_REVENUE_REWARD", label: "Thưởng doanh thu" },
              { value: "CTV_TIER_UP", label: "Lên hạng" },
              { value: "CTV_TIER_DOWN", label: "Xuống hạng" },
            ]}
          />
          <FilterDate name="nt_from" label="Từ ngày" defaultValue={from} />
          <FilterDate name="nt_to" label="Đến ngày" defaultValue={to} />
        </>
      }
    >
      <table className="w-full min-w-[1000px] text-left text-sm">
        <thead className="border-b bg-slate-50">
          <tr>
            <th className="px-4 py-3 font-semibold">Thời gian</th>
            <th className="px-4 py-3 font-semibold">Khách</th>
            <th className="px-4 py-3 font-semibold">Loại</th>
            <th className="px-4 py-3 font-semibold">Tiêu đề</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b last:border-0">
              <td className="px-4 py-3">{formatDt(r.createdAt)}</td>
              <td className="px-4 py-3">{r.customerLabel}</td>
              <td className="px-4 py-3 font-mono text-xs">{r.notificationType ?? "—"}</td>
              <td className="px-4 py-3">
                <p className="font-medium">{r.title}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{r.body}</p>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </AdminHistoryShell>
  );
}

function AdminHistoryShell({
  title,
  description,
  tab,
  exportHref,
  total,
  rowsShown,
  filters,
  children,
}: {
  title: string;
  description: string;
  tab: string;
  exportHref: string;
  total: number;
  rowsShown: number;
  filters: ReactNode;
  children: ReactNode;
}): JSX.Element {
  return (
    <section className="space-y-4 rounded-2xl border border-[#E2E8F0] bg-white p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#0F172A]">{title}</h2>
          <p className="mt-1 text-sm text-[#64748B]">{description}</p>
        </div>
        <a
          href={exportHref}
          className="inline-flex h-10 shrink-0 items-center rounded-2xl bg-[#2563EB] px-4 text-sm font-semibold text-white hover:bg-[#1d4ed8]"
        >
          Xuất CSV
        </a>
      </div>
      <form className="grid grid-cols-1 gap-3 lg:grid-cols-12" action="/admin/collaborators" method="GET">
        <input type="hidden" name="tab" value={tab} />
        {filters}
        <div className="flex items-end gap-2 lg:col-span-12">
          <button type="submit" className="inline-flex h-10 items-center rounded-2xl bg-[#0F172A] px-4 text-sm font-semibold text-white">
            Lọc
          </button>
          <Link href={`/admin/collaborators?tab=${tab}`} className="inline-flex h-10 items-center rounded-2xl border px-4 text-sm font-semibold">
            Đặt lại
          </Link>
        </div>
      </form>
      <p className="text-sm text-[#64748B]">
        Hiển thị <strong>{rowsShown}</strong>
        {total > rowsShown ? ` / ${total}` : ""} bản ghi
      </p>
      <div className="overflow-x-auto rounded-2xl border border-[#E2E8F0]">{children}</div>
    </section>
  );
}

function FilterField({
  name,
  label,
  defaultValue,
  placeholder,
}: {
  name: string;
  label: string;
  defaultValue: string;
  placeholder?: string;
}): JSX.Element {
  return (
    <label className="space-y-1 lg:col-span-3">
      <span className="text-xs font-medium text-[#64748B]">{label}</span>
      <input
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-[#E2E8F0] px-3 py-2 text-sm outline-none focus:border-[#2563EB]"
      />
    </label>
  );
}

function FilterDate({ name, label, defaultValue }: { name: string; label: string; defaultValue: string }): JSX.Element {
  return (
    <label className="space-y-1 lg:col-span-2">
      <span className="text-xs font-medium text-[#64748B]">{label}</span>
      <input
        type="date"
        name={name}
        defaultValue={defaultValue}
        className="w-full rounded-2xl border border-[#E2E8F0] px-3 py-2 text-sm outline-none focus:border-[#2563EB]"
      />
    </label>
  );
}

function FilterSelect({
  name,
  label,
  defaultValue,
  options,
}: {
  name: string;
  label: string;
  defaultValue: string;
  options: { value: string; label: string }[];
}): JSX.Element {
  return (
    <label className="space-y-1 lg:col-span-2">
      <span className="text-xs font-medium text-[#64748B]">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="w-full rounded-2xl border border-[#E2E8F0] px-3 py-2 text-sm outline-none focus:border-[#2563EB]"
      >
        {options.map((o) => (
          <option key={o.value || "all"} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
