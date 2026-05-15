"use client";

import { useCallback, useEffect, useState } from "react";

import { AdminEmptyState } from "@/components/admin/admin-empty-state";
import { adminCardBody, adminContentShell, adminPageHeader, adminPageSubtitle, adminPageTitle, adminTableShell } from "@/lib/admin-ui";

type CaseRow = {
  id: string;
  affiliateProfileId: string;
  title: string;
  status: string;
  tier: string;
  openedAt: string;
  signalCount: number;
};

export default function AdminAffiliateFraudDashboard(): JSX.Element {
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailJson, setDetailJson] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/affiliate-fraud/cases", { credentials: "same-origin", cache: "no-store" });
      const j = (await res.json()) as { ok?: boolean; cases?: CaseRow[]; message?: string };
      if (!res.ok || j.ok !== true || !j.cases) throw new Error(j.message ?? "load");
      setCases(j.cases);
    } catch {
      setErr("Không tải được danh sách.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openDetail = async (id: string) => {
    setDetailId(id);
    setDetailJson(null);
    try {
      const res = await fetch(`/api/admin/affiliate-fraud/cases/${id}`, { credentials: "same-origin", cache: "no-store" });
      const j = (await res.json()) as { ok?: boolean; case?: unknown };
      if (!res.ok || j.ok !== true) throw new Error("detail");
      setDetailJson(JSON.stringify(j.case, null, 2));
    } catch {
      setDetailJson('{"error":"detail_failed"}');
    }
  };

  const patchCase = async (id: string, status: "UNDER_REVIEW" | "RESOLVED" | "DISMISSED") => {
    const res = await fetch(`/api/admin/affiliate-fraud/cases/${id}`, {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, note: "admin_dashboard" }),
    });
    if (res.ok) {
      setDetailId(null);
      setDetailJson(null);
      void load();
    }
  };

  return (
    <div className="w-full bg-slate-50 py-6">
      <div
        className={`${adminContentShell} min-h-[min(100%,calc(100dvh-var(--admin-mobile-header-estimate)-2rem))] xl:min-h-0`}
      >
      <header className={adminPageHeader}>
        <h1 className={adminPageTitle}>Fraud &amp; abuse</h1>
        <p className={adminPageSubtitle}>
          Case tự động từ engine lite (rolling Redis + replay CAPI). Không xóa dữ liệu — chỉ điều tra / đóng case.
        </p>
      </header>

      {loading ? <p className="text-sm text-slate-500">Đang tải…</p> : null}
      {err ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{err}</p> : null}

      <div className={`${adminTableShell} min-h-[min(320px,calc(100dvh-var(--admin-mobile-header-estimate)-14rem))]`}>
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="sticky top-0 z-[1] border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Mở</th>
              <th className="px-4 py-3">Tier</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3">CTV</th>
              <th className="px-4 py-3">Tiêu đề</th>
              <th className="px-4 py-3">Signals</th>
              <th className="px-4 py-3">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-500">
                  Đang tải danh sách…
                </td>
              </tr>
            ) : null}
            {!loading && !cases.length ? (
              <tr>
                <td colSpan={7} className="p-0 align-top">
                  <AdminEmptyState
                    className="min-h-[280px] rounded-none border-0 bg-transparent"
                    title="Chưa có case fraud"
                    description="Khi engine phát hiện tín hiệu bất thường, danh sách case sẽ hiển thị tại đây."
                    icon={
                      <svg viewBox="0 0 24 24" fill="none" aria-hidden>
                        <path
                          d="M9 12h6m-6 4h3M12 3l9 4.5v4.5c0 5.25-3.75 9.75-9 10.5-5.25-.75-9-5.25-9-10.5V7.5L12 3Z"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinejoin="round"
                        />
                      </svg>
                    }
                  />
                </td>
              </tr>
            ) : null}
            {cases.map((c) => (
              <tr key={c.id} className="bg-white hover:bg-slate-50/80">
                <td className="whitespace-nowrap px-4 py-2.5 text-xs text-slate-600">
                  {new Date(c.openedAt).toLocaleString("vi-VN")}
                </td>
                <td className="px-4 py-2.5 font-medium text-slate-900">{c.tier}</td>
                <td className="px-4 py-2.5 text-slate-800">{c.status}</td>
                <td className="max-w-[10rem] truncate px-4 py-2.5 font-mono text-xs">{c.affiliateProfileId}</td>
                <td className="max-w-[14rem] truncate px-4 py-2.5 text-slate-800">{c.title}</td>
                <td className="px-4 py-2.5 tabular-nums text-slate-900">{c.signalCount}</td>
                <td className="space-x-1 whitespace-nowrap px-4 py-2.5">
                  <button
                    type="button"
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    onClick={() => void openDetail(c.id)}
                  >
                    Chi tiết
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-900 hover:bg-emerald-100"
                    onClick={() => void patchCase(c.id, "RESOLVED")}
                  >
                    Resolve
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                    onClick={() => void patchCase(c.id, "DISMISSED")}
                  >
                    Dismiss
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {detailId && detailJson ? (
        <div className={`${adminCardBody} max-h-[min(480px,50vh)] overflow-hidden`}>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
            <p className="text-sm font-semibold text-slate-900">Case {detailId}</p>
            <button type="button" className="text-xs font-medium text-sky-700 hover:underline" onClick={() => setDetailId(null)}>
              Đóng
            </button>
          </div>
          <pre className="max-h-[min(28rem,40vh)] overflow-auto whitespace-pre-wrap break-all font-mono text-[11px] text-slate-800">
            {detailJson}
          </pre>
        </div>
      ) : null}
      </div>
    </div>
  );
}
