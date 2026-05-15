"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { adminCardBody, adminCardTitle, adminContentShell, adminInput, adminMetaText, adminMetricNumber, adminPageSubtitle, adminPageTitle, adminSelect, adminStatCard } from "@/lib/admin-ui";
import AdminAffiliateAnalyticsChartLazy from "./admin-affiliate-analytics-chart-lazy";
import {
  useAdminAffiliateChart,
  useAdminAffiliateFraud,
  useAdminAffiliateHealth,
  useAdminAffiliateOverview,
  useAdminAffiliateRealtime,
  useAdminAffiliateTopAffiliates,
  type AdminRangeKey,
} from "./admin-affiliate-analytics-hooks";

function fmtVnd(n: number): string {
  return `${new Intl.NumberFormat("vi-VN").format(Math.round(n))}đ`;
}

function fmtPct(n: number): string {
  if (!Number.isFinite(n)) return "0%";
  return `${(n * 100).toFixed(n < 0.1 ? 1 : 2)}%`;
}

function AnimatedInt({ value }: { value: number }): JSX.Element {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  useEffect(() => {
    const from = fromRef.current;
    const start = performance.now();
    const dur = 420;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - (1 - t) ** 2;
      setDisplay(Math.round(from + (value - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span className="tabular-nums">{display.toLocaleString("vi-VN")}</span>;
}

function Skeleton({ className }: { className: string }): JSX.Element {
  return <div className={`animate-pulse rounded-xl bg-slate-100 ${className}`} />;
}

function MetricCard(props: {
  label: string;
  value: ReactNode;
  pulse?: boolean;
  loading?: boolean;
  /** Dùng typography nhỏ hơn cho giá trị dài (vd. top campaign). */
  compactValue?: boolean;
}): JSX.Element {
  return (
    <article className={adminStatCard}>
      <div className="flex items-center justify-between gap-1">
        <p className={`${adminMetaText} font-semibold uppercase tracking-wide`}>{props.label}</p>
        {props.pulse ? (
          <span className="inline-flex h-2 w-2 shrink-0 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.35)]" title="Realtime" />
        ) : null}
      </div>
      {props.loading ? (
        <Skeleton className="mt-2 h-11 w-32" />
      ) : props.compactValue ? (
        <p className="mt-1 line-clamp-2 text-sm font-semibold leading-snug text-slate-900">{props.value}</p>
      ) : (
        <p className={`mt-1 ${adminMetricNumber}`}>{props.value}</p>
      )}
    </article>
  );
}

function severityClass(s: string): string {
  if (s === "high") return "bg-rose-100 text-rose-800 ring-rose-200";
  if (s === "medium") return "bg-amber-100 text-amber-900 ring-amber-200";
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

const TopAffiliateRow = memo(function TopAffiliateRow(props: {
  row: {
    affiliateProfileId: string;
    refCode: string;
    displayName: string | null;
    status: string;
    clicks: number;
    paidOrders: number;
    revenue: number;
    commission: number;
    conversionRate: number;
    EPC: number;
    RPM: number;
    online: boolean;
  };
  onOpen: (id: string) => void;
}): JSX.Element {
  const { row, onOpen } = props;
  return (
    <tr
      role="link"
      tabIndex={0}
      className="cursor-pointer border-t border-slate-200 hover:bg-sky-50/60"
      onClick={() => onOpen(row.affiliateProfileId)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(row.affiliateProfileId);
        }
      }}
    >
      <td className="py-2 pr-2 align-top">
        <span className="font-semibold text-slate-900">{row.displayName || row.refCode}</span>
        <p className="text-[11px] text-slate-500">{row.refCode}</p>
      </td>
      <td className="py-2 pr-2 align-top text-sm tabular-nums">{row.clicks.toLocaleString("vi-VN")}</td>
      <td className="py-2 pr-2 align-top text-sm tabular-nums text-emerald-800">{fmtPct(row.conversionRate)}</td>
      <td className="py-2 pr-2 align-top text-sm tabular-nums">{fmtVnd(row.revenue)}</td>
      <td className="py-2 pr-2 align-top text-sm tabular-nums text-emerald-800">{fmtVnd(row.commission)}</td>
      <td className="py-2 pr-2 align-top text-sm tabular-nums">{row.paidOrders}</td>
      <td className="py-2 pr-2 align-top text-sm tabular-nums">{fmtVnd(row.EPC)}</td>
      <td className="py-2 pr-2 align-top text-sm tabular-nums">{fmtVnd(row.RPM)}</td>
      <td className="py-2 pr-2 align-top text-xs font-medium text-slate-800">{row.status}</td>
      <td className="py-2 align-top text-xs font-semibold">
        <span className={row.online ? "text-emerald-700" : "text-slate-500"}>{row.online ? "Online" : "Offline"}</span>
      </td>
    </tr>
  );
});

export default function AdminAffiliateAnalyticsDashboard(): JSX.Element {
  const router = useRouter();
  const [range, setRange] = useState<AdminRangeKey>("7d");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState("clicks");
  const [dir, setDir] = useState<"asc" | "desc">("desc");
  const [status, setStatus] = useState("ALL");
  const [online, setOnline] = useState("ALL");
  const [qInput, setQInput] = useState("");
  const [qDebounced, setQDebounced] = useState("");
  const [fraudSeverity, setFraudSeverity] = useState("ALL");
  const [fraudQ, setFraudQ] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [exportAffiliateId, setExportAffiliateId] = useState("");

  const exportAffiliateQs = useMemo(() => {
    const t = exportAffiliateId.trim();
    return t.length >= 16 ? `&affiliateId=${encodeURIComponent(t.slice(0, 40))}` : "";
  }, [exportAffiliateId]);

  useEffect(() => {
    const t = window.setTimeout(() => setQDebounced(qInput.trim()), 320);
    return () => window.clearTimeout(t);
  }, [qInput]);

  const overview = useAdminAffiliateOverview({ range, enabled: true });
  const realtime = useAdminAffiliateRealtime({ enabled: true, affiliateId: null });
  const chart = useAdminAffiliateChart({ range, enabled: true });
  const top = useAdminAffiliateTopAffiliates({
    range,
    page,
    pageSize: 20,
    sort,
    dir,
    q: qDebounced,
    status,
    online,
    enabled: true,
  });
  const fraud = useAdminAffiliateFraud({ range, severity: fraudSeverity, q: fraudQ, enabled: true });
  const health = useAdminAffiliateHealth({ enabled: true });

  const ov = overview.data?.overview as
    | {
        totalClicks: number;
        uniqueVisitors: number;
        totalOrders: number;
        paidOrders: number;
        totalRevenue: number;
        totalCommission: number;
        activeAffiliates: number;
        onlineAffiliates: number;
        conversionRate: number;
        RPM: number;
        EPC: number;
        topCampaign: { label: string; clicks: number } | null;
      }
    | null;

  const campaigns = overview.data?.campaigns;

  const buckets = useMemo(() => chart.data?.buckets ?? [], [chart.data?.buckets]);

  const openAffiliate = useCallback((id: string) => router.push(`/admin/affiliate-analytics/${id}`), [router]);

  const totalPages = Math.max(1, Math.ceil((top.data?.total ?? 0) / 20));

  return (
    <div className="w-full bg-slate-50 py-4 xl:py-6">
      <div className={adminContentShell}>
      <header className="mb-6 flex flex-col gap-3 xl:mb-6 xl:flex-row xl:items-start xl:justify-between xl:gap-4">
        <div className="min-w-0 space-y-1">
          <h1 className={adminPageTitle}>Affiliate Analytics</h1>
          <p className={adminPageSubtitle}>Tổng hợp hệ thống CTV — realtime nhẹ, tối ưu aggregate.</p>
        </div>
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-stretch xl:items-center">
          <select
            value={range}
            onChange={(e) => {
              setRange(e.target.value as AdminRangeKey);
              setPage(1);
            }}
            className={adminSelect}
            aria-label="Khoảng thời gian"
          >
            <option value="today">Hôm nay</option>
            <option value="7d">7 ngày</option>
            <option value="30d">30 ngày</option>
            <option value="month">Tháng này</option>
          </select>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
              realtime.loading ? "bg-slate-100 text-slate-600" : "bg-emerald-100 text-emerald-800"
            }`}
          >
            {realtime.loading ? "Realtime…" : "Realtime"}
          </span>
          <div className="hidden items-center gap-1 sm:flex">
            <a
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-sky-600 hover:bg-sky-50"
              href={`/api/admin/affiliate-analytics/export?type=affiliates&range=${range}&format=csv`}
            >
              CSV CTV
            </a>
            <a
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-sky-600 hover:bg-sky-50"
              href={`/api/admin/affiliate-analytics/export?type=traffic&range=${range}&format=excel`}
            >
              Excel traffic
            </a>
            <a
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-sky-600 hover:bg-sky-50"
              href={`/api/admin/affiliate-analytics/export?type=fraud&range=${range}&format=csv`}
            >
              CSV fraud
            </a>
            <a
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-sky-600 hover:bg-sky-50"
              href={`/api/admin/affiliate-analytics/export?type=top-links&range=${range}&format=csv`}
            >
              Top links
            </a>
            <a
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-sky-600 hover:bg-sky-50"
              href={`/api/admin/affiliate-analytics/export?type=landing&range=${range}&format=excel`}
            >
              Landing
            </a>
            <a
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-sky-600 hover:bg-sky-50"
              href={`/api/admin/affiliate-analytics/export?type=sources&range=${range}&format=csv`}
            >
              Sources
            </a>
            <input
              value={exportAffiliateId}
              onChange={(e) => setExportAffiliateId(e.target.value)}
              placeholder="affiliateId → export SP"
              className="h-9 w-36 rounded-lg border border-slate-200 px-2 font-mono text-[11px]"
              title="Dán affiliateProfileId để xuất top sản phẩm CTV"
            />
            <a
              className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
                exportAffiliateQs
                  ? "border-slate-200 bg-white text-sky-600 hover:bg-sky-50"
                  : "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-400 pointer-events-none"
              }`}
              href={
                exportAffiliateQs
                  ? `/api/admin/affiliate-analytics/export?type=top-products&range=${range}&format=csv${exportAffiliateQs}`
                  : "#"
              }
            >
              SP theo CTV
            </a>
          </div>
          <button
            type="button"
            className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 xl:hidden"
            onClick={() => setSheetOpen(true)}
          >
            Bộ lọc
          </button>
        </div>
      </header>

      <section
        className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 sm:gap-4 sm:p-5 xl:grid-cols-6"
        aria-label="Health monitoring affiliate analytics"
      >
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Event mới nhất</p>
          <p className="mt-1 truncate text-xs font-medium text-slate-900">
            {health.loading ? "…" : health.data?.health.latestTrafficEventAt?.slice(0, 19) ?? "—"}
          </p>
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Aggregate daily</p>
          <p className="mt-1 truncate text-xs font-medium text-slate-900">
            {health.loading ? "…" : health.data?.health.latestDailyAggregateAt?.slice(0, 19) ?? "—"}
          </p>
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Realtime 5m</p>
          <p className="mt-1 text-sm font-bold tabular-nums text-slate-900">
            {health.loading ? "…" : (health.data?.health.realtimeSessionsActive5m ?? 0).toLocaleString("vi-VN")}
          </p>
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Rows hourly</p>
          <p className="mt-1 text-sm font-bold tabular-nums text-slate-900">
            {health.loading ? "…" : (health.data?.health.hourlyAggregateRows ?? 0).toLocaleString("vi-VN")}
          </p>
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Rows daily</p>
          <p className="mt-1 text-sm font-bold tabular-nums text-slate-900">
            {health.loading ? "…" : (health.data?.health.dailyAggregateRows ?? 0).toLocaleString("vi-VN")}
          </p>
        </div>
        <div className="min-w-0 sm:col-span-2 xl:col-span-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Cron</p>
          <p className="mt-1 line-clamp-2 text-[11px] text-slate-600" title={health.data?.health.jobHint}>
            {health.data?.health.jobHint ?? "tsx scripts/aggregate-affiliate-analytics.ts"}
          </p>
        </div>
      </section>

      <div className="sticky top-0 z-20 -mx-1 border-b border-slate-200/80 bg-slate-50/95 px-1 py-2 backdrop-blur xl:static xl:border-0 xl:bg-transparent xl:px-0 xl:py-0">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 xl:grid-cols-6">
          <MetricCard
            label="Tổng click"
            loading={overview.loading}
            pulse
            value={ov ? <AnimatedInt value={ov.totalClicks} /> : "0"}
          />
          <MetricCard
            label="Unique visitors"
            loading={overview.loading}
            value={ov ? <AnimatedInt value={ov.uniqueVisitors} /> : "0"}
          />
          <MetricCard label="Đơn (tất cả)" loading={overview.loading} value={ov ? <AnimatedInt value={ov.totalOrders} /> : "0"} />
          <MetricCard label="Đơn đã trả" loading={overview.loading} value={ov ? <AnimatedInt value={ov.paidOrders} /> : "0"} />
          <MetricCard label="Doanh thu" loading={overview.loading} value={ov ? fmtVnd(ov.totalRevenue) : fmtVnd(0)} />
          <MetricCard label="Commission" loading={overview.loading} value={ov ? fmtVnd(ov.totalCommission) : fmtVnd(0)} />
          <MetricCard label="CTV hoạt động" loading={overview.loading} value={ov ? <AnimatedInt value={ov.activeAffiliates} /> : "0"} />
          <MetricCard label="CTV online" loading={overview.loading} pulse value={ov ? <AnimatedInt value={ov.onlineAffiliates} /> : "0"} />
          <MetricCard label="Conversion" loading={overview.loading} value={ov ? fmtPct(ov.conversionRate) : "0%"} />
          <MetricCard label="RPM" loading={overview.loading} value={ov ? fmtVnd(ov.RPM) : fmtVnd(0)} />
          <MetricCard label="EPC" loading={overview.loading} value={ov ? fmtVnd(ov.EPC) : fmtVnd(0)} />
          <MetricCard
            label="Top campaign (utm)"
            loading={overview.loading}
            compactValue
            value={ov?.topCampaign?.label ?? "—"}
          />
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-5 xl:items-stretch">
        <section className={`${adminCardBody} flex h-full min-h-0 flex-col xl:col-span-3`}>
          <div className="flex items-center justify-between gap-2">
            <h2 className={adminCardTitle}>Traffic hệ thống</h2>
            <span className={`${adminMetaText} font-medium`}>Lazy chart</span>
          </div>
          {chart.loading ? <Skeleton className="mt-3 h-56 w-full md:h-72" /> : <AdminAffiliateAnalyticsChartLazy buckets={buckets} />}
          {chart.error ? (
            <p className="mt-2 text-sm text-rose-600">
              {chart.error}{" "}
              <button type="button" className="font-semibold underline" onClick={chart.refetch}>
                Thử lại
              </button>
            </p>
          ) : null}
        </section>

        <section className={`${adminCardBody} flex h-full min-h-0 flex-col xl:col-span-2`}>
          <h2 className={adminCardTitle}>Realtime panel</h2>
          {realtime.error ? <p className="mt-2 text-sm text-rose-600">{realtime.error}</p> : null}
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            <MetricCard
              label="Click 5 phút"
              pulse
              loading={realtime.loading}
              value={(realtime.data?.realtime?.clicksLast5m ?? 0).toLocaleString("vi-VN")}
            />
            <MetricCard
              label="Chuyển đổi 5 phút"
              pulse
              loading={realtime.loading}
              value={(realtime.data?.realtime?.conversionsLast5m ?? 0).toLocaleString("vi-VN")}
            />
            <MetricCard
              label="Doanh thu 5 phút"
              pulse
              loading={realtime.loading}
              value={fmtVnd(realtime.data?.realtime?.revenueLast5m ?? 0)}
            />
            <MetricCard
              label="CTV online (5m)"
              pulse
              loading={realtime.loading}
              value={(realtime.data?.realtime?.onlineAffiliates ?? 0).toLocaleString("vi-VN")}
            />
          </div>
          <div className="mt-4 max-h-48 overflow-y-auto text-xs">
            <p className={`font-semibold ${adminMetaText}`}>Click gần đây</p>
            <ul className="mt-1 space-y-1">
              {(
                realtime.data?.recentClicks as
                  | Array<{ id: string; pathname: string | null; refCode: string; trafficSource?: string }>
                  | undefined
              )?.map((c) => (
                <li key={c.id} className="flex justify-between gap-2 rounded-lg bg-slate-50 px-2 py-1">
                  <span className="min-w-0 truncate text-slate-900">
                    {c.pathname || "/"}
                    {c.trafficSource ? <span className="ml-1 text-[10px] text-slate-500">({c.trafficSource})</span> : null}
                  </span>
                  <span className="shrink-0 text-slate-500">{c.refCode}</span>
                </li>
              )) ?? null}
            </ul>
          </div>
        </section>
      </div>

      <section className={adminCardBody}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className={adminCardTitle}>Top campaigns & nguồn</h2>
          <Link href="/admin/collaborators" className="text-xs font-semibold text-sky-600 hover:underline">
            Quản lý CTV →
          </Link>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {(["utmSources", "subIds", "landings"] as const).map((key) => (
            <div key={key} className="min-w-0 rounded-xl bg-slate-50/90 p-4 ring-1 ring-slate-100">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                {key === "utmSources" ? "utm_source" : key === "subIds" ? "subId" : "Landing"}
              </p>
              <div className="mt-2 space-y-2 overflow-x-auto">
                {(campaigns?.[key] as Array<{ key: string; clicks: number; conversions: number; revenue: number }> | undefined)
                  ?.slice(0, 6)
                  .map((r) => (
                    <div key={r.key} className="flex min-w-[220px] justify-between gap-2 text-xs">
                      <span className="min-w-0 truncate font-medium text-slate-900">{r.key}</span>
                      <span className="shrink-0 tabular-nums text-slate-500">
                        {r.clicks} clk · {r.conversions} conv · {fmtVnd(r.revenue)}
                      </span>
                    </div>
                  )) ?? <p className="text-xs text-slate-500">Chưa có dữ liệu.</p>}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={`${adminCardBody} hidden xl:block`}>
        <h2 className={adminCardTitle}>Top affiliates</h2>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <input
            value={qInput}
            onChange={(e) => {
              setQInput(e.target.value);
              setPage(1);
            }}
            placeholder="Tìm ref / tên…"
            className={`h-10 min-w-[180px] flex-1 ${adminSelect}`}
          />
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className={`h-10 ${adminSelect} px-2`}
          >
            <option value="ALL">Trạng thái: tất cả</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="PAUSED">PAUSED</option>
            <option value="LOCKED">LOCKED</option>
          </select>
          <select
            value={online}
            onChange={(e) => {
              setOnline(e.target.value);
              setPage(1);
            }}
            className={`h-10 ${adminSelect} px-2`}
          >
            <option value="ALL">Online: tất cả</option>
            <option value="YES">Online</option>
            <option value="NO">Offline</option>
          </select>
          <select
            value={`${sort}:${dir}`}
            onChange={(e) => {
              const [s, d] = e.target.value.split(":");
              setSort(s ?? "clicks");
              setDir(d === "asc" ? "asc" : "desc");
              setPage(1);
            }}
            className={`h-10 ${adminSelect} px-2`}
          >
            <option value="clicks:desc">Sort: Click ↓</option>
            <option value="revenue:desc">Sort: Doanh thu ↓</option>
            <option value="commission:desc">Sort: Commission ↓</option>
            <option value="conversion:desc">Sort: Conv % ↓</option>
            <option value="epc:desc">Sort: EPC ↓</option>
            <option value="rpm:desc">Sort: RPM ↓</option>
          </select>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="py-2 pr-2">CTV</th>
                <th className="py-2 pr-2">Clicks</th>
                <th className="py-2 pr-2">Conv</th>
                <th className="py-2 pr-2">Doanh thu</th>
                <th className="py-2 pr-2">Commission</th>
                <th className="py-2 pr-2">Đơn trả</th>
                <th className="py-2 pr-2">EPC</th>
                <th className="py-2 pr-2">RPM</th>
                <th className="py-2 pr-2">Trạng thái</th>
                <th className="py-2">Online</th>
              </tr>
            </thead>
            <tbody>
              {top.data?.rows?.map((row) => <TopAffiliateRow key={row.affiliateProfileId} row={row} onOpen={openAffiliate} />) ?? null}
            </tbody>
          </table>
          {!top.loading && !top.data?.rows?.length ? <p className="mt-2 text-sm text-slate-500">Không có dữ liệu.</p> : null}
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="text-slate-500">
            Trang {page}/{totalPages} · {top.data?.total ?? 0} CTV
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              className="rounded-xl border border-slate-200 px-3 py-1.5 font-semibold disabled:opacity-40"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Trước
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              className="rounded-xl border border-slate-200 px-3 py-1.5 font-semibold disabled:opacity-40"
              onClick={() => setPage((p) => p + 1)}
            >
              Sau
            </button>
          </div>
        </div>
      </section>

      <section className={`${adminCardBody} xl:hidden`}>
        <h2 className={adminCardTitle}>Top affiliates (vuốt ngang)</h2>
        <p className="mt-1 text-xs text-slate-500">Mở bộ lọc để tìm / lọc trạng thái.</p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead className="text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="py-2 pr-2">CTV</th>
                <th className="py-2 pr-2">Clicks</th>
                <th className="py-2 pr-2">Conv</th>
                <th className="py-2 pr-2">Doanh thu</th>
                <th className="py-2 pr-2">Hoa hồng</th>
                <th className="py-2 pr-2">Đơn</th>
                <th className="py-2 pr-2">EPC</th>
                <th className="py-2 pr-2">RPM</th>
                <th className="py-2 pr-2">TT</th>
                <th className="py-2">On</th>
              </tr>
            </thead>
            <tbody>
              {top.data?.rows?.map((row) => <TopAffiliateRow key={row.affiliateProfileId} row={row} onOpen={openAffiliate} />) ?? null}
            </tbody>
          </table>
        </div>
      </section>

      <section className={adminCardBody}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className={adminCardTitle}>Fraud & rủi ro</h2>
          <div className="flex flex-wrap gap-2">
            {(["ALL", "high", "medium", "low"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setFraudSeverity(s)}
                className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
                  fraudSeverity === s ? "bg-sky-600 text-white ring-sky-600" : "bg-white text-slate-900 ring-[#E2E8F0]"
                }`}
              >
                {s === "ALL" ? "Tất cả" : s.toUpperCase()}
              </button>
            ))}
            <input
              value={fraudQ}
              onChange={(e) => setFraudQ(e.target.value)}
              placeholder="Tìm ref / session / IP…"
              className={`h-9 min-w-[160px] flex-1 ${adminSelect} text-xs`}
            />
          </div>
        </div>
        {fraud.error ? <p className="mt-2 text-sm text-rose-600">{fraud.error}</p> : null}
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div>
            <p className="text-xs font-semibold text-slate-500">CTV nghi ngờ</p>
            <ul className="mt-2 space-y-2 text-sm">
              {(fraud.data?.affiliates as Array<{ affiliateProfileId: string; refCode: string; severity: string; signals: string[] }> | undefined)?.map(
                (a) => (
                  <li key={a.affiliateProfileId} className="rounded-xl bg-slate-50/90 p-3 ring-1 ring-slate-100">
                    <div className="flex items-center justify-between gap-2">
                      <button type="button" className="text-left font-semibold text-sky-600 hover:underline" onClick={() => openAffiliate(a.affiliateProfileId)}>
                        {a.refCode}
                      </button>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ring-1 ${severityClass(a.severity)}`}>
                        {a.severity}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500">{a.signals?.join(" · ")}</p>
                  </li>
                ),
              ) ?? null}
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Phiên đáng ngờ</p>
            <ul className="mt-2 max-h-64 space-y-2 overflow-y-auto text-xs">
              {(fraud.data?.suspiciousSessions as Array<{ sessionId: string; refCode: string; clickCount: number; severity: string }> | undefined)?.map(
                (s) => (
                  <li key={s.sessionId} className="rounded-lg border border-slate-200 px-2 py-1">
                    <span className={`mr-2 inline-block rounded px-1 text-[10px] font-bold uppercase ${severityClass(s.severity)}`}>{s.severity}</span>
                    {s.refCode} · {s.clickCount} click
                    <div className="truncate font-mono text-[10px] text-slate-500">{s.sessionId}</div>
                  </li>
                ),
              ) ?? null}
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">IP đáng ngờ</p>
            <ul className="mt-2 max-h-64 space-y-2 overflow-y-auto text-xs">
              {(fraud.data?.suspiciousIps as Array<{ ip: string; clickCount: number; severity: string }> | undefined)?.map((i) => (
                <li key={i.ip} className="rounded-lg border border-slate-200 px-2 py-1 font-mono">
                  <span className={`mr-2 inline-block rounded px-1 text-[10px] font-bold uppercase ${severityClass(i.severity)}`}>{i.severity}</span>
                  {i.ip} · {i.clickCount}
                </li>
              )) ?? null}
            </ul>
          </div>
        </div>
      </section>

      {sheetOpen ? (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40 xl:hidden" role="presentation" onClick={() => setSheetOpen(false)}>
          <div
            role="dialog"
            aria-label="Bộ lọc affiliates"
            className="max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className={adminCardTitle}>Bộ lọc</p>
            <div className="mt-3 space-y-3">
              <input
                value={qInput}
                onChange={(e) => {
                  setQInput(e.target.value);
                  setPage(1);
                }}
                className={adminInput}
                placeholder="Tìm ref / tên…"
              />
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
                className={adminSelect}
              >
                <option value="ALL">Trạng thái: tất cả</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="PAUSED">PAUSED</option>
                <option value="LOCKED">LOCKED</option>
              </select>
              <select
                value={online}
                onChange={(e) => {
                  setOnline(e.target.value);
                  setPage(1);
                }}
                className={adminSelect}
              >
                <option value="ALL">Online: tất cả</option>
                <option value="YES">Online</option>
                <option value="NO">Offline</option>
              </select>
              <select
                value={`${sort}:${dir}`}
                onChange={(e) => {
                  const [s, d] = e.target.value.split(":");
                  setSort(s ?? "clicks");
                  setDir(d === "asc" ? "asc" : "desc");
                  setPage(1);
                }}
                className={adminSelect}
              >
                <option value="clicks:desc">Sort: Click ↓</option>
                <option value="revenue:desc">Sort: Doanh thu ↓</option>
                <option value="commission:desc">Sort: Commission ↓</option>
              </select>
              <div className="flex gap-2 pt-2">
                <a
                  className="flex-1 rounded-xl border border-slate-200 py-2 text-center text-xs font-semibold text-sky-600"
                  href={`/api/admin/affiliate-analytics/export?type=affiliates&range=${range}&format=csv`}
                >
                  Xuất CSV
                </a>
                <button type="button" className="flex-1 rounded-xl bg-sky-600 py-2 text-xs font-semibold text-white" onClick={() => setSheetOpen(false)}>
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      </div>
    </div>
  );
}
