"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useDocumentVisibility } from "@/hooks/use-document-visibility";
import { adminCardBody, adminCardTitle, adminContentShell, adminInput, adminMetaText, adminMetricNumber, adminOpsButton, adminPageSubtitle, adminPageTitle, adminSecondaryButton, adminStatCard, adminTableShell } from "@/lib/admin-ui";
import { adminSystemOperationsRefreshMs } from "@/lib/next-dev-stability";
import { AdminEmptyState } from "./admin-empty-state";
import { AdminOperationsErrorBoundary } from "./admin-operations-error-boundary";

type HealthResponse = {
  ok: true;
  db: { ok: boolean; pingMs: number };
  affiliate: {
    latestTrafficEventAt: string | null;
    latestDailyAggregateAt: string | null;
    realtimeSessionsActive5m: number;
    hourlyAggregateRows: number;
    dailyAggregateRows: number;
    jobHint: string;
  };
  queue: {
    pending: number;
    delayed: number;
    running: number;
    failed: number;
    completed: number;
    queueLagMs: number;
    recentSlowJobMs: number | null;
  };
  aggregationLagMs: number | null;
  realtimeHealthy: boolean;
  alerts: Array<{ id: string; severity: string; reason: string; source: string; at: string }>;
};

type JobsResponse = {
  ok: true;
  stats: HealthResponse["queue"];
  jobs: Array<{
    id: string;
    kind: string;
    status: string;
    attempts: number;
    maxAttempts: number;
    runAt: string;
    createdAt: string;
    lastError: string | null;
    dedupeKey: string | null;
  }>;
};

type CacheResponse = {
  ok: true;
  footprint: {
    affiliateOverviewEntries: number;
    trafficAnalyticsEntries: number;
    adminOverviewEntries: number;
    realtimeMetricsEntries: number;
  };
};

type InfraResponse = {
  ok: true;
  bullMqEnabled: boolean;
  bullCounts: {
    waiting: number;
    active: number;
    delayed: number;
    failed: number;
    completed: number;
    paused: number;
  } | null;
  queueStats: HealthResponse["queue"];
  observability: {
    redisConfigured: boolean;
    redisPing: { ok: boolean; ms: number; error?: string } | null;
    sharedCacheMemoryEntries: number;
    cacheHitMiss: { hit: number; miss: number };
    cacheLayers?: {
      redis: number;
      memory: number;
      memoryFallback: number;
      miss: number;
      memoryTotal?: number;
    };
    cacheHitRatio?: number | null;
    topCacheLabels?: Array<{ label: string; hits: number }>;
    slowRequestBuckets: Array<{ route: string; count: number; avgMs: number; maxMs: number }>;
  };
  audit: Array<{ at: string; adminId: string; action: string; meta?: Record<string, unknown> }>;
  envChecks: Array<{ severity: string; code: string; message: string }>;
};

export default function AdminSystemOperationsClient(props: { canMutate: boolean }): JSX.Element {
  const visible = useDocumentVisibility();
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [jobs, setJobs] = useState<JobsResponse | null>(null);
  const [cache, setCache] = useState<CacheResponse | null>(null);
  const [infra, setInfra] = useState<InfraResponse | null>(null);
  const [load, setLoad] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [modal, setModal] = useState<{
    title: string;
    body: string;
    confirmPhrase: string;
    onConfirm: () => Promise<void>;
  } | null>(null);
  const [confirmInput, setConfirmInput] = useState("");
  const [purgeDays, setPurgeDays] = useState(180);

  const loadAll = useCallback(async () => {
    setErr(null);
    try {
      const [h, j, c, i] = await Promise.all([
        fetch("/api/admin/system/health", { credentials: "same-origin", cache: "no-store" }).then((r) => r.json()),
        fetch("/api/admin/system/jobs", { credentials: "same-origin", cache: "no-store" }).then((r) => r.json()),
        fetch("/api/admin/system/cache", { credentials: "same-origin", cache: "no-store" }).then((r) => r.json()),
        fetch("/api/admin/system/affiliate-infra", { credentials: "same-origin", cache: "no-store" }).then((r) => r.json()),
      ]);
      if (!h?.ok) throw new Error(h?.message || "Health lỗi");
      if (!j?.ok) throw new Error(j?.message || "Jobs lỗi");
      if (!c?.ok) throw new Error(c?.message || "Cache lỗi");
      setHealth(h as HealthResponse);
      setJobs(j as JobsResponse);
      setCache(c as CacheResponse);
      setInfra(i?.ok ? (i as InfraResponse) : null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Không tải được.");
    } finally {
      setLoad(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!visible) return;
    const ms = adminSystemOperationsRefreshMs();
    const id = window.setInterval(() => void loadAll(), ms);
    return () => window.clearInterval(id);
  }, [visible, loadAll]);

  const postAction = useCallback(async (body: Record<string, unknown>) => {
    setActionBusy(String(body.action));
    try {
      const res = await fetch("/api/admin/system/actions", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || j.ok === false) throw new Error(j.message || "Thao tác thất bại.");
      await loadAll();
    } finally {
      setActionBusy(null);
      setModal(null);
      setConfirmInput("");
    }
  }, [loadAll]);

  const openConfirm = useCallback(
    (title: string, body: string, confirmPhrase: string, onConfirm: () => Promise<void>) => {
      setConfirmInput("");
      setModal({ title, body, confirmPhrase, onConfirm });
    },
    [],
  );

  const fmtLag = useMemo(() => {
    return (ms: number | null) => {
      if (ms == null) return "—";
      if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
      return `${Math.round(ms / 60000)} phút`;
    };
  }, []);

  return (
    <AdminOperationsErrorBoundary>
    <div className="w-full bg-slate-50 py-4 xl:py-6">
      <div className={adminContentShell}>
      <header className="mb-6 flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between xl:gap-4">
        <div className="min-w-0 space-y-1">
          <h1 className={adminPageTitle}>Vận hành hệ thống</h1>
          <p className={adminPageSubtitle}>
            Redis, BullMQ (tùy cấu hình), cron aggregate, health, cache &amp; observability affiliate/analytics.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadAll()}
          disabled={load}
          className={`${adminSecondaryButton} h-11 shrink-0 rounded-2xl px-5 shadow-sm`}
        >
          {load ? "Đang tải…" : "Làm mới"}
        </button>
      </header>

      {err ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{err}</p>
      ) : null}

      {health ? (
        <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <article className={adminStatCard}>
            <p className={`${adminMetaText} font-semibold uppercase tracking-wide`}>DB ping</p>
            <p className={`mt-1 ${adminMetricNumber}`}>{health.db.ok ? `${health.db.pingMs} ms` : "Lỗi"}</p>
          </article>
          <article className={adminStatCard}>
            <p className={`${adminMetaText} font-semibold uppercase tracking-wide`}>Aggregation lag</p>
            <p className={`mt-1 ${adminMetricNumber}`}>{fmtLag(health.aggregationLagMs)}</p>
          </article>
          <article className={adminStatCard}>
            <p className={`${adminMetaText} font-semibold uppercase tracking-wide`}>Realtime 5m</p>
            <p className={`mt-1 ${adminMetricNumber}`}>{health.affiliate.realtimeSessionsActive5m}</p>
          </article>
          <article className={adminStatCard}>
            <p className={`${adminMetaText} font-semibold uppercase tracking-wide`}>Queue pending</p>
            <p className={`mt-1 ${adminMetricNumber}`}>{health.queue.pending + health.queue.delayed}</p>
          </article>
        </section>
      ) : null}

      {health?.alerts?.length ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50/80 p-3">
          <h2 className="text-sm font-bold text-amber-950">Cảnh báo</h2>
          <ul className="mt-2 space-y-1.5 text-sm text-amber-950">
            {health.alerts.slice(0, 12).map((a) => (
              <li key={a.id} className="flex flex-wrap gap-2">
                <span className="font-semibold uppercase text-[11px] text-amber-800">{a.severity}</span>
                <span>{a.reason}</span>
                <span className="text-xs text-amber-700/90">{new Date(a.at).toLocaleString("vi-VN")}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {jobs ? (
        <section className={adminCardBody}>
          <h2 className={adminCardTitle}>Hàng đợi job</h2>
          <p className="mt-1 text-xs text-slate-500">
            pending {jobs.stats.pending} · delayed {jobs.stats.delayed} · running {jobs.stats.running} · failed {jobs.stats.failed} · completed{" "}
            {jobs.stats.completed}
          </p>
          <div className={`${adminTableShell} mt-3`}>
            <table className="w-full min-w-[700px] text-left text-xs">
              <thead className="sticky top-0 z-[1] border-b border-slate-100 bg-slate-50 text-[10px] uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Kind</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Att</th>
                  <th className="px-3 py-2">Run at</th>
                  <th className="px-3 py-2">Error</th>
                </tr>
              </thead>
              <tbody>
                {!jobs.jobs.length ? (
                  <tr>
                    <td colSpan={5} className="p-0 align-top">
                      <AdminEmptyState
                        className="min-h-[200px] rounded-none border-0 bg-transparent"
                        title="Không có job trong danh sách"
                        description="Các job pending / delayed sẽ hiển thị tại đây."
                      />
                    </td>
                  </tr>
                ) : null}
                {jobs.jobs.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100">
                    <td className="py-1.5 pr-2 font-mono text-[11px]">{r.kind}</td>
                    <td className="py-1.5 pr-2">{r.status}</td>
                    <td className="py-1.5 pr-2 tabular-nums">
                      {r.attempts}/{r.maxAttempts}
                    </td>
                    <td className="py-1.5 pr-2 whitespace-nowrap text-[11px] text-slate-600">{r.runAt.slice(0, 19)}</td>
                    <td className="max-w-[200px] truncate py-1.5 text-rose-700">{r.lastError ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {infra ? (
        <section className={adminCardBody}>
          <h2 className={adminCardTitle}>Infra affiliate (nhẹ)</h2>
          <div className="mt-2 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg bg-slate-50 px-2 py-1.5">
              BullMQ{" "}
              <span className="font-bold">{infra.bullMqEnabled ? "bật" : "tắt"}</span>
            </div>
            <div className="rounded-lg bg-slate-50 px-2 py-1.5">
              Redis ping{" "}
              <span className="font-bold">
                {infra.observability.redisPing?.ok ? `${infra.observability.redisPing.ms} ms` : "—"}
              </span>
            </div>
            <div className="rounded-lg bg-slate-50 px-2 py-1.5">
              Shared cache L2{" "}
              <span className="font-bold tabular-nums">{infra.observability.sharedCacheMemoryEntries}</span>
            </div>
            <div className="rounded-lg bg-slate-50 px-2 py-1.5">
              Hit ratio{" "}
              <span className="font-bold tabular-nums">
                {infra.observability.cacheHitRatio != null
                  ? `${Math.round(infra.observability.cacheHitRatio * 100)}%`
                  : "—"}
              </span>
            </div>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Cache tổng hit/miss:{" "}
            <span className="font-semibold tabular-nums text-slate-900">
              {infra.observability.cacheHitMiss.hit}/{infra.observability.cacheHitMiss.miss}
            </span>
            {infra.observability.cacheLayers ? (
              <>
                {" "}
                · Redis {infra.observability.cacheLayers.redis} · Mem {infra.observability.cacheLayers.memory}
                {infra.observability.cacheLayers.memoryFallback ? (
                  <> · fallback {infra.observability.cacheLayers.memoryFallback}</>
                ) : null}
                · Miss {infra.observability.cacheLayers.miss}
              </>
            ) : null}
            {" · "}
            Queue lag (heuristic) <span className="font-semibold tabular-nums">{infra.queueStats.queueLagMs} ms</span>
          </p>
          {infra.observability.topCacheLabels?.length ? (
            <p className="mt-1 text-[11px] text-slate-600">
              Top labels:{" "}
              {infra.observability.topCacheLabels.slice(0, 6).map((t) => (
                <span key={t.label} className="mr-2 inline-block rounded bg-slate-100 px-1 font-mono text-[10px]">
                  {t.label} ({t.hits})
                </span>
              ))}
            </p>
          ) : null}
          {infra.bullCounts ? (
            <p className="mt-2 text-[11px] text-slate-500">
              Bull: waiting {infra.bullCounts.waiting} · active {infra.bullCounts.active} · delayed {infra.bullCounts.delayed} · failed{" "}
              {infra.bullCounts.failed}
            </p>
          ) : null}
          {infra.envChecks?.length ? (
            <ul className="mt-2 space-y-1 text-[11px] text-slate-700">
              {infra.envChecks.map((ec) => (
                <li key={ec.code}>
                  <span className="font-semibold uppercase text-slate-500">{ec.severity}</span> {ec.message}
                </li>
              ))}
            </ul>
          ) : null}
          {infra.audit?.length ? (
            <div className="mt-3 overflow-x-auto">
              <p className="text-[10px] font-semibold uppercase text-slate-500">Audit gần đây</p>
              <table className="mt-1 w-full min-w-[700px] text-left text-[10px]">
                <thead className="text-[9px] uppercase text-slate-500">
                  <tr>
                    <th className="py-0.5 pr-2">Thời điểm</th>
                    <th className="py-0.5 pr-2">Admin</th>
                    <th className="py-0.5">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {infra.audit.slice(0, 12).map((a) => (
                    <tr key={`${a.at}-${a.action}-${a.adminId}`} className="border-t border-slate-100">
                      <td className="py-1 pr-2 whitespace-nowrap text-slate-600">{a.at.slice(0, 19)}</td>
                      <td className="max-w-[100px] truncate py-1 pr-2 font-mono">{a.adminId.slice(0, 8)}…</td>
                      <td className="py-1 font-medium">{a.action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      ) : null}

      {cache ? (
        <section className={adminCardBody}>
          <h2 className={adminCardTitle}>Cache (entries)</h2>
          <ul className="mt-2 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            <li className="rounded-lg bg-slate-50 px-2 py-1.5">
              CTV overview <span className="font-bold tabular-nums">{cache.footprint.affiliateOverviewEntries}</span>
            </li>
            <li className="rounded-lg bg-slate-50 px-2 py-1.5">
              Traffic SQL <span className="font-bold tabular-nums">{cache.footprint.trafficAnalyticsEntries}</span>
            </li>
            <li className="rounded-lg bg-slate-50 px-2 py-1.5">
              Admin overview <span className="font-bold tabular-nums">{cache.footprint.adminOverviewEntries}</span>
            </li>
            <li className="rounded-lg bg-slate-50 px-2 py-1.5">
              Realtime <span className="font-bold tabular-nums">{cache.footprint.realtimeMetricsEntries}</span>
            </li>
          </ul>
        </section>
      ) : null}

      {health ? (
        <p className="text-xs text-slate-500">
          Cron gợi ý: <span className="font-mono text-slate-900">{health.affiliate.jobHint}</span>
        </p>
      ) : null}

      {props.canMutate ? (
        <section className={adminCardBody}>
          <h2 className={adminCardTitle}>Thao tác</h2>
          <p className="mt-1 text-xs text-slate-500">Mỗi thao tác cần gõ đúng cụm xác nhận. Thực thi nền (202), không chặn request lâu.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={Boolean(actionBusy)}
              onClick={() =>
                openConfirm(
                  "Xóa cache analytics",
                  "Xóa cache overview/traffic/admin/realtime trong bộ nhớ process.",
                  "CLEAR_ANALYTICS_CACHES",
                  () => postAction({ action: "clear_caches", confirm: "CLEAR_ANALYTICS_CACHES" }),
                )
              }
              className={`${adminOpsButton} border-slate-200 bg-slate-50 text-slate-900 hover:bg-slate-100`}
            >
              Xóa cache
            </button>
            <button
              type="button"
              disabled={Boolean(actionBusy)}
              onClick={() =>
                openConfirm(
                  "Rebuild aggregate",
                  "Enqueue hourly + daily aggregate (mặc định 52h / 120 ngày), sau đó drain queue.",
                  "REBUILD_AGGREGATES",
                  () => postAction({ action: "rebuild_aggregates", confirm: "REBUILD_AGGREGATES", hours: 52, days: 120 }),
                )
              }
              className={`${adminOpsButton} border-sky-200 bg-sky-50 text-sky-950 hover:bg-sky-100`}
            >
              Rebuild aggregate
            </button>
            <button
              type="button"
              disabled={Boolean(actionBusy)}
              onClick={() =>
                openConfirm(
                  "Cleanup realtime",
                  "Xóa session realtime cũ hơn 3 giờ (cấu hình trong job).",
                  "CLEANUP_REALTIME",
                  () => postAction({ action: "cleanup_realtime", confirm: "CLEANUP_REALTIME", staleHours: 3 }),
                )
              }
              className={`${adminOpsButton} border-emerald-200 bg-emerald-50 text-emerald-950 hover:bg-emerald-100`}
            >
              Cleanup realtime
            </button>
            <button
              type="button"
              disabled={Boolean(actionBusy)}
              onClick={() =>
                openConfirm(
                  "Cleanup orphan events",
                  "Xóa traffic events không còn affiliate profile.",
                  "CLEANUP_ORPHAN_EVENTS",
                  () => postAction({ action: "cleanup_orphan_events", confirm: "CLEANUP_ORPHAN_EVENTS" }),
                )
              }
              className={`${adminOpsButton} border-emerald-200 bg-emerald-50 text-emerald-950 hover:bg-emerald-100`}
            >
              Orphan events
            </button>
            <button
              type="button"
              disabled={Boolean(actionBusy)}
              onClick={() =>
                openConfirm("Drain queue", "Chạy tối đa 40 bước xử lý job đang pending.", "DRAIN_JOB_QUEUE", () =>
                  postAction({ action: "drain_job_queue", confirm: "DRAIN_JOB_QUEUE", maxSteps: 40 }),
                )
              }
              className={`${adminOpsButton} border-slate-200 bg-white text-slate-900 hover:bg-slate-50`}
            >
              Drain queue
            </button>
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-xs text-slate-500">
                Retention purge (ngày)
                <input
                  type="number"
                  min={30}
                  max={730}
                  value={purgeDays}
                  onChange={(e) => setPurgeDays(Number(e.target.value))}
                  className="ml-1 w-20 rounded border border-slate-200 px-1 py-0.5 font-mono text-xs"
                />
              </label>
              <button
                type="button"
                disabled={Boolean(actionBusy)}
                onClick={() =>
                  openConfirm(
                    "Purge raw events",
                    `Cần biến môi trường AFFILIATE_PURGE_RAW_EVENTS=1. Xóa theo lô events cũ hơn ${purgeDays} ngày (nguy hiểm).`,
                    "PURGE_RAW_EVENTS",
                    () => postAction({ action: "purge_raw_events", confirm: "PURGE_RAW_EVENTS", retentionDays: purgeDays }),
                  )
                }
                className={`${adminOpsButton} border-rose-300 bg-rose-50 text-rose-900 hover:bg-rose-100`}
              >
                Purge raw (nguy hiểm)
              </button>
            </div>
          </div>
        </section>
      ) : (
        <p className="text-sm text-slate-500">Bạn chỉ xem được health — không có quyền thao tác vận hành.</p>
      )}

      {modal ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center" role="dialog">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-4 shadow-xl">
            <h3 className="text-base font-bold tracking-tight text-slate-900">{modal.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">{modal.body}</p>
            <p className="mt-3 text-xs font-medium text-slate-900">
              Gõ chính xác: <span className="rounded bg-slate-100 px-1 font-mono">{modal.confirmPhrase}</span>
            </p>
            <input
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              className={`mt-2 ${adminInput}`}
              autoComplete="off"
            />
            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                className={`${adminOpsButton} border-slate-200 bg-white px-4 text-sm text-slate-800 hover:bg-slate-50`}
                onClick={() => {
                  setModal(null);
                  setConfirmInput("");
                }}
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={confirmInput !== modal.confirmPhrase || Boolean(actionBusy)}
                className={`${adminOpsButton} border-transparent bg-sky-600 px-4 text-sm text-white shadow-sm hover:bg-sky-700 disabled:opacity-40`}
                onClick={() => void modal.onConfirm()}
              >
                {actionBusy ? "Đang gửi…" : "Xác nhận"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      </div>
    </div>
    </AdminOperationsErrorBoundary>
  );
}
