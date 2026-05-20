"use client";

import dynamic from "next/dynamic";
import {
  Activity,
  BarChart3,
  CircleDollarSign,
  CreditCard,
  MousePointer2,
  Percent,
  ShoppingBag,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { clsx } from "clsx";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnalyticsErrorBoundary } from "@/components/analytics/analytics-error-boundary";
import { SafeProductThumbnail } from "@/components/ui/safe-product-thumbnail";
import AffiliateAnalyticsBarChartLazy from "./affiliate-analytics-bar-chart-lazy";
import AffiliateConversionFunnelVisual from "./affiliate-conversion-funnel-visual";
import { CreatorEmptyState, CreatorMetricCard, CreatorSectionShell } from "./affiliate-creator-metric-card";
import {
  affiliateAnalyticsFiltersToSearchParams,
  type AffiliateAnalyticsFilters,
  type AffiliateRealtimeActivityClient,
  useAffiliateAnalyticsOverview,
  useAffiliateCampaignList,
  useAffiliateChart,
  useAffiliateConversionTimeline,
  useAffiliateDeviceAnalytics,
  useAffiliateFunnel,
  useAffiliateLandingAnalytics,
  useAffiliateRealtime,
  useAffiliateTopPages,
  useAffiliateTopProducts,
  useAffiliateTrafficSources,
  type RangeKey,
} from "./use-affiliate-analytics-hooks";
import {
  AFFILIATE_ANALYTICS_MAIN_TAB_ACTIVE,
  AFFILIATE_ANALYTICS_MAIN_TAB_INACTIVE,
  AFFILIATE_ANALYTICS_TAB_ROW_SURFACE,
  AFFILIATE_ANALYTICS_TOOLBAR_BTN_PRIMARY,
  AFFILIATE_ANALYTICS_TOOLBAR_BTN_SECONDARY,
} from "@/lib/affiliate-analytics-ui-tokens";
import { scheduleIdleWork } from "@/lib/next-dev-stability";
import { useAffiliateTrackingSse } from "@/hooks/use-affiliate-tracking-sse";
import { mergeAffiliateStreamTicksIntoActivity } from "@/lib/affiliate-tracking-stream-client-merge";
import type { AffiliateTrackingStreamTickV1 } from "@/lib/affiliate-tracking-stream-types";
import type { RtPoint } from "./affiliate-creator-charts/creator-realtime-sparkline-inner";

const AffiliateCreatorChartsSection = dynamic(() => import("./affiliate-creator-charts/affiliate-creator-charts-section"), {
  loading: () => <div className="min-h-[8rem] animate-pulse rounded-2xl bg-[#F1F5F9]/90" />,
  ssr: false,
});

const AffiliateTrackingWorkspace = dynamic(() => import("./affiliate-tracking-workspace"), {
  loading: () => <div className="min-h-[14rem] w-full animate-pulse rounded-2xl bg-[#EFF6FF]/60 ring-1 ring-[#DBEAFE]/80" />,
  ssr: false,
});

const AffiliateAnalyticsTrafficInsights = dynamic(() => import("./affiliate-analytics-traffic-insights"), {
  loading: () => <div className="min-h-[12rem] animate-pulse rounded-2xl bg-[#F1F5F9]/90" />,
  ssr: false,
});

const AffiliateOperationsCenter = dynamic(() => import("@/components/storefront/affiliate-operations-center"), {
  loading: () => <div className="min-h-[16rem] animate-pulse rounded-2xl bg-[#F1F5F9]/90" />,
  ssr: false,
});

function fmtVnd(n: number): string {
  return `${new Intl.NumberFormat("vi-VN").format(Math.round(n))}đ`;
}

function fmtPct(n: number): string {
  if (!Number.isFinite(n)) return "0%";
  return `${(n * 100).toFixed(n < 0.1 ? 1 : 0)}%`;
}

function rangeViLabel(r: RangeKey): string {
  if (r === "today") return "Hôm nay";
  if (r === "7d") return "7 ngày";
  if (r === "30d") return "30 ngày";
  return "Tháng này";
}

function formatRelativeVi(iso: string): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";
  let diffSec = Math.round((Date.now() - t) / 1000);
  if (diffSec < 0) diffSec = 0;
  if (diffSec < 45) return "vừa xong";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} phút trước`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} giờ trước`;
  return new Date(iso).toLocaleString("vi-VN");
}

function Skeleton({ className }: { className: string }): JSX.Element {
  return <div className={`animate-pulse rounded-xl bg-[#F1F5F9]/90 ${className}`} />;
}

type OvTrendSnap = {
  clicks: number;
  visitors: number;
  sessions: number;
  conv: number;
  revenue: number;
  commission: number;
  epc: number;
};

function pctDelta(next: number, prev: number): number | null {
  if (!Number.isFinite(next) || !Number.isFinite(prev)) return null;
  if (prev === 0) return next > 0 ? 100 : 0;
  return ((next - prev) / prev) * 100;
}

const menu = [
  { key: "overview", label: "Tổng quan Affiliate" },
  { key: "traffic", label: "Thống kê truy cập" },
  { key: "insights", label: "Phân tích traffic" },
  { key: "top", label: "Top sản phẩm" },
  { key: "pixel", label: "Pixel / Tracking" },
] as const;

type MenuKey = (typeof menu)[number]["key"];

function normalizeInitialMenuKey(raw: string | undefined): MenuKey {
  if (!raw) return "overview";
  const allowed = new Set(menu.map((m) => m.key));
  return allowed.has(raw as MenuKey) ? (raw as MenuKey) : "overview";
}

export default function AffiliateAnalyticsDashboard({
  affiliateRefCode,
  initialMenuKey,
}: {
  affiliateRefCode: string;
  /** Mở tab ban đầu, ví dụ `?tab=traffic` */
  initialMenuKey?: string;
}): JSX.Element {
  const [active, setActive] = useState<MenuKey>(() => normalizeInitialMenuKey(initialMenuKey));
  const [range, setRange] = useState<RangeKey>("7d");
  const [productSort, setProductSort] = useState<
    "clicks" | "revenue" | "commission" | "conversion" | "orders" | "visitors" | "epc"
  >("clicks");
  const [trafficFilters, setTrafficFilters] = useState<AffiliateAnalyticsFilters>({
    source: "ALL",
    device: "ALL",
    pathname: "",
    productId: "",
  });
  const filterQs = useMemo(() => affiliateAnalyticsFiltersToSearchParams(trafficFilters), [trafficFilters]);

  const [overviewHeavyReady, setOverviewHeavyReady] = useState(false);
  useEffect(() => {
    if (active !== "overview") {
      setOverviewHeavyReady(false);
      return;
    }
    setOverviewHeavyReady(false);
    const t = window.setTimeout(() => setOverviewHeavyReady(true), 160);
    return () => window.clearTimeout(t);
  }, [active, range]);

  /** Stagger heavy hooks after overviewHeavyReady to avoid one burst of parallel fetches (P1-3). */
  const [overviewHeavyPhase, setOverviewHeavyPhase] = useState(0);
  useEffect(() => {
    if (!overviewHeavyReady) {
      setOverviewHeavyPhase(0);
      return;
    }
    setOverviewHeavyPhase(1);
    const t2 = window.setTimeout(() => setOverviewHeavyPhase(2), 100);
    const t3 = window.setTimeout(() => setOverviewHeavyPhase(3), 200);
    return () => {
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [overviewHeavyReady]);

  /**
   * P3 UX: lùi campaigns → devices → landing sau idle để không tranh burst đầu với overview/timeline/sources.
   * Dữ liệu và UI cuối cùng không đổi; chỉ thứ tự mạng.
   */
  const [overviewCampaignsIdleReady, setOverviewCampaignsIdleReady] = useState(false);
  const [overviewDevicesIdleReady, setOverviewDevicesIdleReady] = useState(false);
  const [overviewLandingIdleReady, setOverviewLandingIdleReady] = useState(false);
  useEffect(() => {
    if (active !== "overview") {
      setOverviewCampaignsIdleReady(false);
      setOverviewDevicesIdleReady(false);
      setOverviewLandingIdleReady(false);
      return;
    }
    setOverviewCampaignsIdleReady(false);
    setOverviewDevicesIdleReady(false);
    setOverviewLandingIdleReady(false);
    let devicesTimer: number | null = null;
    let landingTimer: number | null = null;
    const cancelIdle = scheduleIdleWork(() => {
      setOverviewCampaignsIdleReady(true);
      devicesTimer = window.setTimeout(() => setOverviewDevicesIdleReady(true), 140);
      landingTimer = window.setTimeout(() => setOverviewLandingIdleReady(true), 300);
    }, 520);
    return () => {
      cancelIdle();
      if (devicesTimer != null) window.clearTimeout(devicesTimer);
      if (landingTimer != null) window.clearTimeout(landingTimer);
    };
  }, [active, range]);

  const overview = useAffiliateAnalyticsOverview({ range, enabled: active === "overview" });
  const useRealtimeFallback =
    active === "overview" && Boolean(overview.data) && !overview.data.realtimeActivity;

  const baseActivityFromServer = useMemo((): AffiliateRealtimeActivityClient | null => {
    const bundled = overview.data?.realtimeActivity;
    if (bundled) return bundled;
    return null;
  }, [overview.data?.realtimeActivity]);

  const [streamOverlay, setStreamOverlay] = useState<AffiliateRealtimeActivityClient | null>(null);
  const [opsStreamTicks, setOpsStreamTicks] = useState<AffiliateTrackingStreamTickV1[]>([]);
  const baseActivityRef = useRef<AffiliateRealtimeActivityClient | null>(null);

  const sseEnabled = active === "overview" && (Boolean(baseActivityFromServer) || useRealtimeFallback);
  const { status: sseStatus, reconnectCount, lastHeartbeatAt } = useAffiliateTrackingSse({
    enabled: sseEnabled,
    flushMs: 320,
    onTickBatch: (ticks) => {
      setStreamOverlay((prev) => {
        const seed = prev ?? baseActivityRef.current;
        if (!seed) return null;
        return mergeAffiliateStreamTicksIntoActivity(seed, ticks);
      });
      if (ticks.length) {
        setOpsStreamTicks((prev) => [...ticks, ...prev].slice(0, 48));
      }
    },
  });

  const sseLive = sseStatus === "live";
  const realtime = useAffiliateRealtime({
    enabled: useRealtimeFallback,
    sseSuppressPoll: sseLive,
  });

  const baseActivity = useMemo((): AffiliateRealtimeActivityClient | null => {
    if (baseActivityFromServer) return baseActivityFromServer;
    const d = realtime.data;
    if (!d?.realtime) return null;
    return {
      ok: true,
      activeVisitors: d.activeVisitors,
      realtime: d.realtime,
      recentClicks: d.recentClicks,
      recentConversions: d.recentConversions,
      recentOrders: d.recentOrders,
    };
  }, [baseActivityFromServer, realtime.data]);

  const overlayResetKey = useMemo(() => {
    if (baseActivityFromServer) {
      const r = baseActivityFromServer.realtime;
      return `b:${baseActivityFromServer.activeVisitors}:${r.clicksLast5m}:${r.conversionsLast5m}:${r.revenueLast5m}`;
    }
    const d = realtime.data;
    if (d?.realtime) {
      const r = d.realtime;
      return `f:${d.activeVisitors}:${r.clicksLast5m}:${r.conversionsLast5m}:${r.revenueLast5m}`;
    }
    return "";
  }, [baseActivityFromServer, realtime.data]);

  useEffect(() => {
    baseActivityRef.current = baseActivity;
  }, [baseActivity]);

  useEffect(() => {
    setStreamOverlay(null);
    setOpsStreamTicks([]);
  }, [overlayResetKey]);

  const activity = streamOverlay ?? baseActivity;

  const realtimePanelLoading = !activity && (overview.loading || (useRealtimeFallback && realtime.loading));
  const realtimePanelRefreshing = overview.refreshing || (useRealtimeFallback && realtime.refreshing);

  const realtimeStatusLabel = (() => {
    if (realtimePanelLoading) return "Đang tải…";
    if (sseStatus === "connecting") return "SSE…";
    if (sseLive) return reconnectCount > 0 ? `Live SSE · ${reconnectCount}` : "Live SSE";
    if (sseStatus === "error" || sseStatus === "unsupported") return useRealtimeFallback ? "Polling" : "Realtime";
    if (realtimePanelRefreshing) return "Đang cập nhật…";
    return "Realtime";
  })();

  const chartTrafficEnabled =
    active === "traffic" || (active === "overview" && overviewHeavyReady && overviewHeavyPhase >= 1);
  const chart = useAffiliateChart({ range, type: "traffic", enabled: chartTrafficEnabled });
  const topProducts = useAffiliateTopProducts({
    range,
    enabled: active === "top" || (active === "overview" && overviewHeavyReady && overviewHeavyPhase >= 3),
    sort: productSort,
    filterQs: active === "top" ? filterQs : "",
  });
  const topPages = useAffiliateTopPages({
    range,
    enabled: active === "traffic" || (active === "overview" && overviewHeavyReady && overviewHeavyPhase >= 2),
  });
  const funnel = useAffiliateFunnel({
    range,
    enabled: active === "traffic" || (active === "overview" && overviewHeavyReady && overviewHeavyPhase >= 2),
  });

  const creatorTimeline = useAffiliateConversionTimeline({ range, enabled: active === "overview", filterQs: "", live: false });
  const creatorSources = useAffiliateTrafficSources({ range, enabled: active === "overview", filterQs: "", live: false });
  const creatorCampaigns = useAffiliateCampaignList({
    range,
    enabled: active === "overview" && overviewCampaignsIdleReady,
  });
  const creatorLanding = useAffiliateLandingAnalytics({
    range,
    enabled: active === "overview" && overviewLandingIdleReady,
    filterQs: "",
    page: 1,
    live: false,
  });
  const creatorDevices = useAffiliateDeviceAnalytics({
    range,
    enabled: active === "overview" && overviewDevicesIdleReady,
    filterQs: "",
    live: false,
  });

  const campaignBarRows = useMemo(
    () =>
      (creatorCampaigns.data?.campaigns ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        clicks: c.stats.clicks,
        revenue: c.stats.revenue,
        commission: c.stats.commission,
        epc: c.stats.epc,
        conversion: c.stats.conversion,
      })),
    [creatorCampaigns.data?.campaigns],
  );

  const [rtHistory, setRtHistory] = useState<RtPoint[]>([]);
  useEffect(() => {
    setRtHistory([]);
  }, [range]);

  /** Chỉ đổi khi payload server poll — tránh spam điểm sparkline khi merge SSE. */
  const rtPollSignature = useMemo(() => {
    if (baseActivityFromServer?.realtime) {
      const r = baseActivityFromServer.realtime;
      return `b:${baseActivityFromServer.activeVisitors}|${r.clicksLast5m}|${r.conversionsLast5m}|${r.revenueLast5m}`;
    }
    const d = realtime.data;
    if (d?.realtime) {
      const r = d.realtime;
      return `f:${d.activeVisitors}|${r.clicksLast5m}|${r.conversionsLast5m}|${r.revenueLast5m}`;
    }
    return "";
  }, [baseActivityFromServer, realtime.data]);

  const activityRef = useRef(activity);
  activityRef.current = activity;

  useEffect(() => {
    if (active !== "overview" || !rtPollSignature) return;
    const act = activityRef.current;
    if (!act?.realtime) return;
    const r = act.realtime;
    const online = act.activeVisitors;
    setRtHistory((prev) => [...prev, { t: Date.now(), clicks: r.clicksLast5m, online, conv: r.conversionsLast5m }].slice(-120));
  }, [active, rtPollSignature]);

  const buckets = useMemo(() => {
    const b = chart.data?.buckets ?? [];
    return b.map((r) => ({
      label: r.label,
      clicks: r.clicks,
      orders: r.orders,
      revenue: r.revenue,
      commission: r.commission,
    }));
  }, [chart.data]);

  const chartHasTraffic = useMemo(() => {
    if (!buckets.length) return false;
    return buckets.some((x) => x.clicks > 0 || x.orders > 0 || x.revenue > 0 || x.commission > 0);
  }, [buckets]);

  const ov = overview.data?.overview ?? null;
  const lastOvTrendRef = useRef<OvTrendSnap | null>(null);
  const [ovTrends, setOvTrends] = useState<Partial<Record<keyof OvTrendSnap, number>>>({});
  useEffect(() => {
    if (!ov || (overview.loading && !overview.data)) return;
    const next: OvTrendSnap = {
      clicks: ov.totalClicks,
      visitors: ov.uniqueVisitors,
      sessions: ov.sessions,
      conv: ov.conversionRate,
      revenue: ov.totalRevenue,
      commission: ov.totalCommission,
      epc: ov.EPC,
    };
    const prev = lastOvTrendRef.current;
    if (prev) {
      setOvTrends({
        clicks: pctDelta(next.clicks, prev.clicks) ?? 0,
        visitors: pctDelta(next.visitors, prev.visitors) ?? 0,
        sessions: pctDelta(next.sessions, prev.sessions) ?? 0,
        conv: pctDelta(next.conv, prev.conv) ?? 0,
        revenue: pctDelta(next.revenue, prev.revenue) ?? 0,
        commission: pctDelta(next.commission, prev.commission) ?? 0,
        epc: pctDelta(next.epc, prev.epc) ?? 0,
      });
    }
    lastOvTrendRef.current = next;
  }, [ov, overview.loading, overview.data]);

  return (
    <AnalyticsErrorBoundary title="Dashboard analytics tạm thời không khả dụng.">
      <div className="relative w-full min-w-0 flex-1 overflow-x-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-sm [-webkit-font-smoothing:antialiased] px-4 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-6">
        <section className="flex w-full min-w-0 flex-1 flex-col gap-5 overflow-x-hidden sm:gap-6 lg:gap-7">
              <header className="flex w-full min-w-0 shrink-0 flex-col gap-5 border-b border-[#DBEAFE]/70 pb-5 lg:flex-row lg:items-end lg:justify-between lg:gap-8">
                <div className="flex min-w-0 items-start gap-3 sm:gap-4">
                  <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#DBEAFE] text-[#1D4ED8] shadow-sm ring-1 ring-[#BFDBFE]/60 sm:h-12 sm:w-12">
                    <BarChart3 className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                  </span>
                  <div className="min-w-0 space-y-1.5">
                    <h1 className="text-xl font-semibold tracking-tight text-[#0F172A] sm:text-2xl lg:text-[1.65rem] lg:leading-tight">
                      Bảng số CTV
                    </h1>
                    <p className="w-full min-w-0 text-sm leading-relaxed text-[#64748B] sm:text-[15px]">
                      Theo dõi hiệu quả theo thời gian thực. Mã ref{" "}
                      <span className="rounded-md bg-[#F1F5F9] px-1.5 py-0.5 font-mono text-[13px] font-semibold text-[#1E293B]">
                        {affiliateRefCode}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                  <label className="sr-only" htmlFor="affiliate-analytics-range">
                    Chọn khoảng thời gian
                  </label>
                  <select
                    id="affiliate-analytics-range"
                    value={range}
                    onChange={(e) => setRange(e.target.value as RangeKey)}
                    className="h-10 min-w-[9.5rem] cursor-pointer rounded-xl border border-[#BFDBFE]/90 bg-white px-3.5 text-sm font-medium text-[#1E293B] shadow-[0_1px_2px_rgba(37,99,235,0.06)] outline-none transition-shadow focus-visible:border-[#93C5FD] focus-visible:ring-2 focus-visible:ring-[#60A5FA]/25"
                    aria-label="Chọn khoảng thời gian"
                  >
                    <option value="today">Hôm nay</option>
                    <option value="7d">7 ngày</option>
                    <option value="30d">30 ngày</option>
                    <option value="month">Tháng này</option>
                  </select>
                  <span
                    title={
                      lastHeartbeatAt
                        ? `Heartbeat: ${new Date(lastHeartbeatAt).toLocaleTimeString("vi-VN")}`
                        : sseLive
                          ? "Đang nhận sự kiện tracking qua SSE."
                          : undefined
                    }
                    className={clsx(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold tabular-nums transition-colors",
                      realtimePanelLoading
                        ? "border-[#DBEAFE]/90 bg-[#EFF6FF]/50 text-[#64748B]"
                        : sseLive
                          ? "border-emerald-300/80 bg-emerald-50/95 text-emerald-900"
                          : realtimePanelRefreshing
                            ? "border-[#93C5FD]/70 bg-[#DBEAFE]/60 text-[#1D4ED8] motion-safe:animate-pulse"
                            : "border-[#BFDBFE]/90 bg-[#EFF6FF]/90 text-[#1D4ED8]",
                    )}
                  >
                    <Zap className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
                    {realtimeStatusLabel}
                  </span>
                </div>
              </header>

              <nav
                aria-label="Mục analytics"
                className="sticky top-0 z-10 w-full shrink-0 border-b border-[#DBEAFE]/70 bg-[#EFF6FF]/45 py-3 backdrop-blur-[2px] lg:static lg:z-0 lg:border-0 lg:bg-transparent lg:py-0 lg:backdrop-blur-none"
              >
                <div className="overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] lg:overflow-visible [&::-webkit-scrollbar]:hidden">
                  <div
                    className={clsx(
                      AFFILIATE_ANALYTICS_TAB_ROW_SURFACE,
                      "flex w-max min-w-full touch-pan-x snap-x snap-mandatory flex-nowrap gap-1 pb-0.5 lg:w-full lg:min-w-0 lg:flex-wrap lg:justify-start lg:gap-1 lg:snap-none",
                    )}
                  >
                    {menu.map((m) => (
                      <button
                        key={m.key}
                        type="button"
                        onClick={() => setActive(m.key)}
                        className={active === m.key ? AFFILIATE_ANALYTICS_MAIN_TAB_ACTIVE : AFFILIATE_ANALYTICS_MAIN_TAB_INACTIVE}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
              </nav>

              <div
                className="flex w-full flex-1 flex-col gap-5 sm:gap-6 lg:gap-7"
                role="tabpanel"
                aria-label="Nội dung tab analytics"
              >

              {active === "overview" ? (
                <div className="flex w-full flex-col gap-5 sm:gap-6 lg:gap-7">
                  <AffiliateOperationsCenter
                    enabled={Boolean(activity)}
                    activity={activity}
                    overviewEpc={ov?.EPC ?? 0}
                    sseLive={sseLive}
                    sseStatus={sseStatus}
                    streamTicks={opsStreamTicks}
                    sourcesRows={creatorSources.data?.rows ?? []}
                    campaignRows={campaignBarRows}
                    deviceRows={creatorDevices.data?.rows ?? []}
                    rtHistory={rtHistory}
                  />

                  <div className="grid w-full min-w-0 grid-cols-2 gap-3 sm:gap-3.5 md:grid-cols-[repeat(auto-fit,minmax(15rem,1fr))] lg:gap-4 [&>*]:min-h-0">
            <CreatorMetricCard
              icon={MousePointer2}
              label="Tổng click"
              value={`${ov?.totalClicks ?? 0}`}
              loading={overview.loading && !overview.data}
              tone="blue"
              pulse={overview.refreshing}
              trendPct={ovTrends.clicks ?? null}
            />
            <CreatorMetricCard
              icon={Users}
              label="Unique visitors"
              value={`${ov?.uniqueVisitors ?? 0}`}
              loading={overview.loading && !overview.data}
              trendPct={ovTrends.visitors ?? null}
            />
            <CreatorMetricCard
              icon={Activity}
              label="Sessions"
              value={`${ov?.sessions ?? 0}`}
              loading={overview.loading && !overview.data}
              trendPct={ovTrends.sessions ?? null}
            />
            <CreatorMetricCard
              icon={Percent}
              label="Conversion rate"
              value={fmtPct(ov?.conversionRate ?? 0)}
              loading={overview.loading && !overview.data}
              tone="emerald"
              trendPct={ovTrends.conv ?? null}
            />
            <CreatorMetricCard icon={ShoppingBag} label="Tổng đơn" value={`${ov?.orders ?? 0}`} loading={overview.loading && !overview.data} />
            <CreatorMetricCard
              icon={CreditCard}
              label="Đơn đã thanh toán"
              value={`${ov?.paidOrders ?? 0}`}
              loading={overview.loading && !overview.data}
              tone="emerald"
            />
            <CreatorMetricCard label="Đơn đã hủy" value={`${ov?.cancelledOrders ?? 0}`} loading={overview.loading && !overview.data} tone="slate" />
            <CreatorMetricCard
              icon={CircleDollarSign}
              label="Tổng doanh thu"
              value={fmtVnd(ov?.totalRevenue ?? 0)}
              loading={overview.loading && !overview.data}
              tone="fuchsia"
              trendPct={ovTrends.revenue ?? null}
            />
            <CreatorMetricCard
              icon={TrendingUp}
              label="Tổng commission"
              value={fmtVnd(ov?.totalCommission ?? 0)}
              loading={overview.loading && !overview.data}
              tone="emerald"
              trendPct={ovTrends.commission ?? null}
            />
            <CreatorMetricCard
              icon={Zap}
              label="EPC"
              value={fmtVnd(ov?.EPC ?? 0)}
              loading={overview.loading && !overview.data}
              tone="amber"
              trendPct={ovTrends.epc ?? null}
            />
            <CreatorMetricCard label="RPM" value={fmtVnd(ov?.RPM ?? 0)} loading={overview.loading && !overview.data} />
            <CreatorMetricCard label="AOV" value={fmtVnd(ov?.AOV ?? 0)} loading={overview.loading && !overview.data} />
                  </div>

                  <AffiliateCreatorChartsSection
              rangeLabel={rangeViLabel(range)}
              timelineBuckets={creatorTimeline.data?.buckets ?? []}
              sourcesRows={creatorSources.data?.rows ?? []}
              campaignRows={campaignBarRows}
              landingRows={creatorLanding.data?.rows ?? []}
              rtHistory={rtHistory}
              loadingTimeline={creatorTimeline.loading && !creatorTimeline.data}
              loadingSources={creatorSources.loading && !creatorSources.data}
              loadingCampaigns={creatorCampaigns.loading && !creatorCampaigns.data}
              loadingLanding={creatorLanding.loading && !creatorLanding.data}
                  />

                  <div className="grid w-full min-w-0 gap-4 lg:grid-cols-5 lg:gap-5">
            <CreatorSectionShell
              className="lg:col-span-3"
              title="Traffic theo ngày"
              hint={range === "today" ? "Hôm nay" : "Theo khoảng"}
            >
              {chart.loading && !chart.data ? (
                <Skeleton className="mt-3 h-44 min-h-[11rem] w-full rounded-xl" />
              ) : !chartHasTraffic ? (
                <div className="mt-3 min-h-[11rem]">
                  <CreatorEmptyState
                    icon={BarChart3}
                    title="Chưa có traffic trong kỳ"
                    hint="Khi có click theo ngày, biểu đồ sẽ hiển thị. Hãy chia sẻ link ref và quay lại sau."
                  />
                </div>
              ) : (
                <div className={`mt-3 min-h-[11rem] transition-opacity duration-300 ${chart.refreshing ? "opacity-75" : "opacity-100"}`}>
                  <AnalyticsErrorBoundary title="Biểu đồ traffic lỗi.">
                    <AffiliateAnalyticsBarChartLazy buckets={buckets} />
                  </AnalyticsErrorBoundary>
                </div>
              )}
              {chart.error ? (
                <div className="mt-2 rounded-xl border border-rose-200 bg-rose-50 p-2 text-sm text-rose-700">
                  {chart.error}{" "}
                  <button type="button" className="font-semibold underline" onClick={chart.refetch}>
                    Thử lại
                  </button>
                </div>
              ) : null}
            </CreatorSectionShell>

            <CreatorSectionShell
              className="lg:col-span-2"
              title="Realtime"
              hint={useRealtimeFallback ? "API tổng quan cũ — dùng endpoint realtime riêng" : "Đồng bộ tổng quan — ít request hơn"}
            >
              {realtimePanelLoading ? (
                <Skeleton className="mt-3 h-40 w-full" />
              ) : (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <CreatorMetricCard
                    icon={Users}
                    label="Online"
                    value={`${activity?.activeVisitors ?? 0}`}
                    tone="emerald"
                    pulse={realtimePanelRefreshing}
                  />
                  <CreatorMetricCard
                    icon={MousePointer2}
                    label="Click 5 phút"
                    value={`${activity?.realtime?.clicksLast5m ?? 0}`}
                    pulse={realtimePanelRefreshing}
                  />
                  <CreatorMetricCard
                    icon={Percent}
                    label="Chuyển đổi 5 phút"
                    value={`${activity?.realtime?.conversionsLast5m ?? 0}`}
                    tone="emerald"
                  />
                  <CreatorMetricCard
                    icon={CircleDollarSign}
                    label="Doanh thu 5 phút"
                    value={fmtVnd(activity?.realtime?.revenueLast5m ?? 0)}
                    tone="fuchsia"
                  />
                </div>
              )}
              {activity?.recentClicks?.length ? (
                <div className="mt-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">Click gần đây</p>
                  <div className="mt-2 space-y-2">
                    {activity.recentClicks.slice(0, 6).map((c) => (
                      <div key={c.id} className="rounded-xl border border-[#E2E8F0]/70 bg-[#F8FAFC]/90 px-3 py-2">
                        <p className="text-sm font-semibold text-[#0F172A]">{c.pathname || "Trang"}</p>
                        <p className="mt-0.5 text-[11px] text-[#64748B]">
                          {formatRelativeVi(c.createdAt)}
                          {c.trafficSource ? (
                            <>
                              {" · "}
                              <span className="font-semibold text-[#1E293B]">{c.trafficSource}</span>
                            </>
                          ) : null}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </CreatorSectionShell>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2 lg:gap-5 lg:items-stretch">
            <CreatorSectionShell className="flex flex-col lg:min-h-[min(36dvh,22rem)]" title="Top sản phẩm">
              {topProducts.loading && !topProducts.data ? (
                <Skeleton className="mt-4 h-44 w-full rounded-xl" />
              ) : topProducts.data?.rows?.length ? (
                <div className="mt-4 overflow-x-auto rounded-xl border border-[#F1F5F9]">
                  <table className="w-full min-w-[560px] text-left text-sm">
                    <thead className="bg-[#F8FAFC]/90 text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">
                      <tr>
                        <th className="px-3 py-2.5 pr-3">Sản phẩm</th>
                        <th className="px-3 py-2.5 pr-3">Click</th>
                        <th className="px-3 py-2.5 pr-3">Visitor</th>
                        <th className="px-3 py-2.5 pr-3">Conv</th>
                        <th className="px-3 py-2.5 pr-3">Doanh thu</th>
                        <th className="px-3 py-2.5">Commission</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F1F5F9]">
                      {topProducts.data.rows.slice(0, 8).map((r) => (
                        <tr key={r.productId} className="bg-white hover:bg-[#F8FAFC]/60">
                          <td className="px-3 py-2.5 pr-3">
                            <div className="flex min-w-0 items-center gap-2">
                              <SafeProductThumbnail
                                src={r.imageUrl}
                                alt=""
                                size={32}
                                className="h-8 w-8 shrink-0 rounded-lg object-cover"
                              />
                              <span className="min-w-0 font-medium text-[#0F172A]">{r.productName}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 pr-3 tabular-nums text-[#1E293B]">{r.clicks}</td>
                          <td className="px-3 py-2.5 pr-3 tabular-nums text-[#1E293B]">{r.visitors ?? "—"}</td>
                          <td className="px-3 py-2.5 pr-3 tabular-nums text-emerald-700">{fmtPct(r.conversionRate)}</td>
                          <td className="px-3 py-2.5 pr-3 tabular-nums text-[#1E293B]">{fmtVnd(r.revenue)}</td>
                          <td className="px-3 py-2.5 tabular-nums text-emerald-700">{fmtVnd(r.commission)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="mt-4 flex min-h-[min(32dvh,18rem)] flex-1 flex-col justify-center lg:min-h-[min(38dvh,22rem)]">
                  <CreatorEmptyState
                    icon={ShoppingBag}
                    title="Chưa có top sản phẩm"
                    hint="Khi có traffic và click vào sản phẩm, bảng xếp hạng sẽ hiện tại đây. Hãy chia sẻ link ref của bạn."
                  />
                </div>
              )}
            </CreatorSectionShell>

            <CreatorSectionShell title="Funnel chuyển đổi">
              <div className="mt-2 min-h-[10rem]">
                {funnel.loading && !funnel.data ? (
                  <Skeleton className="h-40 w-full rounded-xl" />
                ) : !(funnel.data?.steps?.length ?? 0) || (funnel.data?.steps ?? []).every((s) => s.count === 0) ? (
                  <CreatorEmptyState
                    icon={Percent}
                    title="Chưa đủ dữ liệu funnel"
                    hint="Khi có luồng click → đơn trong kỳ, các bước funnel sẽ hiển thị rõ hơn."
                  />
                ) : (
                  <AffiliateConversionFunnelVisual loading={false} steps={funnel.data?.steps ?? []} variant="compact" />
                )}
              </div>
            </CreatorSectionShell>
                  </div>
                </div>
              ) : null}

              {active === "traffic" ? (
                <div className="flex w-full flex-col gap-5 sm:gap-6 lg:gap-7">
                  <div className="grid gap-4 lg:grid-cols-5 lg:items-stretch lg:gap-5">
            <CreatorSectionShell
              className="flex flex-col lg:col-span-3"
              title="Biểu đồ traffic / conversions"
              hint="Gọn trên mobile, tự làm mềm khi đang tải lại."
            >
              {chart.loading && !chart.data ? (
                <Skeleton className="mt-2 h-56 min-h-[14rem] w-full rounded-xl sm:h-64" />
              ) : !chartHasTraffic ? (
                <div className="mt-2 min-h-[14rem]">
                  <CreatorEmptyState
                    icon={BarChart3}
                    title="Chưa có traffic trong kỳ"
                    hint="Thử đổi khoảng thời gian hoặc tăng chia sẻ link — dữ liệu sẽ tự cập nhật khi có sự kiện."
                  />
                </div>
              ) : (
                <div className={`mt-2 min-h-[14rem] transition-opacity duration-300 ${chart.refreshing ? "opacity-75" : "opacity-100"}`}>
                  <AnalyticsErrorBoundary title="Biểu đồ traffic lỗi.">
                    <AffiliateAnalyticsBarChartLazy buckets={buckets} size="tall" />
                  </AnalyticsErrorBoundary>
                </div>
              )}
              {chart.error ? (
                <div className="mt-2 rounded-xl border border-rose-200 bg-rose-50 p-2 text-sm text-rose-700">
                  {chart.error}{" "}
                  <button type="button" className="font-semibold underline" onClick={chart.refetch}>
                    Thử lại
                  </button>
                </div>
              ) : null}
            </CreatorSectionShell>

            <CreatorSectionShell className="flex flex-col lg:col-span-2 lg:min-h-[min(36dvh,22rem)]" title="Top landing pages" hint="Theo visits trong kỳ">
              {topPages.loading && !topPages.data ? (
                <Skeleton className="mt-2 h-52 min-h-[13rem] w-full rounded-xl sm:h-60" />
              ) : topPages.data?.rows?.length ? (
                <div className="mt-2 space-y-2">
                  {topPages.data.rows.slice(0, 10).map((r) => (
                    <div
                      key={r.pathname}
                      className="rounded-xl border border-[#E2E8F0]/80 bg-white/90 p-2 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
                    >
                      <p className="text-sm font-bold tracking-tight text-[#0F172A]">{r.pathname}</p>
                      <p className="mt-1 text-[11px] text-[#64748B]">
                        Visits: <span className="font-semibold tabular-nums text-[#1E293B]">{r.visits}</span>
                        {" · "}
                        Conv: <span className="font-semibold tabular-nums text-emerald-700">{fmtPct(r.conversionRate)}</span>
                        {" · "}
                        Revenue: <span className="font-semibold tabular-nums text-[#1E293B]">{fmtVnd(r.revenue)}</span>
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-2 flex flex-col justify-center lg:min-h-[min(28dvh,16rem)]">
                  <CreatorEmptyState
                    icon={BarChart3}
                    title="Chưa có dữ liệu pages"
                    hint="Chia sẻ link ref và quay lại sau khi có visits — danh sách landing sẽ tự điền."
                  />
                </div>
              )}
            </CreatorSectionShell>
                  </div>
                  <CreatorSectionShell className="mt-1 lg:mt-0" title="Funnel chi tiết" hint="Từ click đến thanh toán (mobile-friendly)">
                    <div className="mt-4 min-h-[12rem]">
                      {funnel.loading && !funnel.data ? (
                        <Skeleton className="h-56 w-full rounded-xl" />
                      ) : !(funnel.data?.steps?.length ?? 0) || (funnel.data?.steps ?? []).every((s) => s.count === 0) ? (
                        <CreatorEmptyState
                          icon={Percent}
                          title="Chưa đủ dữ liệu funnel"
                          hint="Thử mở rộng khoảng thời gian hoặc kiểm tra tab Campaign nếu bạn lọc theo chiến dịch."
                        />
                      ) : (
                        <AffiliateConversionFunnelVisual loading={false} steps={funnel.data?.steps ?? []} variant="full" />
                      )}
                    </div>
                  </CreatorSectionShell>
                </div>
              ) : null}

              {active === "top" ? (
                <div className="flex w-full flex-col gap-4 lg:gap-5">
                  <CreatorSectionShell title="Lọc nhanh" hint="Áp dụng cho bảng top sản phẩm">
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
                      <select
                        value={trafficFilters.source}
                        onChange={(e) => setTrafficFilters((f) => ({ ...f, source: e.target.value }))}
                        className="h-10 w-full min-w-0 rounded-xl border border-[#E2E8F0] bg-white px-3 text-sm font-medium text-[#0F172A] shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A]/10"
                      >
                        <option value="ALL">Nguồn: tất cả</option>
                        <option value="TIKTOK">TikTok</option>
                        <option value="FACEBOOK">Facebook</option>
                        <option value="YOUTUBE">YouTube</option>
                        <option value="INSTAGRAM">Instagram</option>
                        <option value="DIRECT">Direct</option>
                        <option value="UNKNOWN">Unknown</option>
                      </select>
                      <select
                        value={trafficFilters.device}
                        onChange={(e) => setTrafficFilters((f) => ({ ...f, device: e.target.value }))}
                        className="h-10 w-full min-w-0 rounded-xl border border-[#E2E8F0] bg-white px-3 text-sm font-medium text-[#0F172A] shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A]/10"
                      >
                        <option value="ALL">Thiết bị: tất cả</option>
                        <option value="mobile">Mobile</option>
                        <option value="desktop">Desktop</option>
                        <option value="tablet">Tablet</option>
                      </select>
                      <select
                        value={productSort}
                        onChange={(e) => setProductSort(e.target.value as typeof productSort)}
                        className="h-10 w-full min-w-0 rounded-xl border border-[#E2E8F0] bg-white px-3 text-sm font-medium text-[#0F172A] shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A]/10"
                      >
                        <option value="clicks">Sort: Click</option>
                        <option value="revenue">Sort: Doanh thu</option>
                        <option value="commission">Sort: Commission</option>
                        <option value="conversion">Sort: Conv %</option>
                        <option value="orders">Sort: Đơn</option>
                        <option value="visitors">Sort: Visitor</option>
                        <option value="epc">Sort: EPC (HH/click)</option>
                      </select>
                      <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-1 xl:col-span-1">
                        <a
                          className={clsx(AFFILIATE_ANALYTICS_TOOLBAR_BTN_PRIMARY, "h-10 flex-1 min-w-[5rem]")}
                          href={`/api/account/affiliate/analytics/export?type=top-products&range=${range}&format=csv${filterQs ? `&${filterQs}` : ""}`}
                        >
                          CSV
                        </a>
                        <button
                          type="button"
                          className={clsx(AFFILIATE_ANALYTICS_TOOLBAR_BTN_SECONDARY, "h-10 flex-1 min-w-[5rem]")}
                          onClick={topProducts.refetch}
                        >
                          Tải lại
                        </button>
                      </div>
                    </div>
                  </CreatorSectionShell>

                  <CreatorSectionShell className="flex flex-1 flex-col lg:min-h-[min(44dvh,26rem)]" title="Top sản phẩm" hint="Theo bộ lọc và khoảng thời gian">
                    {topProducts.loading && !topProducts.data ? (
                      <Skeleton className="mt-4 h-72 w-full rounded-xl" />
                    ) : topProducts.data?.rows?.length ? (
                      <div className="mt-4 overflow-x-auto rounded-xl border border-[#F1F5F9]">
                        <table className="w-full min-w-[820px] text-left text-sm">
                          <thead className="bg-[#F8FAFC]/90 text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">
                            <tr>
                              <th className="px-3 py-2.5 pr-3">Sản phẩm</th>
                              <th className="px-3 py-2.5 pr-3">Click</th>
                              <th className="px-3 py-2.5 pr-3">Visitor</th>
                              <th className="px-3 py-2.5 pr-3">Đơn trả</th>
                              <th className="px-3 py-2.5 pr-3">Conv</th>
                              <th className="px-3 py-2.5 pr-3">Doanh thu</th>
                              <th className="px-3 py-2.5">Commission</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#F1F5F9]">
                            {topProducts.data.rows.map((r) => (
                              <tr key={r.productId} className="bg-white hover:bg-[#F8FAFC]/60">
                                <td className="px-3 py-2.5 pr-3">
                                  <div className="flex min-w-0 items-center gap-2">
                                    <SafeProductThumbnail src={r.imageUrl} alt="" size={40} />
                                    <span className="min-w-0 truncate font-medium text-[#0F172A]">{r.productName}</span>
                                  </div>
                                </td>
                                <td className="px-3 py-2.5 pr-3 tabular-nums text-[#1E293B]">{r.clicks}</td>
                                <td className="px-3 py-2.5 pr-3 tabular-nums text-[#1E293B]">{r.visitors ?? "—"}</td>
                                <td className="px-3 py-2.5 pr-3 tabular-nums text-[#1E293B]">{r.paidOrders}</td>
                                <td className="px-3 py-2.5 pr-3 tabular-nums text-emerald-700">{fmtPct(r.conversionRate)}</td>
                                <td className="px-3 py-2.5 pr-3 tabular-nums text-[#1E293B]">{fmtVnd(r.revenue)}</td>
                                <td className="px-3 py-2.5 tabular-nums text-emerald-700">{fmtVnd(r.commission)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="mt-4 flex min-h-[min(36dvh,20rem)] flex-1 flex-col justify-center lg:min-h-[min(42dvh,24rem)]">
                        <CreatorEmptyState
                          icon={ShoppingBag}
                          title="Chưa có dữ liệu top sản phẩm"
                          hint="Mở rộng khoảng thời gian, nới bộ lọc hoặc chia sẻ thêm link ref — bảng sẽ tự cập nhật khi có click vào sản phẩm."
                        />
                      </div>
                    )}
                  </CreatorSectionShell>
                </div>
              ) : null}

              {active === "insights" ? (
                <div className="flex w-full flex-col">
                  <AffiliateAnalyticsTrafficInsights range={range} filters={trafficFilters} onFiltersChange={setTrafficFilters} />
                </div>
              ) : null}

              {active === "pixel" ? (
                <div className="flex w-full min-w-0 flex-1 flex-col lg:min-h-[min(58dvh,36rem)]">
                  <AffiliateTrackingWorkspace />
                </div>
              ) : null}
              </div>
        </section>
      </div>
    </AnalyticsErrorBoundary>
  );
}

