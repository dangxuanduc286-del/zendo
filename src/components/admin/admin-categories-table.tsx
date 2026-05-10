"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Fragment } from "react";
import type { CategoryAdminDto } from "../../lib/admin-category";

export default function AdminCategoriesTable(): JSX.Element {
  const [items, setItems] = useState<CategoryAdminDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [togglingId, setTogglingId] = useState("");
  const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>({});

  const sorted = useMemo(
    () =>
      [...items].sort(
        (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "vi"),
      ),
    [items],
  );

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/categories", { cache: "no-store" });
      const payload = (await response.json()) as { items?: CategoryAdminDto[]; message?: string };
      if (!response.ok) {
        setError(payload.message ?? "Không thể tải danh sách danh mục.");
        setLoading(false);
        return;
      }
      setItems(payload.items ?? []);
      setExpandedParents((current) => {
        const validParentIds = new Set((payload.items ?? []).map((item) => item.id));
        const next: Record<string, boolean> = {};
        for (const [parentId, isExpanded] of Object.entries(current)) {
          if (validParentIds.has(parentId) && isExpanded) {
            next[parentId] = true;
          }
        }
        return next;
      });
      setLoading(false);

    } catch {
      setError("Có lỗi xảy ra khi tải danh sách.");
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onDelete = async (id: string) => {
    if (!window.confirm("Bạn chắc chắn muốn xóa danh mục này?")) {
      return;
    }
    setDeletingId(id);
    setError("");
    try {
      const response = await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        setError(payload.message ?? "Không thể xóa danh mục.");
        setDeletingId("");
        return;
      }
      await loadData();
      setDeletingId("");
    } catch {
      setError("Có lỗi xảy ra khi xóa danh mục.");
      setDeletingId("");
    }
  };

  const toggleExpand = (parentId: string) => {
    setExpandedParents((current) => ({ ...current, [parentId]: !current[parentId] }));
  };

  const onToggleStatus = async (item: CategoryAdminDto) => {
    setError("");
    setTogglingId(item.id);
    try {
      const response = await fetch(`/api/admin/categories/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: item.name,
          slug: item.slug,
          parentId: item.parentId ?? "",
          sortOrder: item.sortOrder,
          image: item.image ?? "",
          shortDescription: item.shortDescription ?? "",
          seoTitle: item.seoTitle ?? "",
          seoDescription: item.seoDescription ?? "",
          isActive: !item.isActive,
          showOnHome: item.showOnHome,
        }),
      });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        setError(payload.message ?? "Không thể đổi trạng thái danh mục.");
        setTogglingId("");
        return;
      }
      await loadData();
      setTogglingId("");
    } catch {
      setError("Có lỗi xảy ra khi đổi trạng thái.");
      setTogglingId("");
    }
  };

  const renderStatusBadge = (item: CategoryAdminDto) => (
    <div className="flex flex-col gap-1">
      <span
        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
          item.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"
        }`}
      >
        {item.isActive ? "Đang bật" : "Đang tắt"}
      </span>
      <span
        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
          item.showOnHome ? "bg-sky-100 text-sky-700" : "bg-rose-100 text-rose-700"
        }`}
      >
        {item.showOnHome ? "Trên home: Bật" : "Trên home: Đã tắt"}
      </span>
    </div>
  );

  if (loading) {
    return (
      <section className="rounded-xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600">
        Đang tải danh mục...
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

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <div className="hidden md:block">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[#0F172A]">
              <tr>
                <th className="px-4 py-3 font-semibold">Tên</th>
                <th className="px-4 py-3 font-semibold">Slug</th>
                <th className="px-4 py-3 font-semibold">Thứ tự</th>
                <th className="px-4 py-3 font-semibold">Trạng thái</th>
                <th className="px-4 py-3 font-semibold">Cập nhật</th>
                <th className="px-4 py-3 text-right font-semibold">Tác vụ</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((parent) => (
                <Fragment key={parent.id}>
                  <tr className="border-b border-[#E2E8F0] bg-slate-50/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {(parent.children?.length ?? 0) > 0 ? (
                          <button
                            type="button"
                            onClick={() => toggleExpand(parent.id)}
                            className="inline-flex h-6 w-6 items-center justify-center rounded border border-zinc-300 text-xs text-zinc-600"
                            aria-expanded={Boolean(expandedParents[parent.id])}
                            aria-label={expandedParents[parent.id] ? "Đóng danh mục con" : "Mở danh mục con"}
                          >
                            {expandedParents[parent.id] ? "−" : "+"}
                          </button>
                        ) : (
                          <span
                            aria-hidden
                            className="inline-flex h-6 w-6 items-center justify-center rounded border border-zinc-200 text-zinc-300"
                          >
                            ·
                          </span>
                        )}
                        <div>
                          <p className="font-semibold text-zinc-900">{parent.name}</p>
                          <p className="text-xs text-zinc-500">
                            Cấp 1 - {parent.children?.length ?? 0} danh mục con
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-600">{parent.slug}</td>
                    <td className="px-4 py-3 text-zinc-600">{parent.sortOrder}</td>
                    <td className="px-4 py-3">{renderStatusBadge(parent)}</td>
                    <td className="px-4 py-3 text-zinc-600">{new Date(parent.updatedAt).toLocaleString("vi-VN")}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/categories/new?parentId=${parent.id}`}
                          className="inline-flex h-8 items-center rounded-md border border-zinc-300 px-3 text-xs font-medium text-zinc-700 transition hover:border-zinc-400 hover:text-zinc-900"
                        >
                          + Con
                        </Link>
                        <button
                          type="button"
                          onClick={() => onToggleStatus(parent)}
                          disabled={togglingId === parent.id}
                          className="inline-flex h-8 items-center rounded-md border border-zinc-300 px-3 text-xs font-medium text-zinc-700 transition hover:border-zinc-400 disabled:opacity-60"
                        >
                          {togglingId === parent.id ? "Đang xử lý..." : parent.isActive ? "Tắt" : "Bật"}
                        </button>
                        <Link
                          href={`/admin/categories/${parent.id}`}
                          className="inline-flex h-8 items-center rounded-md border border-zinc-300 px-3 text-xs font-medium text-zinc-700 transition hover:border-zinc-400 hover:text-zinc-900"
                        >
                          Sửa
                        </Link>
                        <button
                          type="button"
                          onClick={() => onDelete(parent.id)}
                          disabled={deletingId === parent.id}
                          className="inline-flex h-8 items-center rounded-md border border-rose-200 px-3 text-xs font-medium text-rose-700 transition hover:border-rose-300 disabled:opacity-60"
                        >
                          {deletingId === parent.id ? "Đang xóa..." : "Xóa"}
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedParents[parent.id]
                    ? (parent.children ?? [])
                        .slice()
                        .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "vi"))
                        .map((child) => (
                          <tr key={child.id} className="border-b border-zinc-100 last:border-none">
                            <td className="px-4 py-3">
                              <div className="pl-8">
                                <p className="font-medium text-zinc-900">{child.name}</p>
                                <p className="text-xs text-zinc-500">Cấp 2</p>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-zinc-600">{child.slug}</td>
                            <td className="px-4 py-3 text-zinc-600">{child.sortOrder}</td>
                            <td className="px-4 py-3">{renderStatusBadge(child)}</td>
                            <td className="px-4 py-3 text-zinc-600">
                              {new Date(child.updatedAt).toLocaleString("vi-VN")}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => onToggleStatus(child)}
                                  disabled={togglingId === child.id}
                                  className="inline-flex h-8 items-center rounded-md border border-zinc-300 px-3 text-xs font-medium text-zinc-700 transition hover:border-zinc-400 disabled:opacity-60"
                                >
                                  {togglingId === child.id ? "Đang xử lý..." : child.isActive ? "Tắt" : "Bật"}
                                </button>
                                <Link
                                  href={`/admin/categories/${child.id}`}
                                  className="inline-flex h-8 items-center rounded-md border border-zinc-300 px-3 text-xs font-medium text-zinc-700 transition hover:border-zinc-400 hover:text-zinc-900"
                                >
                                  Sửa
                                </Link>
                                <button
                                  type="button"
                                  onClick={() => onDelete(child.id)}
                                  disabled={deletingId === child.id}
                                  className="inline-flex h-8 items-center rounded-md border border-rose-200 px-3 text-xs font-medium text-rose-700 transition hover:border-rose-300 disabled:opacity-60"
                                >
                                  {deletingId === child.id ? "Đang xóa..." : "Xóa"}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                    : null}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-3 p-3 md:hidden">
          {sorted.map((parent) => (
            <article key={parent.id} className="rounded-lg border border-zinc-200 bg-white p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="mb-1 flex items-center gap-2">
                    {(parent.children?.length ?? 0) > 0 ? (
                      <button
                        type="button"
                        onClick={() => toggleExpand(parent.id)}
                        className="inline-flex h-6 w-6 items-center justify-center rounded border border-zinc-300 text-xs text-zinc-600"
                        aria-expanded={Boolean(expandedParents[parent.id])}
                        aria-label={expandedParents[parent.id] ? "Đóng danh mục con" : "Mở danh mục con"}
                      >
                        {expandedParents[parent.id] ? "−" : "+"}
                      </button>
                    ) : (
                      <span
                        aria-hidden
                        className="inline-flex h-6 w-6 items-center justify-center rounded border border-zinc-200 text-zinc-300"
                      >
                        ·
                      </span>
                    )}
                    <h3 className="text-sm font-semibold text-zinc-900">{parent.name}</h3>
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">Cấp 1 - {parent.slug}</p>
                  <p className="mt-1 text-xs text-zinc-500">Thứ tự: {parent.sortOrder}</p>
                </div>
                {renderStatusBadge(parent)}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href={`/admin/categories/new?parentId=${parent.id}`}
                  className="inline-flex h-9 items-center rounded-md border border-zinc-300 px-3 text-xs font-medium text-zinc-700"
                >
                  + Danh mục con
                </Link>
                <button
                  type="button"
                  onClick={() => onToggleStatus(parent)}
                  disabled={togglingId === parent.id}
                  className="inline-flex h-9 items-center rounded-md border border-zinc-300 px-3 text-xs font-medium text-zinc-700 disabled:opacity-60"
                >
                  {togglingId === parent.id ? "Đang xử lý..." : parent.isActive ? "Tắt" : "Bật"}
                </button>
                <Link
                  href={`/admin/categories/${parent.id}`}
                  className="inline-flex h-9 items-center rounded-md border border-zinc-300 px-3 text-xs font-medium text-zinc-700"
                >
                  Sửa
                </Link>
                <button
                  type="button"
                  onClick={() => onDelete(parent.id)}
                  disabled={deletingId === parent.id}
                  className="inline-flex h-9 items-center rounded-md border border-rose-200 px-3 text-xs font-medium text-rose-700 disabled:opacity-60"
                >
                  {deletingId === parent.id ? "Đang xóa..." : "Xóa"}
                </button>
              </div>
              {(parent.children ?? []).length && expandedParents[parent.id] ? (
                <div className="mt-3 space-y-2 border-t border-zinc-200 pt-3">
                  {(parent.children ?? [])
                    .slice()
                    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "vi"))
                    .map((child) => (
                      <div key={child.id} className="rounded-md border border-zinc-200 p-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium text-zinc-900">{child.name}</p>
                            <p className="text-xs text-zinc-500">{child.slug}</p>
                            <p className="text-xs text-zinc-500">Thứ tự: {child.sortOrder}</p>
                          </div>
                          {renderStatusBadge(child)}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => onToggleStatus(child)}
                            disabled={togglingId === child.id}
                            className="inline-flex h-8 items-center rounded-md border border-zinc-300 px-2.5 text-xs font-medium text-zinc-700 disabled:opacity-60"
                          >
                            {togglingId === child.id ? "Đang xử lý..." : child.isActive ? "Tắt" : "Bật"}
                          </button>
                          <Link
                            href={`/admin/categories/${child.id}`}
                            className="inline-flex h-8 items-center rounded-md border border-zinc-300 px-2.5 text-xs font-medium text-zinc-700"
                          >
                            Sửa
                          </Link>
                          <button
                            type="button"
                            onClick={() => onDelete(child.id)}
                            disabled={deletingId === child.id}
                            className="inline-flex h-8 items-center rounded-md border border-rose-200 px-2.5 text-xs font-medium text-rose-700 disabled:opacity-60"
                          >
                            {deletingId === child.id ? "Đang xóa..." : "Xóa"}
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
