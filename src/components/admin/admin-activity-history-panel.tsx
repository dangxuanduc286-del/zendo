"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { adminSecondaryButton, adminTabActive, adminTabBase, adminTabInactive } from "@/lib/admin-ui";

type FeedItem = {
  id: string;
  category: string;
  categoryLabel: string;
  title: string;
  summary: string;
  actorLabel: string | null;
  actionHref: string;
  createdAt: string;
  hasUnreadNotification: boolean;
};

const FILTERS: Array<{ id: string; label: string }> = [
  { id: "ALL", label: "Tất cả" },
  { id: "CTV", label: "CTV" },
  { id: "CUSTOMER", label: "Khách hàng" },
  { id: "ORDER", label: "Đơn hàng" },
  { id: "PAYMENT", label: "Thanh toán" },
  { id: "WITHDRAWAL", label: "Rút tiền" },
  { id: "PAYOUT_ACCOUNT", label: "TK nhận tiền" },
  { id: "CTV_APPLICATION", label: "Đăng ký CTV" },
  { id: "COMMISSION", label: "Hoa hồng" },
  { id: "REWARD_POINTS", label: "Điểm thưởng" },
  { id: "SUPPORT", label: "Hỗ trợ" },
  { id: "SYSTEM", label: "Hệ thống" },
];

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return iso;
  }
}

export default function AdminActivityHistoryPanel(): JSX.Element {
  const [category, setCategory] = useState("ALL");
  const [items, setItems] = useState<FeedItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const qs = new URLSearchParams();
      qs.set("category", category);
      qs.set("limit", "50");
      const res = await fetch(`/api/admin/operational-events?${qs.toString()}`, {
        credentials: "same-origin",
        cache: "no-store",
      });
      const j = (await res.json()) as { ok?: boolean; items?: FeedItem[]; total?: number; message?: string };
      if (!res.ok || !j.ok) {
        setError(j.message ?? "Không tải được lịch sử.");
        setItems([]);
        setTotal(0);
        return;
      }
      setItems(j.items ?? []);
      setTotal(typeof j.total === "number" ? j.total : 0);
    } catch {
      setError("Không tải được lịch sử.");
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="rounded-2xl border border-[#E2E8F0] bg-white">
      <div className="border-b border-slate-100 px-4 py-4 sm:px-5">
        <h2 className="text-lg font-bold text-[#0F172A]">Lịch sử hoạt động</h2>
        <p className="mt-1 text-sm text-[#64748B]">
          Tổng hợp yêu cầu và sự kiện cần theo dõi — không thay thế các tab chuyên sâu bên dưới.
        </p>
      </div>

      <div className="overflow-x-auto border-b border-slate-100 p-2">
        <div className="flex min-w-max flex-wrap gap-2">
          {FILTERS.map((f) => {
            const active = f.id === category;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setCategory(f.id)}
                className={`${adminTabBase} font-semibold ${active ? adminTabActive : adminTabInactive}`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 border-b border-slate-50 px-4 py-2 text-xs text-slate-500 sm:px-5">
        <span>{total} sự kiện</span>
        <button type="button" onClick={() => void load()} className={adminSecondaryButton}>
          Làm mới
        </button>
      </div>

      {error ? <p className="px-4 py-6 text-sm text-rose-700 sm:px-5">{error}</p> : null}
      {loading && !items.length ? (
        <p className="px-4 py-10 text-center text-sm text-slate-500 sm:px-5">Đang tải…</p>
      ) : null}
      {!loading && !error && !items.length ? (
        <p className="px-4 py-10 text-center text-sm text-slate-500 sm:px-5">Chưa có sự kiện trong bộ lọc này.</p>
      ) : null}

      <ul className="divide-y divide-slate-100">
        {items.map((row) => (
          <li key={row.id}>
            <Link
              href={row.actionHref}
              className="flex flex-col gap-1 px-4 py-3 transition hover:bg-slate-50 sm:px-5 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-wide text-sky-800">[{row.categoryLabel}]</p>
                <p className="text-sm font-semibold text-[#0F172A]">
                  {row.actorLabel ? (
                    <>
                      <span className="text-[#0F172A]">{row.actorLabel}</span>
                      <span className="font-normal text-slate-600"> — {row.summary}</span>
                    </>
                  ) : (
                    row.summary
                  )}
                </p>
                {row.hasUnreadNotification ? (
                  <span className="mt-1 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-900">
                    Chưa đọc
                  </span>
                ) : null}
              </div>
              <time className="shrink-0 text-xs tabular-nums text-slate-500 sm:pt-1">{formatWhen(row.createdAt)}</time>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
