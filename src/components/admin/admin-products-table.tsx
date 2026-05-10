"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { formatVnd } from "../../lib/currency";
import { type ProductAdminDto, PRODUCT_STATUS_OPTIONS } from "../../lib/admin-product";
import { resolveMediaUrl } from "../../lib/media";
import ProductArchiveButtons from "./product-archive-buttons";
import { adminInput, adminPrimaryButton, adminSecondaryButton, adminSelect } from "../../lib/admin-ui";

interface OptionItem {
  id: string;
  name: string;
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Đang bán",
  DRAFT: "Nháp",
  ARCHIVED: "Đã lưu trữ",
  OUT_OF_STOCK: "Hết hàng",
};

export default function AdminProductsTable(): JSX.Element {
  const [items, setItems] = useState<ProductAdminDto[]>([]);
  const [categories, setCategories] = useState<OptionItem[]>([]);
  const [brands, setBrands] = useState<OptionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [flag, setFlag] = useState("");
  const [deletingId, setDeletingId] = useState("");

  const loadData = useCallback(async (
    query = q,
    nextStatus = status,
    nextCategoryId = categoryId,
    nextBrandId = brandId,
    nextFlag = flag,
  ) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (nextStatus) params.set("status", nextStatus);
      if (nextCategoryId) params.set("categoryId", nextCategoryId);
      if (nextBrandId) params.set("brandId", nextBrandId);
      if (nextFlag) params.set("flag", nextFlag);
      const response = await fetch(`/api/admin/products?${params.toString()}`, { cache: "no-store" });
      const payload = (await response.json()) as { items?: ProductAdminDto[]; message?: string };
      if (!response.ok) {
        setError(payload.message ?? "Không thể tải danh sách sản phẩm.");
      } else {
        setItems(payload.items ?? []);
      }
    } catch {
      setError("Có lỗi xảy ra khi tải dữ liệu.");
    } finally {
      setLoading(false);
    }
  }, [q, status, categoryId, brandId, flag]);

  useEffect(() => {
    const initStatus = new URLSearchParams(window.location.search).get("status") ?? "";
    if (initStatus) setStatus(initStatus);
    void loadData("", initStatus);
  }, [loadData]);

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [categoriesResponse, brandsResponse] = await Promise.all([
          fetch("/api/admin/categories", { cache: "no-store" }),
          fetch("/api/admin/brands", { cache: "no-store" }),
        ]);
        const categoriesPayload = (await categoriesResponse.json()) as { items?: OptionItem[] };
        const brandsPayload = (await brandsResponse.json()) as { items?: OptionItem[] };
        setCategories(categoriesPayload.items ?? []);
        setBrands(brandsPayload.items ?? []);
      } catch {
        // keep silent; filters are optional
      }
    };
    void loadOptions();
  }, []);

  const onDelete = async (id: string) => {
    if (!window.confirm("Bạn chắc chắn muốn xóa sản phẩm này?")) return;
    setDeletingId(id);
    setError("");
    try {
      const response = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        setError(payload.message ?? "Không thể xóa sản phẩm.");
      } else {
        setItems((prev) => prev.filter((item) => item.id !== id));
      }
    } catch {
      setError("Có lỗi xảy ra khi xóa sản phẩm.");
    } finally {
      setDeletingId("");
    }
  };

  return (
    <section className="space-y-4">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          loadData();
        }}
        className="grid grid-cols-1 gap-3 rounded-xl border border-[#E2E8F0] bg-white p-4 xl:grid-cols-[1fr_180px_180px_180px_180px_auto]"
      >
        <input
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="Tìm theo tên, slug, SKU"
          className={adminInput}
        />
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className={adminSelect}
        >
          <option value="">Tất cả trạng thái</option>
          {PRODUCT_STATUS_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {STATUS_LABELS[option] ?? option}
            </option>
          ))}
        </select>
        <select
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
          className={adminSelect}
        >
          <option value="">Tất cả danh mục</option>
          {categories.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
        <select
          value={brandId}
          onChange={(event) => setBrandId(event.target.value)}
          className={adminSelect}
        >
          <option value="">Tất cả thương hiệu</option>
          {brands.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
        <select
          value={flag}
          onChange={(event) => setFlag(event.target.value)}
          className={adminSelect}
        >
          <option value="">Nổi bật / Mới / Bán chạy</option>
          <option value="featured">Nổi bật</option>
          <option value="new">Mới</option>
          <option value="bestSeller">Bán chạy</option>
        </select>
        <div className="flex gap-2">
          <button
            type="submit"
            className={adminPrimaryButton}
          >
            Lọc
          </button>
          <button
            type="button"
            onClick={() => {
              setQ("");
              setStatus("");
              setCategoryId("");
              setBrandId("");
              setFlag("");
              loadData("", "", "", "", "");
            }}
            className={adminSecondaryButton}
          >
            Xóa lọc
          </button>
        </div>
      </form>

      {error ? (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
          {error}
        </p>
      ) : null}

      {loading ? (
        <section className="rounded-xl border border-[#E2E8F0] bg-white p-6 text-sm text-[#64748B]">
          Đang tải sản phẩm...
        </section>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-[1150px] w-full text-left text-sm">
              <thead className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[#0F172A]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Ảnh</th>
                  <th className="px-4 py-3 font-semibold">Sản phẩm</th>
                  <th className="px-4 py-3 font-semibold">SKU</th>
                  <th className="px-4 py-3 font-semibold">Giá</th>
                  <th className="px-4 py-3 font-semibold">Tồn</th>
                  <th className="px-4 py-3 font-semibold">Đã bán</th>
                  <th className="px-4 py-3 font-semibold">Trạng thái</th>
                  <th className="px-4 py-3 text-right font-semibold">Tác vụ</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const image = resolveMediaUrl(item.primaryImage || item.images[0] || "");
                  return <tr key={item.id} className="border-b border-[#E2E8F0] last:border-none">
                    <td className="px-4 py-3">
                      <div className="relative h-12 w-12 overflow-hidden rounded-md border border-[#E2E8F0] bg-slate-100">
                        {image ? (
                          <Image src={image} alt={item.name} fill sizes="48px" className="object-contain" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-[10px] text-[#64748B]">No image</div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-[#0F172A]">{item.name}</p>
                      <p className="text-xs text-[#64748B]">{item.slug}</p>
                    </td>
                    <td className="px-4 py-3 text-[#0F172A]">{item.sku}</td>
                    <td className="px-4 py-3 text-[#0F172A]">{formatVnd(Number(item.salePrice ?? item.basePrice))}</td>
                    <td className="px-4 py-3 text-[#0F172A]">{item.stockQuantity}</td>
                    <td className="px-4 py-3 text-[#0F172A]">{item.soldCount}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                        item.status === "ACTIVE"
                          ? "bg-emerald-100 text-emerald-700"
                          : item.status === "DRAFT"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-slate-200 text-slate-700"
                      }`}>
                        {STATUS_LABELS[item.status] ?? item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <ProductArchiveButtons
                          productId={item.id}
                          onArchived={() =>
                            setItems((prev) =>
                              prev.map((product) =>
                                product.id === item.id ? { ...product, status: "ARCHIVED" } : product,
                              ),
                            )
                          }
                        />
                        <button
                          type="button"
                          onClick={() => onDelete(item.id)}
                          disabled={deletingId === item.id}
                          className="inline-flex h-8 items-center rounded-md border border-rose-200 px-3 text-xs font-medium text-rose-700 disabled:opacity-60"
                        >
                          {deletingId === item.id ? "Đang xóa..." : "Xóa"}
                        </button>
                      </div>
                    </td>
                  </tr>;
                })}
                {!items.length ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-[#64748B]">
                      Chưa có sản phẩm phù hợp.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

