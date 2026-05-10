"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { PostAdminDto } from "../../lib/admin-post";
import { resolveMediaUrl } from "../../lib/media";

export default function AdminPostsTable(): JSX.Element {
  const [items, setItems] = useState<PostAdminDto[]>([]);
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
      const response = await fetch("/api/admin/posts", { cache: "no-store" });
      const payload = (await response.json()) as { items?: PostAdminDto[]; message?: string };
      if (!response.ok) {
        setError(payload.message ?? "Không thể tải danh sách bài viết.");
        setLoading(false);
        return;
      }
      setItems(payload.items ?? []);
      setLoading(false);
    } catch {
      setError("Có lỗi xảy ra khi tải danh sách bài viết.");
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onDelete = async (id: string) => {
    if (!window.confirm("Bạn chắc chắn muốn xóa bài viết này?")) return;
    setDeletingId(id);
    setError("");
    try {
      const response = await fetch(`/api/admin/posts/${id}`, { method: "DELETE" });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        setError(payload.message ?? "Không thể xóa bài viết.");
        setDeletingId("");
        return;
      }
      setItems((prev) => prev.filter((item) => item.id !== id));
      setDeletingId("");
    } catch {
      setError("Có lỗi xảy ra khi xóa bài viết.");
      setDeletingId("");
    }
  };

  if (loading) {
    return (
      <section className="rounded-xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600">
        Đang tải bài viết...
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
                <th className="px-4 py-3 font-semibold">Ảnh đại diện</th>
                <th className="px-4 py-3 font-semibold">Tiêu đề</th>
                <th className="px-4 py-3 font-semibold">Trạng thái</th>
                <th className="px-4 py-3 font-semibold">Ngày đăng</th>
                <th className="px-4 py-3 text-right font-semibold">Tác vụ</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((item) => {
                const thumbnail = resolveMediaUrl(item.thumbnail);
                return (
                  <tr key={item.id} className="border-b border-zinc-100 last:border-none">
                    <td className="px-4 py-3">
                      <div className="relative h-12 w-16 overflow-hidden rounded-md border border-[#E2E8F0] bg-slate-100">
                        {thumbnail ? (
                          <Image
                            src={thumbnail}
                            alt={item.title}
                            fill
                            sizes="64px"
                            className="object-cover"
                          />
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-zinc-900">{item.title}</p>
                      <p className="line-clamp-1 text-xs text-zinc-500">{item.slug}</p>
                    </td>
                    <td className="px-4 py-3 text-zinc-700">{item.status}</td>
                    <td className="px-4 py-3 text-zinc-700">
                      {item.publishedAt ? new Date(item.publishedAt).toLocaleString("vi-VN") : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/posts/${item.id}`}
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
            </tbody>
          </table>
        </div>

        <div className="space-y-3 p-3 md:hidden">
          {sorted.map((item) => {
            const thumbnail = resolveMediaUrl(item.thumbnail);
            return (
              <article key={item.id} className="rounded-lg border border-zinc-200 bg-white p-3">
                <div className="flex items-start gap-3">
                  <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-md border border-[#E2E8F0] bg-slate-100">
                    {thumbnail ? (
                      <Image src={thumbnail} alt={item.title} fill sizes="80px" className="object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-zinc-900">{item.title}</h3>
                    <p className="line-clamp-1 text-xs text-zinc-500">{item.slug}</p>
                    <p className="text-xs text-zinc-500">{item.status}</p>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <Link
                    href={`/admin/posts/${item.id}`}
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
            );
          })}
        </div>
      </div>
    </section>
  );
}

