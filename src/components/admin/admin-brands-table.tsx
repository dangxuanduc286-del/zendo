"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { BrandAdminDto } from "../../lib/admin-brand";
import { resolveMediaUrl } from "../../lib/media";

export default function AdminBrandsTable(): JSX.Element {
  const [items, setItems] = useState<BrandAdminDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"" | "active" | "inactive">("");

  const sorted = useMemo(
    () =>
      [...items].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      ),
    [items],
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const search = new URLSearchParams();
      if (q.trim()) search.set("q", q.trim());
      if (status) search.set("status", status);
      const response = await fetch(`/api/admin/brands${search.toString() ? `?${search}` : ""}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as { items?: BrandAdminDto[]; message?: string };
      if (!response.ok) {
        setError(payload.message ?? "Không thể tải danh sách thương hiệu.");
        setLoading(false);
        return;
      }
      setItems(payload.items ?? []);
      setLoading(false);

    } catch {
      setError("Có lỗi xảy ra khi tải danh sách.");
      setLoading(false);
    }
  }, [q, status]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onDelete = async (id: string) => {
    if (!window.confirm("Bạn chắc chắn muốn xóa thương hiệu này?")) {
      return;
    }
    setDeletingId(id);
    setError("");
    try {
      const response = await fetch(`/api/admin/brands/${id}`, { method: "DELETE" });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        setError(payload.message ?? "Không thể xóa thương hiệu.");
        setDeletingId("");
        return;
      }
      setItems((prev) => prev.filter((item) => item.id !== id));
      setDeletingId("");
    } catch {
      setError("Có lỗi xảy ra khi xóa thương hiệu.");
      setDeletingId("");
    }
  };

  if (loading) {
    return (
      <section className="rounded-xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600">
        Đang tải thương hiệu...
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm sm:p-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_220px_auto]">
          <label className="space-y-1">
            <span className="text-sm font-medium text-zinc-700">Tìm theo tên hoặc slug</span>
            <input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="VD: zendo, thuong-hieu-a"
              className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-500"
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-zinc-700">Trạng thái</span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as "" | "active" | "inactive")}
              className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-500"
            >
              <option value="">Tất cả</option>
              <option value="active">Đang bật</option>
              <option value="inactive">Đã tắt</option>
            </select>
          </label>
          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={() => loadData()}
              className="inline-flex h-10 items-center rounded-xl bg-[#2563EB] px-4 text-sm font-semibold text-white transition hover:bg-[#1D4ED8]"
            >
              Lọc
            </button>
            <button
              type="button"
              onClick={() => {
                setQ("");
                setStatus("");
              }}
              className="inline-flex h-10 items-center rounded-md border border-zinc-300 px-4 text-sm font-medium text-zinc-700 transition hover:border-zinc-400"
            >
              Xóa lọc
            </button>
          </div>
        </div>
      </div>
      {error ? (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
          {error}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[#0F172A]">
              <tr>
                <th className="px-4 py-3 font-semibold">Logo</th>
                <th className="px-4 py-3 font-semibold">Tên thương hiệu</th>
                <th className="px-4 py-3 font-semibold">Slug</th>
                <th className="px-4 py-3 font-semibold">Số sản phẩm</th>
                <th className="px-4 py-3 font-semibold">Trạng thái</th>
                <th className="px-4 py-3 font-semibold">Ngày tạo</th>
                <th className="px-4 py-3 font-semibold">Cập nhật</th>
                <th className="px-4 py-3 text-right font-semibold">Tác vụ</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((item) => {
                const logo = resolveMediaUrl(item.logo);
                return (
                  <tr key={item.id} className="border-b border-zinc-100 last:border-none">
                    <td className="px-4 py-3">
                      <div className="relative h-10 w-10 overflow-hidden rounded-md border border-[#E2E8F0] bg-slate-100">
                        {logo ? (
                          <Image
                            src={logo}
                            alt={item.name}
                            fill
                            sizes="40px"
                            className="object-contain"
                          />
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-zinc-900">{item.name}</p>
                      {item.description ? (
                        <p className="line-clamp-1 text-xs text-zinc-500">{item.description}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-zinc-600">{item.slug}</td>
                    <td className="px-4 py-3 text-zinc-700">{item.productCount}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                          item.isActive
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {item.isActive ? "Đang bật" : "Đã tắt"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-600">
                      {new Date(item.createdAt).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}
                    </td>
                    <td className="px-4 py-3 text-zinc-600">
                      {new Date(item.updatedAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/brands/${item.id}`}
                          className="inline-flex h-8 items-center rounded-md border border-zinc-300 px-3 text-xs font-medium text-zinc-700 transition hover:border-zinc-400 hover:text-zinc-900"
                        >
                          Sửa
                        </Link>
                        <button
                          type="button"
                          onClick={() => onDelete(item.id)}
                          disabled={deletingId === item.id}
                          className="inline-flex h-8 items-center rounded-md border border-rose-200 px-3 text-xs font-medium text-rose-700 transition hover:border-rose-300 disabled:opacity-60"
                        >
                          {deletingId === item.id ? "Đang xóa..." : "Xóa"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!sorted.length ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-zinc-500">
                    Chưa có thương hiệu nào.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
