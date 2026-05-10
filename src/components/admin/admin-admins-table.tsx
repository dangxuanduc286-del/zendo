"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { AdminUserDto } from "../../lib/admin-user";

interface AdminUsersPayload {
  items?: AdminUserDto[];
  canManageUsers?: boolean;
  message?: string;
}

function statusLabel(status: AdminUserDto["status"]): string {
  if (status === "ACTIVE") return "Hoạt động";
  if (status === "INACTIVE") return "Tạm khóa";
  return "Tạm dừng";
}

export default function AdminAdminsTable(): JSX.Element {
  const [items, setItems] = useState<AdminUserDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState("");
  const [canManageUsers, setCanManageUsers] = useState(false);

  const sorted = useMemo(
    () =>
      [...items].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      ),
    [items],
  );

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/admins", { cache: "no-store" });
      const payload = (await response.json()) as AdminUsersPayload;
      if (!response.ok) {
        setError(payload.message ?? "Không thể tải danh sách quản trị viên.");
        setLoading(false);
        return;
      }
      setItems(payload.items ?? []);
      setCanManageUsers(Boolean(payload.canManageUsers));
      setLoading(false);
    } catch {
      setError("Có lỗi xảy ra khi tải danh sách quản trị viên.");
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onToggleStatus = async (item: AdminUserDto) => {
    if (!canManageUsers) return;
    const nextStatus = item.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    setUpdatingId(item.id);
    setError("");
    try {
      const response = await fetch(`/api/admin/admins/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: item.fullName,
          email: item.email,
          roleId: item.roleId,
          status: nextStatus,
          password: "",
        }),
      });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        setError(payload.message ?? "Không thể cập nhật trạng thái quản trị viên.");
        setUpdatingId("");
        return;
      }
      setItems((prev) =>
        prev.map((entry) =>
          entry.id === item.id
            ? {
                ...entry,
                status: nextStatus,
              }
            : entry,
        ),
      );
      setUpdatingId("");
    } catch {
      setError("Có lỗi xảy ra khi cập nhật trạng thái.");
      setUpdatingId("");
    }
  };

  if (loading) {
    return (
      <section className="rounded-xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600">
        Đang tải danh sách quản trị viên...
      </section>
    );
  }

  return (
    <section className="space-y-4">
      {error ? (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
          {error}
        </p>
      ) : null}

      {!canManageUsers ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700">
          Bạn chỉ có quyền xem danh sách admin.
        </p>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <div className="hidden md:block">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[#0F172A]">
              <tr>
                <th className="px-4 py-3 font-semibold">Họ tên</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Trạng thái</th>
                <th className="px-4 py-3 font-semibold">Cập nhật</th>
                <th className="px-4 py-3 text-right font-semibold">Tác vụ</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((item) => (
                <tr key={item.id} className="border-b border-zinc-100 last:border-none">
                  <td className="px-4 py-3 font-medium text-zinc-900">{item.fullName}</td>
                  <td className="px-4 py-3 text-zinc-600">{item.email}</td>
                  <td className="px-4 py-3 text-zinc-700">{item.roleName}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                        item.status === "ACTIVE"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {statusLabel(item.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    {new Date(item.updatedAt).toLocaleString("vi-VN")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/admins/${item.id}`}
                        className="inline-flex h-8 items-center rounded-md border border-zinc-300 px-3 text-xs font-medium text-zinc-700 transition hover:border-zinc-400 hover:text-zinc-900"
                      >
                        Sửa
                      </Link>
                      <button
                        type="button"
                        disabled={!canManageUsers || updatingId === item.id}
                        onClick={() => onToggleStatus(item)}
                        className="inline-flex h-8 items-center rounded-md border border-zinc-300 px-3 text-xs font-medium text-zinc-700 transition hover:border-zinc-400 disabled:opacity-60"
                      >
                        {updatingId === item.id
                          ? "Đang xử lý..."
                          : item.status === "ACTIVE"
                            ? "Khóa"
                            : "Mở khóa"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-3 p-3 md:hidden">
          {sorted.map((item) => (
            <article key={item.id} className="rounded-lg border border-zinc-200 p-3">
              <h3 className="text-sm font-semibold text-zinc-900">{item.fullName}</h3>
              <p className="mt-1 text-xs text-zinc-500">{item.email}</p>
              <p className="text-xs text-zinc-500">{item.roleName}</p>
              <p className="mt-1 text-xs text-zinc-500">{statusLabel(item.status)}</p>
              <div className="mt-3 flex gap-2">
                <Link
                  href={`/admin/admins/${item.id}`}
                  className="inline-flex h-9 items-center rounded-md border border-zinc-300 px-3 text-xs font-medium text-zinc-700"
                >
                  Sửa
                </Link>
                <button
                  type="button"
                  disabled={!canManageUsers || updatingId === item.id}
                  onClick={() => onToggleStatus(item)}
                  className="inline-flex h-9 items-center rounded-md border border-zinc-300 px-3 text-xs font-medium text-zinc-700 disabled:opacity-60"
                >
                  {updatingId === item.id
                    ? "Đang xử lý..."
                    : item.status === "ACTIVE"
                      ? "Khóa"
                      : "Mở khóa"}
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

