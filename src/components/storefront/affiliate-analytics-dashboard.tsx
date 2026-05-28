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
  clickLabelForAnalyticsRange,
  CTV_ANALYTICS_CLICK_PERIOD_HINT,
} from "@/lib/ctv/ctv-click-display";
import {
  CTV_ANALYTICS_ORDER_PERIOD_HINT,
  CTV_PAID_ORDER_KPI_HINT,
  orderLabelForAnalyticsRange,
  paidOrderLabelForAnalyticsRange,
} from "@/lib/ctv/ctv-order-display";
import {
  conversionLabelForAnalyticsRange,
  CTV_CONVERSION_FORMULA_HINT,
} from "@/lib/ctv/ctv-conversion-month-kpi";
import {
  affiliateAnalyticsFiltersToSearchParams,
  type AffiliateAnalyticsFilters,
  type AffiliateRealtimeActivityClient,
  useAffiliateAnalyticsOverview,
  useAffiliateCampaignList,
  useAffiliateChart,
  useAffiliateDeviceAnalytics,
  useAffiliateFunnel,
  useAffiliateRealtime,
  useAffiliateTopPages,
  useAffiliateTopProducts,
  useAffiliateTrafficSources,
  type RangeKey,
} from "./use-affiliate-analytics-hooks";
import { AccountPageTabPanel } from "./account-page-tab-panel";
import { ACCOUNT_PAGE_HEADER_SELECT } from "./account-page-header-tokens";
import {
  CTV_ANALYTICS_OVERVIEW_STACK,
  CTV_ANALYTICS_TAB_CONTENT,
  CTV_TRAFFIC_TAB_BODY,
  CTV_TRAFFIC_TAB_BODY_CENTER,
  CTV_TRAFFIC_TAB_BODY_FILL,
  CTV_TRAFFIC_TAB_CHART_BOX,
  CTV_TRAFFIC_TAB_CHART_COL,
  CTV_TRAFFIC_TAB_EMPTY_STATE,
  CTV_TRAFFIC_TAB_LANDING_COL,
  CTV_TRAFFIC_TAB_LOADING_FILL,
  CTV_TRAFFIC_TAB_MOBILE_LIST,
  CTV_TRAFFIC_TAB_PAIR_ROW,
  CTV_TRAFFIC_TAB_SHELL,
  CTV_TRAFFIC_TAB_SHELL_BODY,
  CTV_TRAFFIC_TAB_TABLE_AREA,
  CTV_TRAFFIC_TAB_TABLE_COL_LANDING,
  CTV_TRAFFIC_TAB_TABLE_COL_METRIC,
  CTV_TRAFFIC_TAB_TABLE_SCROLL,
  CTV_TRAFFIC_TAB_TABLE_TD,
  CTV_TRAFFIC_TAB_TABLE_TH,
  CTV_COLOR_ACCENT_BORDER,
  CTV_COLOR_ACCENT_RING,
  CTV_COLOR_ACCENT_SURFACE,
  CTV_COLOR_BORDER,
  CTV_COLOR_BORDER_STRONG,
  CTV_COLOR_SURFACE_ROW_HOVER,
  CTV_COLOR_SURFACE_TABLE_HEAD,
  CTV_ANALYTICS_TAB_SCROLL,
  CTV_DASHBOARD_HEADER_STICKY,
} from "./affiliate/affiliate-ctv-account-ui-tokens";
import {
  CTV_SEGMENTED_ITEM,
  CTV_SEGMENTED_ITEM_ACTIVE,
  CTV_TAB_IDLE_HOVER,
  CTV_V2_SELECT,
} from "./ctv/ctv-ui-tokens";
import {
  AFFILIATE_ANALYTICS_TOOLBAR_BTN_PRIMARY,
  AFFILIATE_ANALYTICS_TOOLBAR_BTN_SECONDARY,
} from "@/lib/affiliate-analytics-ui-tokens";
import { scheduleIdleWork } from "@/lib/next-dev-stability";
import { useAffiliateTrackingSse } from "@/hooks/use-affiliate-tracking-sse";
import { mergeAffiliateStreamTicksIntoActivity } from "@/lib/affiliate-tracking-stream-client-merge";
import type { AffiliateTrackingStreamTickV1 } from "@/lib/affiliate-tracking-stream-types";
import type { RtPoint } from "./affiliate-creator-charts/creator-realtime-sparkline-inner";
const AffiliateAnalyticsOverviewSection = dynamic(
  () => import("./affiliate-analytics-widgets/affiliate-analytics-overview-section"),
  {
    loading: () => <div className="min-h-[24rem] animate-pulse rounded-2xl bg-slate-100/90" aria-hidden />,
    ssr: false,
  },
);

const AffiliateTrackingWorkspace = dynamic(
  () => import("./affiliate-tracking-workspace").then((mod) => mod.default),
  {
    loading: () => (
      <div
        className={clsx(
          "min-h-[14rem] w-full animate-pulse rounded-2xl ring-1",
          CTV_COLOR_ACCENT_SURFACE,
          "bg-blue-50/60",
          CTV_COLOR_ACCENT_RING,
          "ring-blue-100/80",
        )}
        aria-busy
        aria-label="Đang tải Pixel / Tracking"
      />
    ),
    ssr: false,
  },
);

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

  const analyticsTabScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scroller = analyticsTabScrollRef.current;
    if (!scroller) return;
    const activeBtn = scroller.querySelector<HTMLButtonElement>(`[data-analytics-tab="${active}"]`);
    activeBtn?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [active]);

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
  useEffect(() => {
    if (active !== "overview") {
      setOverviewCampaignsIdleReady(false);
      setOverviewDevicesIdleReady(false);
      return;
    }
    setOverviewCampaignsIdleReady(false);
    setOverviewDevicesIdleReady(false);
    let devicesTimer: number | null = null;
    const cancelIdle = scheduleIdleWork(() => {
      setOverviewCampaignsIdleReady(true);
      devicesTimer = window.setTimeout(() => setOverviewDevicesIdleReady(true), 140);
    }, 520);
    return () => {
      cancelIdle();
      if (devicesTimer != null) window.clearTimeout(devicesTimer);
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

  const [opsRtHistory, setOpsRtHistory] = useState<RtPoint[]>([]);
  useEffect(() => {
    setOpsRtHistory([]);
  }, [range]);

  const opsRtPollSignature = useMemo(() => {
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
    if (active !== "overview" || !opsRtPollSignature) return;
    const act = activityRef.current;
    if (!act?.realtime) return;
    const r = act.realtime;
    setOpsRtHistory((prev) =>
      [...prev, { t: Date.now(), clicks: r.clicksLast5m, online: act.activeVisitors, conv: r.conversionsLast5m }].slice(-120),
    );
  }, [active, opsRtPollSignature]);

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

  const chart = useAffiliateChart({ range, type: "traffic", enabled: active === "traffic" });
  const topProducts = useAffiliateTopProducts({
    range,
    enabled: active === "top",
    sort: productSort,
    filterQs: active === "top" ? filterQs : "",
  });
  const topPages = useAffiliateTopPages({
    range,
    enabled: active === "traffic",
  });
  const funnel = useAffiliateFunnel({
    range,
    enabled: active === "traffic",
  });

  const creatorSources = useAffiliateTrafficSources({ range, enabled: active === "overview", filterQs: "", live: false });
  const creatorCampaigns = useAffiliateCampaignList({
    range,
    enabled: active === "overview" && overviewCampaignsIdleReady,
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
      <AccountPageTabPanel
        id="affiliate-analytics"
        title="Bảng số CTV"
        headingLevel="h1"
        description={
          <>
            Theo dõi hiệu quả theo thời gian thực. Mã ref{" "}
            <span className="rounded-md bg-[#F1F5F9] px-1.5 py-0.5 font-mono text-[13px] font-semibold text-[#1E293B]">
              {affiliateRefCode}
            </span>
          </>
        }
        icon={<BarChart3 className="h-5 w-5" strokeWidth={1.75} aria-hidden />}
        contentClassName="flex min-w-0 max-w-full flex-col max-lg:flex-1 max-lg:min-h-0 lg:h-auto lg:flex-none lg:grow-0"
        toolbar={
          <>
            <label className="sr-only" htmlFor="affiliate-analytics-range">
              Chọn khoảng thời gian
            </label>
            <select
              id="affiliate-analytics-range"
              name="range"
              value={range}
              onChange={(e) => setRange(e.target.value as RangeKey)}
              className={ACCOUNT_PAGE_HEADER_SELECT}
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
                "inline-flex h-10 min-h-10 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold tabular-nums transition-colors",
                realtimePanelLoading
                  ? clsx(CTV_COLOR_ACCENT_BORDER, "border-blue-100/90", CTV_COLOR_ACCENT_SURFACE, "bg-blue-50/50 text-[#64748B]")
                  : sseLive
                    ? "border-emerald-300/80 bg-emerald-50/95 text-emerald-900"
                    : realtimePanelRefreshing
                      ? "border-[#93C5FD]/70 bg-blue-100/60 text-[#1D4ED8] motion-safe:animate-pulse"
                      : clsx("border-[#BFDBFE]/90", CTV_COLOR_ACCENT_SURFACE, "bg-blue-50/90 text-[#1D4ED8]"),
              )}
            >
              <Zap className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
              {realtimeStatusLabel}
            </span>
          </>
        }
      >
              <nav
                aria-label="Mục analytics"
                className={clsx(
                  "sticky top-0 z-10 w-full min-w-0 max-w-full shrink-0 py-3 lg:static lg:z-0 lg:border-0 lg:bg-transparent lg:py-0 lg:backdrop-blur-none",
                  CTV_DASHBOARD_HEADER_STICKY,
                )}
              >
                <div
                  ref={analyticsTabScrollRef}
                  role="tablist"
                  aria-label="Chức năng analytics"
                  className={CTV_ANALYTICS_TAB_SCROLL}
                >
                  {menu.map((m) => (
                    <button
                      key={m.key}
                      type="button"
                      data-analytics-tab={m.key}
                      role="tab"
                      aria-selected={active === m.key}
                      onClick={() => setActive(m.key)}
                      className={
                        active === m.key
                          ? clsx(CTV_SEGMENTED_ITEM, CTV_SEGMENTED_ITEM_ACTIVE)
                          : clsx(CTV_SEGMENTED_ITEM, CTV_TAB_IDLE_HOVER)
                      }
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </nav>

              <div className={CTV_ANALYTICS_TAB_CONTENT} role="tabpanel" aria-label="Nội dung tab analytics">

              {active === "overview" ? (
                <div className={CTV_ANALYTICS_OVERVIEW_STACK}>
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
                    rtHistory={opsRtHistory}
                  />

                  <div className="grid w-full min-w-0 auto-rows-fr items-stretch grid-cols-2 gap-2.5 max-md:gap-2.5 sm:gap-3.5 md:grid-cols-[repeat(auto-fit,minmax(15rem,1fr))] lg:auto-rows-auto lg:items-start lg:gap-4 [&>*]:min-h-0 [&>*]:min-w-0">
            <CreatorMetricCard
              icon={MousePointer2}
              label={clickLabelForAnalyticsRange(range)}
              labelTitle={CTV_ANALYTICS_CLICK_PERIOD_HINT}
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
              label={conversionLabelForAnalyticsRange(range)}
              labelTitle={CTV_CONVERSION_FORMULA_HINT}
              value={fmtPct(ov?.conversionRate ?? 0)}
              loading={overview.loading && !overview.data}
              tone="emerald"
              trendPct={ovTrends.conv ?? null}
            />
            <CreatorMetricCard
              icon={ShoppingBag}
              label={orderLabelForAnalyticsRange(range)}
              labelTitle={CTV_ANALYTICS_ORDER_PERIOD_HINT}
              value={`${ov?.orders ?? 0}`}
              loading={overview.loading && !overview.data}
            />
            <CreatorMetricCard
              icon={CreditCard}
              label={paidOrderLabelForAnalyticsRange(range)}
              labelTitle={CTV_PAID_ORDER_KPI_HINT}
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

                  <AffiliateAnalyticsOverviewSection
                    range={range}
                    tabEnabled={active === "overview"}
                    dailyTrafficEnabled={overviewHeavyReady && overviewHeavyPhase >= 1}
                    funnelEnabled={overviewHeavyReady && overviewHeavyPhase >= 2}
                    topProductsEnabled={overviewHeavyReady && overviewHeavyPhase >= 3}
                    sharedOverview={overview}
                    sharedSources={creatorSources}
                  />

                </div>
              ) : null}

              {active === "traffic" ? (
                <div className="flex w-full flex-col gap-5 sm:gap-6 lg:gap-7">
                  <div className={CTV_TRAFFIC_TAB_PAIR_ROW}>
            <CreatorSectionShell
              className={clsx(CTV_TRAFFIC_TAB_SHELL, CTV_TRAFFIC_TAB_CHART_COL)}
              bodyClassName={CTV_TRAFFIC_TAB_SHELL_BODY}
              title="Biểu đồ traffic / conversions"
              hint="Gọn trên mobile, tự làm mềm khi đang tải lại."
            >
              {chart.loading && !chart.data ? (
                <div className={clsx(CTV_TRAFFIC_TAB_BODY, CTV_TRAFFIC_TAB_BODY_CENTER)}>
                  <Skeleton className={clsx(CTV_TRAFFIC_TAB_LOADING_FILL, "bg-slate-100/90")} />
                </div>
              ) : !chartHasTraffic ? (
                <div className={clsx(CTV_TRAFFIC_TAB_BODY, CTV_TRAFFIC_TAB_BODY_CENTER)}>
                  <CreatorEmptyState
                    icon={BarChart3}
                    className={CTV_TRAFFIC_TAB_EMPTY_STATE}
                    title="Chưa có traffic trong kỳ"
                    hint="Thử đổi khoảng thời gian hoặc tăng chia sẻ link — dữ liệu sẽ tự cập nhật khi có sự kiện."
                  />
                </div>
              ) : (
                <div
                  className={clsx(
                    CTV_TRAFFIC_TAB_BODY,
                    CTV_TRAFFIC_TAB_BODY_FILL,
                    "transition-opacity duration-300",
                    chart.refreshing ? "opacity-75" : "opacity-100",
                  )}
                >
                  <div className={CTV_TRAFFIC_TAB_CHART_BOX}>
                    <AnalyticsErrorBoundary title="Biểu đồ traffic lỗi.">
                      <AffiliateAnalyticsBarChartLazy buckets={buckets} size="tall" />
                    </AnalyticsErrorBoundary>
                  </div>
                </div>
              )}
            </CreatorSectionShell>

            <CreatorSectionShell
              className={clsx(CTV_TRAFFIC_TAB_SHELL, CTV_TRAFFIC_TAB_LANDING_COL)}
              bodyClassName={CTV_TRAFFIC_TAB_SHELL_BODY}
              title="Top landing pages"
              hint="Theo visits trong kỳ"
            >
              {topPages.loading && !topPages.data ? (
                <div className={clsx(CTV_TRAFFIC_TAB_BODY, CTV_TRAFFIC_TAB_BODY_CENTER)}>
                  <Skeleton className={clsx(CTV_TRAFFIC_TAB_LOADING_FILL, "bg-slate-100/90")} />
                </div>
              ) : topPages.data?.rows?.length ? (
                <div className={clsx(CTV_TRAFFIC_TAB_BODY, CTV_TRAFFIC_TAB_BODY_FILL)}>
                  <div className={clsx(CTV_TRAFFIC_TAB_MOBILE_LIST, "max-lg:flex lg:hidden")}>
                    {topPages.data.rows.slice(0, 10).map((r) => (
                      <div
                        key={r.pathname}
                        className={clsx("rounded-xl border bg-white/90 p-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]", CTV_COLOR_BORDER_STRONG)}
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
                  <div className={clsx(CTV_TRAFFIC_TAB_TABLE_AREA, "max-lg:hidden")}>
                    <div className={CTV_TRAFFIC_TAB_TABLE_SCROLL}>
                      <table className="h-full w-full min-w-0 table-fixed text-left text-[11px] lg:text-xs">
                        <thead className={clsx(CTV_COLOR_SURFACE_TABLE_HEAD, "sticky top-0 z-[1] text-[10px] font-semibold uppercase tracking-wide text-[#64748B] lg:text-[11px]")}>
                          <tr>
                            <th className={clsx(CTV_TRAFFIC_TAB_TABLE_COL_LANDING, CTV_TRAFFIC_TAB_TABLE_TH, "pr-1 text-left")}>
                              Landing page
                            </th>
                            <th className={clsx(CTV_TRAFFIC_TAB_TABLE_COL_METRIC, CTV_TRAFFIC_TAB_TABLE_TH, "text-right")}>Visits</th>
                            <th className={clsx(CTV_TRAFFIC_TAB_TABLE_COL_METRIC, CTV_TRAFFIC_TAB_TABLE_TH, "text-right")}>
                              Conversions
                            </th>
                            <th className={clsx(CTV_TRAFFIC_TAB_TABLE_COL_METRIC, CTV_TRAFFIC_TAB_TABLE_TH, "text-right")}>CR%</th>
                            <th className={clsx(CTV_TRAFFIC_TAB_TABLE_COL_METRIC, CTV_TRAFFIC_TAB_TABLE_TH, "text-right")}>EPC</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#F1F5F9]">
                          {topPages.data.rows.slice(0, 10).map((r) => (
                            <tr key={r.pathname} className={clsx("bg-white", CTV_COLOR_SURFACE_ROW_HOVER)}>
                              <td
                                className={clsx(CTV_TRAFFIC_TAB_TABLE_COL_LANDING, CTV_TRAFFIC_TAB_TABLE_TD, "truncate pr-1 font-medium text-[#0F172A]")}
                                title={r.pathname}
                              >
                                {r.pathname}
                              </td>
                              <td className={clsx(CTV_TRAFFIC_TAB_TABLE_COL_METRIC, CTV_TRAFFIC_TAB_TABLE_TD, "text-right tabular-nums text-[#1E293B]")}>
                                {r.visits}
                              </td>
                              <td className={clsx(CTV_TRAFFIC_TAB_TABLE_COL_METRIC, CTV_TRAFFIC_TAB_TABLE_TD, "text-right tabular-nums text-[#1E293B]")}>
                                {r.paidOrders}
                              </td>
                              <td className={clsx(CTV_TRAFFIC_TAB_TABLE_COL_METRIC, CTV_TRAFFIC_TAB_TABLE_TD, "text-right tabular-nums text-emerald-700")}>
                                {fmtPct(r.conversionRate)}
                              </td>
                              <td className={clsx(CTV_TRAFFIC_TAB_TABLE_COL_METRIC, CTV_TRAFFIC_TAB_TABLE_TD, "text-right tabular-nums text-[#1E293B]")}>
                                {r.visits > 0 ? fmtVnd(r.revenue / r.visits) : "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className={clsx(CTV_TRAFFIC_TAB_BODY, CTV_TRAFFIC_TAB_BODY_CENTER)}>
                  <CreatorEmptyState
                    icon={BarChart3}
                    className={CTV_TRAFFIC_TAB_EMPTY_STATE}
                    title="Chưa có dữ liệu pages"
                    hint="Chia sẻ link ref và quay lại sau khi có visits — danh sách landing sẽ tự điền."
                  />
                </div>
              )}
            </CreatorSectionShell>
                  </div>
                  <CreatorSectionShell className="mt-1 lg:mt-0" title="Funnel chi tiết" hint="Từ click đến thanh toán (mobile-friendly)">
                    <div className="mt-4 min-h-[12rem] max-lg:min-h-[12rem] lg:min-h-0">
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
                        id="affiliate-analytics-traffic-source"
                        name="trafficSource"
                        value={trafficFilters.source}
                        onChange={(e) => setTrafficFilters((f) => ({ ...f, source: e.target.value }))}
                        className={clsx(
                          CTV_V2_SELECT,
                          "w-full border bg-white px-4 font-medium text-[#0F172A] shadow-[0_1px_2px_rgba(15,23,42,0.04)] focus-visible:ring-2 focus-visible:ring-[#0F172A]/10",
                          CTV_COLOR_BORDER,
                        )}
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
                        id="affiliate-analytics-traffic-device"
                        name="trafficDevice"
                        value={trafficFilters.device}
                        onChange={(e) => setTrafficFilters((f) => ({ ...f, device: e.target.value }))}
                        className={clsx(
                          CTV_V2_SELECT,
                          "w-full border bg-white px-4 font-medium text-[#0F172A] shadow-[0_1px_2px_rgba(15,23,42,0.04)] focus-visible:ring-2 focus-visible:ring-[#0F172A]/10",
                          CTV_COLOR_BORDER,
                        )}
                      >
                        <option value="ALL">Thiết bị: tất cả</option>
                        <option value="mobile">Mobile</option>
                        <option value="desktop">Desktop</option>
                        <option value="tablet">Tablet</option>
                      </select>
                      <select
                        id="affiliate-analytics-product-sort"
                        name="productSort"
                        value={productSort}
                        onChange={(e) => setProductSort(e.target.value as typeof productSort)}
                        className={clsx(
                          CTV_V2_SELECT,
                          "w-full border bg-white px-4 font-medium text-[#0F172A] shadow-[0_1px_2px_rgba(15,23,42,0.04)] focus-visible:ring-2 focus-visible:ring-[#0F172A]/10",
                          CTV_COLOR_BORDER,
                        )}
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

                  <CreatorSectionShell className="flex flex-col max-lg:flex-1" title="Top sản phẩm" hint="Theo bộ lọc và khoảng thời gian">
                    {topProducts.loading && !topProducts.data ? (
                      <Skeleton className="mt-4 h-72 w-full rounded-xl" />
                    ) : topProducts.data?.rows?.length ? (
                      <div className="mt-4 overflow-x-auto rounded-xl border border-[#F1F5F9]">
                        <table className="w-full min-w-[820px] text-left text-sm">
                          <thead className={clsx(CTV_COLOR_SURFACE_TABLE_HEAD, "text-[11px] font-semibold uppercase tracking-wide text-[#64748B]")}>
                            <tr>
                              <th className="px-3 py-2.5 pr-3">Sản phẩm</th>
                              <th className="px-3 py-2.5 pr-3">Click</th>
                              <th className="px-3 py-2.5 pr-3">Visitor</th>
                              <th className="px-3 py-2.5 pr-3" title={CTV_PAID_ORDER_KPI_HINT}>
                                {paidOrderLabelForAnalyticsRange(range)}
                              </th>
                              <th className="px-3 py-2.5 pr-3">Conv</th>
                              <th className="px-3 py-2.5 pr-3">Doanh thu</th>
                              <th className="px-3 py-2.5">Commission</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#F1F5F9]">
                            {topProducts.data.rows.map((r) => (
                              <tr key={r.productId} className={clsx("bg-white", CTV_COLOR_SURFACE_ROW_HOVER)}>
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
                      <div className="mt-4 flex max-lg:min-h-[min(36dvh,20rem)] max-lg:flex-1 flex-col justify-center">
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
                <AffiliateTrackingWorkspace />
              ) : null}
              </div>
      </AccountPageTabPanel>
    </AnalyticsErrorBoundary>
  );
}

