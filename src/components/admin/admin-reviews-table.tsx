"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { REVIEW_STATUS_LABELS, REVIEW_STATUS_OPTIONS, type ReviewAdminDto } from "../../lib/admin-review";
import MediaImage from "../shared/media-image";
import { resolveMediaUrl } from "../../lib/media";
import { adminInput, adminPrimaryButton, adminSecondaryButton, adminSelect } from "../../lib/admin-ui";

interface ProductOption {
  id: string;
  name: string;
}

function statusBadge(status: ReviewAdminDto["status"]): string {
  if (status === "APPROVED") return "bg-emerald-100 text-emerald-700";
  if (status === "PENDING") return "bg-amber-100 text-amber-700";
  if (status === "HIDDEN") return "bg-slate-200 text-slate-700";
  return "bg-rose-100 text-rose-700";
}

function displayBadge(status: ReviewAdminDto["status"]): { label: string; className: string } {
  if (status === "APPROVED") return { label: "Đang hiển thị", className: "bg-emerald-100 text-emerald-700" };
  return { label: "Đang ẩn", className: "bg-slate-200 text-slate-700" };
}

export default function AdminReviewsTable(): JSX.Element {
  const [items, setItems] = useState<ReviewAdminDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [productId, setProductId] = useState("");
  const [rating, setRating] = useState("");
  const [visibility, setVisibility] = useState("");
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [workingId, setWorkingId] = useState("");

  const loadData = useCallback(async (
    query = q,
    nextStatus = status,
    nextProductId = productId,
    nextRating = rating,
    nextVisibility = visibility,
  ) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (nextStatus) params.set("status", nextStatus);
      if (nextProductId) params.set("productId", nextProductId);
      if (nextRating) params.set("rating", nextRating);
      if (nextVisibility) params.set("visibility", nextVisibility);
      const response = await fetch(`/api/admin/reviews?${params.toString()}`, { cache: "no-store" });
      const payload = (await response.json()) as { items?: ReviewAdminDto[]; message?: string };
      if (!response.ok) setError(payload.message ?? "Không thể tải danh sách đánh giá.");
      else setItems(payload.items ?? []);
    } catch {
      setError("Có lỗi xảy ra khi tải dữ liệu.");
    } finally {
      setLoading(false);
    }
  }, [q, status, productId, rating, visibility]);

  useEffect(() => {
    void loadData("", "", "", "", "");
  }, [loadData]);

  useEffect(() => {
    const loadProducts = async () => {
      const response = await fetch("/api/admin/products", { cache: "no-store" });
      const payload = (await response.json()) as { items?: Array<{ id: string; name: string }> };
      setProducts(payload.items ?? []);
    };
    loadProducts().catch(() => {});
  }, []);

  const onDelete = async (id: string) => {
    if (!window.confirm("Bạn chắc chắn muốn xóa đánh giá này?")) return;
    setWorkingId(id);
    const response = await fetch(`/api/admin/reviews/${id}`, { method: "DELETE" });
    const payload = (await response.json()) as { message?: string };
    if (!response.ok) setError(payload.message ?? "Không thể xóa đánh giá.");
    else setItems((prev) => prev.filter((item) => item.id !== id));
    setWorkingId("");
  };

  const onModerate = async (id: string, action: "approve" | "hide" | "reject") => {
    setWorkingId(id);
    const response = await fetch(`/api/admin/reviews/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const payload = (await response.json()) as { item?: ReviewAdminDto; message?: string };
    if (!response.ok || !payload.item) setError(payload.message ?? "Không thể cập nhật trạng thái đánh giá.");
    else setItems((prev) => prev.map((item) => (item.id === id ? payload.item! : item)));
    setWorkingId("");
  };

  if (loading) {
    return <section className="rounded-2xl border border-[#E2E8F0] bg-white p-6 text-sm text-[#64748B] shadow-sm">Đang tải đánh giá...</section>;
  }

  return (
    <section className="space-y-4">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          loadData();
        }}
        className="grid grid-cols-1 gap-3 rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm md:grid-cols-2 xl:grid-cols-5"
      >
        <input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Tìm theo tên khách / tiêu đề / nội dung" className={adminInput} />
        <select value={productId} onChange={(event) => setProductId(event.target.value)} className={adminSelect}>
          <option value="">Tất cả sản phẩm</option>
          {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
        </select>
        <select value={rating} onChange={(event) => setRating(event.target.value)} className={adminSelect}>
          <option value="">Tất cả điểm sao</option>
          <option value="5">5 sao</option>
          <option value="4">4 sao</option>
          <option value="3">3 sao</option>
          <option value="2">2 sao</option>
          <option value="1">1 sao</option>
        </select>
        <select value={status} onChange={(event) => setStatus(event.target.value)} className={adminSelect}>
          <option value="">Tất cả trạng thái</option>
          {REVIEW_STATUS_OPTIONS.map((option) => <option key={option} value={option}>{REVIEW_STATUS_LABELS[option]}</option>)}
        </select>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 xl:grid-cols-1">
          <select value={visibility} onChange={(event) => setVisibility(event.target.value)} className={adminSelect}>
            <option value="">Hiển thị / ẩn</option>
            <option value="visible">Đang hiển thị</option>
            <option value="hidden">Đang ẩn</option>
          </select>
          <button type="submit" className={adminPrimaryButton}>Lọc</button>
          <button type="button" onClick={() => { setQ(""); setStatus(""); setProductId(""); setRating(""); setVisibility(""); loadData("", "", "", "", ""); }} className={adminSecondaryButton}>Xóa lọc</button>
        </div>
      </form>

      {error ? <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{error}</p> : null}

      <div className="overflow-x-auto rounded-2xl border border-[#E2E8F0] bg-white shadow-sm">
        <table className="min-w-[1200px] w-full text-left text-sm">
          <thead className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[#0F172A]">
            <tr>
              <th className="px-4 py-3 font-semibold">Khách hàng</th>
              <th className="px-4 py-3 font-semibold">Sản phẩm</th>
              <th className="px-4 py-3 font-semibold">Điểm</th>
              <th className="px-4 py-3 font-semibold">Tiêu đề</th>
              <th className="px-4 py-3 font-semibold">Trạng thái</th>
              <th className="px-4 py-3 font-semibold">Hiển thị</th>
              <th className="px-4 py-3 font-semibold">Ảnh</th>
              <th className="px-4 py-3 font-semibold">Ngày tạo</th>
              <th className="px-4 py-3 text-right font-semibold">Tác vụ</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const display = displayBadge(item.status);
              return (
                <tr key={item.id} className="border-b border-[#E2E8F0] last:border-none">
                  <td className="px-4 py-3">
                    <p className="font-medium text-[#0F172A]">{item.guestName || "Khách hàng"}</p>
                    <p className="text-xs text-[#64748B]">{item.guestEmail || "Không có email"}</p>
                  </td>
                  <td className="px-4 py-3 text-[#0F172A]">{item.productName}</td>
                  <td className="px-4 py-3 text-[#0F172A]">{item.rating} sao</td>
                  <td className="px-4 py-3 text-[#0F172A]">
                    <p className="font-medium text-[#0F172A]">{item.title || "Không có tiêu đề"}</p>
                    <p className="line-clamp-2 text-xs text-[#64748B]">{item.content}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusBadge(item.status)}`}>
                      {REVIEW_STATUS_LABELS[item.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${display.className}`}>
                      {display.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {item.reviewImages?.[0] ? (
                      <div className="relative h-12 w-12 overflow-hidden rounded-md border border-[#E2E8F0] bg-slate-100">
                        <MediaImage
                          src={resolveMediaUrl(item.reviewImages[0]) || item.reviewImages[0]}
                          alt="Ảnh đánh giá"
                          fallbackLabel="Ảnh đánh giá"
                          fill
                          className="object-cover"
                          sizes="48px"
                        />
                      </div>
                    ) : (
                      <span className="text-[#64748B]">Không có ảnh</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[#64748B]">{new Date(item.createdAt).toLocaleString("vi-VN")}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/admin/reviews/${item.id}`} className="inline-flex h-8 items-center rounded-xl border border-[#E2E8F0] px-3 text-xs font-medium text-[#0F172A]">Sửa</Link>
                      <button type="button" onClick={() => onModerate(item.id, "approve")} disabled={workingId === item.id} className="inline-flex h-8 items-center rounded-md border border-emerald-200 px-3 text-xs font-medium text-emerald-700 disabled:opacity-60">Duyệt</button>
                      <button type="button" onClick={() => onModerate(item.id, "hide")} disabled={workingId === item.id} className="inline-flex h-8 items-center rounded-md border border-amber-200 px-3 text-xs font-medium text-amber-700 disabled:opacity-60">Ẩn</button>
                      <button type="button" onClick={() => onDelete(item.id)} disabled={workingId === item.id} className="inline-flex h-8 items-center rounded-md border border-rose-200 px-3 text-xs font-medium text-rose-700 disabled:opacity-60">Xóa</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!items.length ? <p className="rounded-lg border border-[#E2E8F0] bg-white p-4 text-center text-sm text-[#64748B]">Chưa có đánh giá phù hợp.</p> : null}
    </section>
  );
}

