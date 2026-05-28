"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, CheckCircle2, CircleDollarSign, Clock3, History, Loader2, Medal, WalletCards } from "lucide-react";
import { CtvDataEmpty, CtvDataError } from "./data/ctv-data-states";
import { CTV_CTA_SECONDARY } from "../affiliate/affiliate-ctv-account-ui-tokens";
import { CTV_V2_PANEL_INSET } from "./ctv-ui-tokens";

type CtvAccountHistoryCategory =
  | "application"
  | "payout"
  | "withdrawal"
  | "reward"
  | "tier"
  | "notification"
  | "affiliate";

type CtvAccountHistoryItem = {
  id: string;
  eventType: string;
  category: CtvAccountHistoryCategory;
  title: string;
  body: string;
  createdAt: string;
  source: "domain" | "notification";
  actionHref: string | null;
  read: boolean;
  notificationId: string | null;
};

type HistoryResponse = {
  ok?: boolean;
  message?: string;
  items?: CtvAccountHistoryItem[];
  unreadNotificationIds?: string[];
};

const categoryLabel: Record<CtvAccountHistoryCategory, string> = {
  application: "Đăng ký",
  payout: "TK nhận tiền",
  withdrawal: "Rút tiền",
  reward: "Thưởng",
  tier: "Hạng CTV",
  notification: "Thông báo",
  affiliate: "Affiliate",
};

const categoryIcon: Record<CtvAccountHistoryCategory, typeof History> = {
  application: CheckCircle2,
  payout: WalletCards,
  withdrawal: CircleDollarSign,
  reward: Medal,
  tier: Medal,
  notification: Bell,
  affiliate: History,
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  return d.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

async function markNotificationsRead(ids: string[]): Promise<void> {
  if (!ids.length) return;
  await fetch("/api/account/notifications/mark-read", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  }).catch(() => {});
}

export function CtvAccountHistoryPanel(): JSX.Element {
  const [items, setItems] = useState<CtvAccountHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [markingRead, setMarkingRead] = useState(false);

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setError("");

    void (async () => {
      try {
        const res = await fetch("/api/account/affiliate/history?take=80", {
          credentials: "same-origin",
          cache: "no-store",
          headers: { Accept: "application/json" },
          signal: ac.signal,
        });
        const payload = (await res.json()) as HistoryResponse;
        if (!res.ok || !payload.ok) {
          throw new Error(payload.message || "Không tải được lịch sử CTV.");
        }
        const nextItems = Array.isArray(payload.items) ? payload.items : [];
        setItems(nextItems);

        const unreadIds = Array.isArray(payload.unreadNotificationIds)
          ? payload.unreadNotificationIds.filter((id): id is string => typeof id === "string" && id.trim().length > 0)
          : [];
        if (unreadIds.length) {
          setMarkingRead(true);
          await markNotificationsRead(unreadIds);
          if (!ac.signal.aborted) {
            setItems((prev) =>
              prev.map((item) =>
                item.notificationId && unreadIds.includes(item.notificationId) ? { ...item, read: true } : item,
              ),
            );
          }
        }
      } catch (e) {
        if (!ac.signal.aborted) {
          setError(e instanceof Error ? e.message : "Không tải được lịch sử CTV.");
        }
      } finally {
        if (!ac.signal.aborted) {
          setLoading(false);
          setMarkingRead(false);
        }
      }
    })();

    return () => ac.abort();
  }, []);

  const unreadCount = useMemo(() => items.filter((item) => !item.read).length, [items]);

  if (loading) {
    return (
      <div className={`${CTV_V2_PANEL_INSET} flex items-center gap-2 text-sm text-slate-600`}>
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Đang tải lịch sử CTV...
      </div>
    );
  }

  if (error) {
    return (
      <CtvDataError
        title="Không tải được lịch sử"
        description={error}
        action={
          <button type="button" className={CTV_CTA_SECONDARY} onClick={() => window.location.reload()}>
            Tải lại
          </button>
        }
      />
    );
  }

  if (!items.length) {
    return (
      <CtvDataEmpty
        title="Chưa có lịch sử CTV"
        description="Các hoạt động như đăng ký, duyệt tài khoản nhận tiền, rút tiền, thưởng doanh thu và thông báo CTV sẽ xuất hiện tại đây."
      />
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">Lịch sử hoạt động CTV</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Tổng hợp hoạt động tài khoản, thông báo CTV/Affiliate và các thay đổi liên quan đến rút tiền, hoa hồng,
            thưởng doanh thu.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
          <Clock3 className="h-3.5 w-3.5" aria-hidden />
          {markingRead ? "Đang đồng bộ đã đọc" : unreadCount > 0 ? `${unreadCount} chưa đọc` : "Đã đọc"}
        </span>
      </div>

      <ol className="relative space-y-3 before:absolute before:left-[1.0625rem] before:top-2 before:h-[calc(100%-1rem)] before:w-px before:bg-slate-200">
        {items.map((item) => {
          const Icon = categoryIcon[item.category] ?? History;
          return (
            <li key={item.id} className="relative flex gap-3">
              <span className="z-[1] mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-slate-600 ring-1 ring-slate-200">
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <article className="min-w-0 flex-1 rounded-2xl bg-white p-3 ring-1 ring-slate-200/80">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-semibold text-slate-900">{item.title}</h4>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                        {categoryLabel[item.category] ?? "CTV"}
                      </span>
                      {!item.read ? (
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                          Mới
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs leading-5 text-slate-600 whitespace-pre-line">{item.body}</p>
                  </div>
                  <time dateTime={item.createdAt} className="shrink-0 text-[11px] font-medium text-slate-400">
                    {formatTime(item.createdAt)}
                  </time>
                </div>
              </article>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export default CtvAccountHistoryPanel;
