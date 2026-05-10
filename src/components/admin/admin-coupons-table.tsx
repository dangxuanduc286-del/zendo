"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CouponAdminDto } from "../../lib/admin-coupon";

function formatAmount(value: number | null): string {
  if (value === null) return "-";
  return new Intl.NumberFormat("vi-VN").format(value);
}

function formatDateRange(startAt: string, endAt: string): string {
  const fmt = new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" });
  const start = startAt ? new Date(startAt) : null;
  const end = endAt ? new Date(endAt) : null;
  const startText = start && Number.isFinite(start.getTime()) ? fmt.format(start) : "Ngay";
  const endText = end && Number.isFinite(end.getTime()) ? fmt.format(end) : "Khong gioi han";
  return `${startText} - ${endText}`;
}

function resolveStatus(item: CouponAdminDto): { label: string; className: string } {
  const now = Date.now();
  const start = item.startAt ? new Date(item.startAt).getTime() : null;
  const end = item.endAt ? new Date(item.endAt).getTime() : null;
  if (!item.isActive || item.status === "DISABLED") {
    return { label: "Tạm tắt", className: "bg-slate-200 text-slate-700" };
  }
  if (start && Number.isFinite(start) && start > now) {
    return { label: "Chưa bắt đầu", className: "bg-sky-100 text-sky-700" };
  }
  if (end && Number.isFinite(end) && end < now) {
    return { label: "Hết hạn", className: "bg-amber-100 text-amber-700" };
  }
  return { label: "Đang hoạt động", className: "bg-emerald-100 text-emerald-700" };
}

function discountTypeLabel(item: CouponAdminDto): string {
  if (item.discountType === "PERCENT") return "Giảm theo %";
  if (item.discountType === "FIXED_AMOUNT") return "Giảm số tiền";
  return "Miễn phí vận chuyển";
}

function discountValueLabel(item: CouponAdminDto): string {
  if (item.discountType === "PERCENT") {
    const max = item.maxDiscountValue ? ` (toi da ${formatAmount(item.maxDiscountValue)} ${item.currency})` : "";
    return `${item.discountValue}%${max}`;
  }
  if (item.discountType === "FREE_SHIPPING") return "Mien phi van chuyen";
  return `${formatAmount(item.discountValue)} ${item.currency}`;
}

export default function AdminCouponsTable(): JSX.Element {
  const [items, setItems] = useState<CouponAdminDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState("");

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
      const response = await fetch("/api/admin/coupons", { cache: "no-store" });
      const payload = (await response.json()) as { items?: CouponAdminDto[]; message?: string };
      if (!response.ok) {
        setError(payload.message ?? "Không thể tải danh sách mã giảm giá.");
        setLoading(false);
        return;
      }
      setItems(payload.items ?? []);
      setLoading(false);
    } catch {
      setError("Có lỗi xảy ra khi tải danh sách mã giảm giá.");
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onDelete = async (id: string) => {
    if (!window.confirm("Bạn chắc chắn muốn xóa mã giảm giá này?")) return;
    setDeletingId(id);
    setError("");
    try {
      const response = await fetch(`/api/admin/coupons/${id}`, { method: "DELETE" });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        setError(payload.message ?? "Không thể xóa mã giảm giá.");
        setDeletingId("");
        return;
      }
      setItems((prev) => prev.filter((item) => item.id !== id));
      setDeletingId("");
    } catch {
      setError("Có lỗi xảy ra khi xóa mã giảm giá.");
      setDeletingId("");
    }
  };

  if (loading) {
    return (
      <section className="rounded-xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600">
        Đang tải mã giảm giá...
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

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <div className="min-w-[980px]">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[#0F172A]">
              <tr>
                <th className="px-4 py-3 font-semibold">Code</th>
                <th className="px-4 py-3 font-semibold">Tên</th>
                <th className="px-4 py-3 font-semibold">Loại</th>
                <th className="px-4 py-3 font-semibold">Giá trị</th>
                <th className="px-4 py-3 font-semibold">Thời gian</th>
                <th className="px-4 py-3 font-semibold">Đã dùng / Giới hạn</th>
                <th className="px-4 py-3 font-semibold">Trạng thái</th>
                <th className="px-4 py-3 text-right font-semibold">Tác vụ</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((item) => {
                const status = resolveStatus(item);
                return (
                <tr key={item.id} className="border-b border-zinc-100 last:border-none">
                  <td className="px-4 py-3 font-semibold text-zinc-900">{item.code}</td>
                  <td className="px-4 py-3 text-zinc-700">
                    <p className="font-medium text-zinc-900">{item.name}</p>
                    {item.description ? <p className="text-xs text-zinc-500">{item.description}</p> : null}
                  </td>
                  <td className="px-4 py-3 text-zinc-700">{discountTypeLabel(item)}</td>
                  <td className="px-4 py-3 text-zinc-700">{discountValueLabel(item)}</td>
                  <td className="px-4 py-3 text-zinc-700">{formatDateRange(item.startAt, item.endAt)}</td>
                  <td className="px-4 py-3 text-zinc-700">{item.usedCount} / {item.usageLimit ?? "Khong gioi han"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${status.className}`}
                    >
                      {status.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/coupons/${item.id}`}
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
              )})}
            </tbody>
          </table>
        </div>

        <div className="space-y-3 p-3 md:hidden">
          {sorted.map((item) => {
            const status = resolveStatus(item);
            return (
            <article key={item.id} className="rounded-lg border border-zinc-200 bg-white p-3">
              <h3 className="text-sm font-semibold text-zinc-900">{item.code} - {item.name}</h3>
              <p className="mt-1 text-xs text-zinc-600">
                {discountTypeLabel(item)} - {discountValueLabel(item)}
              </p>
              <p className="text-xs text-zinc-500">Thời gian: {formatDateRange(item.startAt, item.endAt)}</p>
              <p className="text-xs text-zinc-500">
                Đã dùng / Giới hạn: {item.usedCount} / {item.usageLimit ?? "Khong gioi han"}
              </p>
              <p className="mt-2">
                <span
                  className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${status.className}`}
                >
                  {status.label}
                </span>
              </p>
              <div className="mt-3 flex gap-2">
                <Link
                  href={`/admin/coupons/${item.id}`}
                  className="inline-flex h-9 items-center rounded-md border border-zinc-300 px-3 text-xs font-medium text-zinc-700"
                >
                  Sửa
                </Link>
                <button
                  type="button"
                  onClick={() => onDelete(item.id)}
                  disabled={deletingId === item.id}
                  className="inline-flex h-9 items-center rounded-md border border-rose-200 px-3 text-xs font-medium text-rose-700 disabled:opacity-60"
                >
                  {deletingId === item.id ? "Đang xóa..." : "Xóa"}
                </button>
              </div>
            </article>
          )})}
        </div>
      </div>
    </section>
  );
}

