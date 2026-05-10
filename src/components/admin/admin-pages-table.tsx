"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PAGE_STATUS_OPTIONS, type PageAdminDto } from "../../lib/admin-page";
import { adminPrimaryButton } from "../../lib/admin-ui";

export default function AdminPagesTable(): JSX.Element {
  const [items, setItems] = useState<PageAdminDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [deletingId, setDeletingId] = useState("");

  const loadData = useCallback(async (query = q, nextStatus = status) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (nextStatus) params.set("status", nextStatus);
      const response = await fetch(`/api/admin/pages?${params.toString()}`, { cache: "no-store" });
      const payload = (await response.json()) as { items?: PageAdminDto[]; message?: string };
      if (!response.ok) setError(payload.message ?? "Không thể tải danh sách trang.");
      else setItems(payload.items ?? []);
    } catch {
      setError("Có lỗi xảy ra khi tải dữ liệu.");
    } finally {
      setLoading(false);
    }
  }, [q, status]);

  useEffect(() => {
    void loadData("", "");
  }, [loadData]);

  const onDelete = async (id: string) => {
    if (!window.confirm("Bạn chắc chắn muốn xóa trang này?")) return;
    setDeletingId(id);
    setError("");
    try {
      const response = await fetch(`/api/admin/pages/${id}`, { method: "DELETE" });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) setError(payload.message ?? "Không thể xóa trang.");
      else setItems((prev) => prev.filter((item) => item.id !== id));
    } catch {
      setError("Có lỗi xảy ra khi xóa.");
    } finally {
      setDeletingId("");
    }
  };

  if (loading) {
    return (
      <section className="rounded-xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600">
        Đang tải trang nội dung...
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          loadData();
        }}
        className="grid grid-cols-1 gap-3 rounded-xl border border-zinc-200 bg-white p-4 md:grid-cols-[1fr_220px_auto]"
      >
        <input
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="Tìm theo tiêu đề hoặc slug"
          className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-500"
        />
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-500"
        >
          <option value="">Tất cả trạng thái</option>
          {PAGE_STATUS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
        <div className="flex gap-2">
          <button type="submit" className={adminPrimaryButton}>Lọc</button>
          <button type="button" onClick={() => { setQ(""); setStatus(""); loadData("", ""); }} className="inline-flex h-10 items-center rounded-md border border-zinc-300 px-4 text-sm font-medium text-zinc-700">Xóa lọc</button>
        </div>
      </form>

      {error ? <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{error}</p> : null}

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[#0F172A]">
            <tr>
              <th className="px-4 py-3 font-semibold">Tiêu đề</th>
              <th className="px-4 py-3 font-semibold">Slug</th>
              <th className="px-4 py-3 font-semibold">Trạng thái</th>
              <th className="px-4 py-3 font-semibold">Cập nhật</th>
              <th className="px-4 py-3 text-right font-semibold">Tác vụ</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-zinc-100 last:border-none">
                <td className="px-4 py-3 font-medium text-zinc-900">{item.title}</td>
                <td className="px-4 py-3 text-zinc-700">{item.slug}</td>
                <td className="px-4 py-3 text-zinc-700">{item.status}</td>
                <td className="px-4 py-3 text-zinc-600">{new Date(item.updatedAt).toLocaleString("vi-VN")}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <Link href={`/admin/pages/${item.id}`} className="inline-flex h-8 items-center rounded-md border border-zinc-300 px-3 text-xs font-medium text-zinc-700">Sửa</Link>
                    <button type="button" onClick={() => onDelete(item.id)} disabled={deletingId === item.id} className="inline-flex h-8 items-center rounded-md border border-rose-200 px-3 text-xs font-medium text-rose-700 disabled:opacity-60">
                      {deletingId === item.id ? "Đang xóa..." : "Xóa"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!items.length ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">Chưa có trang nội dung phù hợp.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

