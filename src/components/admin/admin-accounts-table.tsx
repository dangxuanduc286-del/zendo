"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { roleLabel, statusLabel, type AccountListResponse, type AccountStatus, type AdminAccountListItem } from "../../lib/admin-account";

const ROLE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "ALL", label: "Tất cả" },
  { value: "ADMIN", label: "Quản trị" },
  { value: "COLLABORATOR", label: "Cộng tác viên" },
  { value: "CUSTOMER", label: "Khách hàng" },
];

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "ALL", label: "Tất cả" },
  { value: "ACTIVE", label: "Hoạt động" },
  { value: "LOCKED", label: "Đã khóa" },
  { value: "SOFT_DELETED", label: "Đã xóa mềm" },
];

const ORDER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "ALL", label: "Tất cả" },
  { value: "HAS_ORDER", label: "Có đơn hàng" },
  { value: "NO_ORDER", label: "Chưa có đơn" },
];

const SORT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "NEWEST", label: "Mới nhất" },
  { value: "OLDEST", label: "Cũ nhất" },
  { value: "LAST_LOGIN", label: "Đăng nhập gần nhất" },
  { value: "MOST_ORDERS", label: "Nhiều đơn nhất" },
];

export default function AdminAccountsTable(): JSX.Element {
  const [items, setItems] = useState<AdminAccountListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [role, setRole] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [orderFilter, setOrderFilter] = useState("ALL");
  const [sort, setSort] = useState("NEWEST");
  const [page, setPage] = useState(1);
  const [stats, setStats] = useState<AccountListResponse["stats"]>({
    totalAccounts: 0,
    customers: 0,
    collaborators: 0,
    admins: 0,
    active: 0,
    locked: 0,
  });
  const [totalPages, setTotalPages] = useState(1);
  const [canManageUsers, setCanManageUsers] = useState(false);
  const [updatingId, setUpdatingId] = useState("");

  const query = useMemo(
    () =>
      new URLSearchParams({
        q,
        role,
        status,
        orderFilter,
        sort,
        page: String(page),
        pageSize: "20",
      }).toString(),
    [q, role, status, orderFilter, sort, page],
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/accounts?${query}`, { cache: "no-store" });
      const payload = (await response.json()) as AccountListResponse & { message?: string };
      if (!response.ok) {
        setError(payload.message ?? "Không thể tải danh sách tài khoản.");
        setLoading(false);
        return;
      }
      setItems(payload.items ?? []);
      setStats(payload.stats);
      setTotalPages(payload.totalPages);
      setCanManageUsers(Boolean(payload.canManageUsers));
      setLoading(false);
    } catch {
      setError("Có lỗi xảy ra khi tải danh sách tài khoản.");
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const resetFilters = () => {
    setQ("");
    setRole("ALL");
    setStatus("ALL");
    setOrderFilter("ALL");
    setSort("NEWEST");
    setPage(1);
  };

  const toggleLock = async (item: AdminAccountListItem) => {
    if (!canManageUsers) return;
    const action = item.status === "ACTIVE" ? "LOCKED" : "ACTIVE";
    if (!window.confirm(item.status === "ACTIVE" ? "Khóa tài khoản này?" : "Mở khóa tài khoản này?")) return;
    setUpdatingId(item.id);
    const response = await fetch(`/api/admin/accounts/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "set_status", status: action }),
    });
    const payload = (await response.json()) as { message?: string };
    if (!response.ok) setError(payload.message ?? "Không thể cập nhật trạng thái.");
    setUpdatingId("");
    await loadData();
  };

  const toggleSoftDelete = async (item: AdminAccountListItem) => {
    if (!canManageUsers) return;
    const action: AccountStatus = item.status === "SOFT_DELETED" ? "ACTIVE" : "SOFT_DELETED";
    if (!window.confirm(action === "SOFT_DELETED" ? "Xóa mềm tài khoản này?" : "Khôi phục tài khoản này?")) return;
    setUpdatingId(item.id);
    const response = await fetch(`/api/admin/accounts/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "set_status", status: action }),
    });
    const payload = (await response.json()) as { message?: string };
    if (!response.ok) setError(payload.message ?? "Không thể cập nhật trạng thái xóa mềm.");
    setUpdatingId("");
    await loadData();
  };

  if (loading) return <section className="rounded-2xl border border-[#E2E8F0] bg-white p-6 text-sm text-[#64748B]">Đang tải danh sách tài khoản...</section>;

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-6">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm kiếm tên, email, SDT..." className="h-11 rounded-lg border border-zinc-300 px-3 text-sm lg:col-span-2" />
          <select value={role} onChange={(e) => setRole(e.target.value)} className="h-11 rounded-lg border border-zinc-300 px-3 text-sm">{ROLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-11 rounded-lg border border-zinc-300 px-3 text-sm">{STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
          <select value={orderFilter} onChange={(e) => setOrderFilter(e.target.value)} className="h-11 rounded-lg border border-zinc-300 px-3 text-sm">{ORDER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="h-11 rounded-lg border border-zinc-300 px-3 text-sm">{SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
        </div>
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={() => setPage(1)} className="h-10 rounded-md bg-[#2563EB] px-4 text-sm font-semibold text-white">Áp dụng</button>
          <button type="button" onClick={resetFilters} className="h-10 rounded-md border border-zinc-300 px-4 text-sm font-medium text-zinc-700">Xóa lọc</button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
        <StatCard label="Tổng tài khoản" value={stats.totalAccounts} />
        <StatCard label="Khách hàng" value={stats.customers} />
        <StatCard label="Cộng tác viên" value={stats.collaborators} />
        <StatCard label="Quản trị" value={stats.admins} />
        <StatCard label="Đang hoạt động" value={stats.active} />
        <StatCard label="Đã khóa" value={stats.locked} />
      </div>

      {error ? <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{error}</p> : null}
      <div className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[#0F172A]">
            <tr>
              <th className="px-4 py-3 font-semibold">Họ tên</th>
              <th className="px-4 py-3 font-semibold">Email</th>
              <th className="px-4 py-3 font-semibold">SDT</th>
              <th className="px-4 py-3 font-semibold">Vai trò</th>
              <th className="px-4 py-3 font-semibold">Trạng thái</th>
              <th className="px-4 py-3 font-semibold">Ngày tạo</th>
              <th className="px-4 py-3 font-semibold">Đăng nhập gần nhất</th>
              <th className="px-4 py-3 font-semibold">Đơn hàng</th>
              <th className="px-4 py-3 text-right font-semibold">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-[#E2E8F0] last:border-none hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-[#0F172A]">{item.fullName}</td>
                <td className="px-4 py-3 text-[#0F172A]">{item.email || "-"}</td>
                <td className="px-4 py-3 text-[#64748B]">{item.phone || "-"}</td>
                <td className="px-4 py-3"><Badge>{roleLabel(item.role)}</Badge></td>
                <td className="px-4 py-3"><Badge tone={item.status === "ACTIVE" ? "success" : item.status === "SOFT_DELETED" ? "danger" : "neutral"}>{statusLabel(item.status)}</Badge></td>
                <td className="px-4 py-3 text-[#64748B]">{new Date(item.createdAt).toLocaleDateString("vi-VN")}</td>
                <td className="px-4 py-3 text-[#64748B]">{item.lastLoginAt ? new Date(item.lastLoginAt).toLocaleString("vi-VN") : "-"}</td>
                <td className="px-4 py-3 text-[#0F172A]">{item.orderCount}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Link href={`/admin/admins/${item.id}?scope=${item.scope}`} className="h-8 rounded-md border border-zinc-300 px-3 text-xs font-medium leading-8 text-zinc-700">Chi tiết</Link>
                    <button type="button" onClick={() => toggleLock(item)} disabled={updatingId === item.id} className="h-8 rounded-md border border-zinc-300 px-3 text-xs font-medium text-zinc-700 disabled:opacity-60">{item.status === "ACTIVE" ? "Khóa" : "Mở khóa"}</button>
                    <button type="button" onClick={() => toggleSoftDelete(item)} disabled={updatingId === item.id} className="h-8 rounded-md border border-rose-200 px-3 text-xs font-medium text-rose-700 disabled:opacity-60">{item.status === "SOFT_DELETED" ? "Khôi phục" : "Xóa mềm"}</button>
                  </div>
                </td>
              </tr>
            ))}
            {!items.length ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-[#64748B]">Không tìm thấy tài khoản phù hợp.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-end gap-2">
        <button type="button" onClick={() => setPage((v) => Math.max(1, v - 1))} className="h-9 rounded-md border border-zinc-300 px-3 text-sm text-zinc-700">Trước</button>
        <span className="text-sm text-zinc-600">Trang {page}/{totalPages}</span>
        <button type="button" onClick={() => setPage((v) => Math.min(totalPages, v + 1))} className="h-9 rounded-md border border-zinc-300 px-3 text-sm text-zinc-700">Sau</button>
      </div>
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: number }): JSX.Element {
  return (
    <article className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
      <p className="text-xs text-[#64748B]">{label}</p>
      <p className="mt-1 text-2xl font-bold text-[#0F172A]">{value}</p>
    </article>
  );
}

function Badge({
  children,
  tone = "neutral",
}: {
  children: string;
  tone?: "success" | "neutral" | "danger";
}): JSX.Element {
  const cls =
    tone === "success"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : tone === "danger"
        ? "bg-rose-50 text-rose-700 border-rose-200"
        : "bg-slate-100 text-slate-700 border-slate-200";
  return <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${cls}`}>{children}</span>;
}
