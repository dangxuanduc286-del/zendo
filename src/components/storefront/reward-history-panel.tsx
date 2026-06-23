"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

type RewardHistoryItem = {
  id: string;
  points: number;
  type: string;
  description: string;
  createdAt: string;
  orderCode: string | null;
};

type RewardHistoryResponse = {
  items: RewardHistoryItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
};

const PAGE_SIZE = 20;

function formatPoints(points: number): string {
  const sign = points >= 0 ? "+" : "";
  return `${sign}${points.toLocaleString("vi-VN")}`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function describeType(type: string): string {
  const normalized = (type || "").trim().toLowerCase();
  if (normalized.includes("earn") || normalized.includes("order")) return "Điểm cộng từ đơn hàng";
  if (normalized.includes("rank") || normalized.includes("tier")) return "Điểm thưởng hạng thành viên";
  if (normalized.includes("redeem") || normalized.includes("spend")) return "Điểm trừ";
  if (normalized.includes("refund") || normalized.includes("revert")) return "Điểm hoàn lại";
  if (normalized.includes("adjust") || normalized.includes("admin")) return "Điều chỉnh điểm";
  if (normalized.includes("bonus")) return "Điểm thưởng";
  return type || "Giao dịch điểm";
}

function sourceLabel(item: RewardHistoryItem): string {
  if (item.orderCode) return `Đơn hàng #${item.orderCode}`;
  return describeType(item.type);
}

/**
 * Panel hiển thị toàn bộ lịch sử điểm thưởng — tải phân trang qua API.
 * Chỉ fetch khi tab active (lazy) — không tải cùng Dashboard.
 */
export default function RewardHistoryPanel({
  active,
  panelClassName,
}: {
  active: boolean;
  panelClassName: string;
}): JSX.Element {
  const [items, setItems] = useState<RewardHistoryItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);
  const loadingRef = useRef(false);

  const loadPage = useCallback(
    async (nextPage: number, replace: boolean): Promise<void> => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/account/reward-history?page=${nextPage}&pageSize=${PAGE_SIZE}`,
          { credentials: "same-origin" },
        );
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = (await res.json()) as RewardHistoryResponse;
        setItems((prev) => (replace ? data.items : [...prev, ...data.items]));
        setPage(data.page);
        setTotal(data.total);
        setHasMore(data.hasMore);
      } catch {
        setError("Không thể tải lịch sử điểm thưởng. Vui lòng thử lại.");
      } finally {
        setLoading(false);
        loadingRef.current = false;
      }
    },
    [],
  );

  useEffect(() => {
    if (!active) return;
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    void loadPage(1, true);
  }, [active, loadPage]);

  const handleLoadMore = useCallback(() => {
    if (!hasMore || loading) return;
    void loadPage(page + 1, false);
  }, [hasMore, loading, page, loadPage]);

  return (
    <section
      id="hoat-dong-diem-thuong"
      aria-labelledby="reward-history-heading"
      className={`${panelClassName} lg:p-6`}
    >
      <header className="flex flex-wrap items-end justify-between gap-2 border-b border-[#E2E8F0] pb-3">
        <div>
          <h3 id="reward-history-heading" className="text-lg font-semibold text-[#0F172A]">
            Hoạt động điểm thưởng
          </h3>
          <p className="mt-0.5 text-sm text-[#64748B]">
            Toàn bộ lịch sử cộng / trừ điểm và nguồn phát sinh điểm.
          </p>
        </div>
        <p className="text-xs font-medium tabular-nums text-slate-400">
          {total.toLocaleString("vi-VN")} giao dịch
        </p>
      </header>

      {loading && items.length === 0 ? (
        <div className="mt-6 flex items-center justify-center gap-2 text-sm text-[#64748B]">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Đang tải lịch sử điểm thưởng...
        </div>
      ) : error ? (
        <div className="mt-6 rounded-xl border border-dashed border-rose-200 bg-rose-50/60 p-4 text-center">
          <p className="text-sm font-semibold text-rose-700">{error}</p>
          <button
            type="button"
            onClick={() => loadPage(1, true)}
            className="mt-3 inline-flex h-10 items-center rounded-xl bg-[#2563EB] px-4 text-sm font-semibold text-white hover:bg-[#1D4ED8]"
          >
            Thử lại
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-[#E2E8F0] bg-[#F8FAFC] p-6 text-center">
          <p className="text-sm font-semibold text-[#0F172A]">Chưa có giao dịch điểm.</p>
          <p className="mt-1 text-sm text-[#64748B]">
            Với thẻ/ví: điểm cộng sau khi đặt hàng thành công. Với COD hoặc chuyển khoản: khi cửa hàng
            xác nhận đã thanh toán trên đơn. Hủy đơn hoặc hoàn tiền sẽ điều chỉnh điểm tương ứng.
          </p>
        </div>
      ) : (
        <>
          <ul className="mt-4 space-y-2.5">
            {items.map((tx) => {
              const positive = tx.points >= 0;
              return (
                <li key={tx.id}>
                  <article className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-[#E2E8F0] bg-white p-3.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-snug text-slate-700">
                        {tx.description || describeType(tx.type)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Nguồn: <span className="font-medium text-slate-600">{sourceLabel(tx)}</span>
                      </p>
                      <p className="mt-1 text-[11px] text-slate-400">
                        <time dateTime={tx.createdAt}>
                          {formatDate(tx.createdAt)} · {formatTime(tx.createdAt)}
                        </time>
                      </p>
                    </div>
                    <span
                      className={`shrink-0 tabular-nums text-sm font-semibold ${
                        positive ? "text-emerald-600" : "text-rose-600"
                      }`}
                    >
                      {formatPoints(tx.points)}
                    </span>
                  </article>
                </li>
              );
            })}
          </ul>

          {hasMore ? (
            <div className="mt-5 flex justify-center">
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={loading}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-4 text-sm font-semibold text-[#0F172A] transition hover:bg-[#EFF6FF] disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Đang tải...
                  </>
                ) : (
                  "Xem thêm giao dịch"
                )}
              </button>
            </div>
          ) : (
            <p className="mt-5 text-center text-xs text-slate-400">
              Đã hiển thị toàn bộ {total.toLocaleString("vi-VN")} giao dịch.
            </p>
          )}
        </>
      )}
    </section>
  );
}
