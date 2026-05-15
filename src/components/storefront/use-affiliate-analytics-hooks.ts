"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDocumentVisibility } from "@/hooks/use-document-visibility";
import {
  affiliateCreatorPollIntervalMs,
  devManualRefetchDebounceMs,
  devStabilityLog,
  devVisibilityResumeDelayMs,
} from "@/lib/next-dev-stability";

export type RangeKey = "today" | "7d" | "30d" | "month";
export type ChartType = "traffic" | "conversions" | "commission" | "revenue";

function useFetchJson<T>(args: {
  key: string;
  enabled: boolean;
  pollActive: boolean;
  url: string;
  /** Tránh re-render khi JSON không đổi (realtime / overview). */
  compareJsonStable?: boolean;
}): {
  loading: boolean;
  refreshing: boolean;
  data: T | null;
  error: string | null;
  refetch: () => void;
} {
  const [tick, setTick] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const visible = useDocumentVisibility();
  const dataRef = useRef<T | null>(null);

  const pollMs = affiliateCreatorPollIntervalMs(visible, args.pollActive);
  const inFlightRef = useRef<AbortController | null>(null);
  const lastKeyRef = useRef<string>("");
  const refetchTimeoutRef = useRef<number | null>(null);
  const tabWasHiddenRef = useRef(false);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const debounceMs = devManualRefetchDebounceMs();
  const refetch = useCallback(() => {
    if (refetchTimeoutRef.current) window.clearTimeout(refetchTimeoutRef.current);
    refetchTimeoutRef.current = window.setTimeout(() => {
      refetchTimeoutRef.current = null;
      setTick((n) => n + 1);
    }, debounceMs);
  }, [debounceMs]);

  useEffect(
    () => () => {
      if (refetchTimeoutRef.current) {
        window.clearTimeout(refetchTimeoutRef.current);
        refetchTimeoutRef.current = null;
        devStabilityLog("[PollingCleanup]", "cleared pending affiliate refetch debounce", { key: args.key });
      }
    },
    [args.key],
  );

  useEffect(() => {
    if (!args.enabled) return;
    if (!visible) {
      tabWasHiddenRef.current = true;
      return;
    }
    if (!tabWasHiddenRef.current) return;
    tabWasHiddenRef.current = false;
    const delay = devVisibilityResumeDelayMs();
    const t = window.setTimeout(() => {
      setTick((n) => n + 1);
      devStabilityLog("[NextDevStability]", "affiliate poll resume after tab visible", { key: args.key, delayMs: delay });
    }, delay);
    return () => window.clearTimeout(t);
  }, [visible, args.enabled, args.key]);

  useEffect(() => {
    if (!args.enabled) return;
    if (!pollMs) return;
    const id = window.setInterval(() => setTick((n) => n + 1), pollMs);
    devStabilityLog("[HotReloadSafe]", "affiliate poll interval start", { key: args.key, pollMs });
    return () => {
      window.clearInterval(id);
      devStabilityLog("[PollingCleanup]", "affiliate poll interval cleared", { key: args.key });
    };
  }, [args.enabled, pollMs, args.key]);

  useEffect(() => {
    if (!args.enabled) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    const reqKey = `${args.key}:${args.url}:${tick}`;
    lastKeyRef.current = reqKey;

    const ctrl = new AbortController();
    inFlightRef.current = ctrl;

    const hadData = dataRef.current != null;
    if (hadData) setRefreshing(true);
    else setLoading(true);

    void (async () => {
      try {
        const res = await fetch(args.url, { credentials: "same-origin", cache: "no-store", signal: ctrl.signal });
        const json = (await res.json()) as { ok?: boolean; message?: string } & T;
        if (!res.ok || json.ok === false) throw new Error(json.message || "Không tải được dữ liệu.");
        if (ctrl.signal.aborted) return;
        if (lastKeyRef.current !== reqKey) return;
        const next = json as unknown as T;
        if (args.compareJsonStable && hadData) {
          try {
            if (JSON.stringify(dataRef.current) === JSON.stringify(next)) {
              setError(null);
              return;
            }
          } catch {
            /* ignore compare errors */
          }
        }
        setData(next);
        setError(null);
      } catch (e) {
        if (ctrl.signal.aborted) return;
        if (lastKeyRef.current !== reqKey) return;
        if (!hadData) {
          setData(null);
        }
        setError(e instanceof Error ? e.message : "Không tải được dữ liệu.");
      } finally {
        if (!ctrl.signal.aborted && lastKeyRef.current === reqKey) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    })();

    return () => {
      ctrl.abort();
      if (inFlightRef.current === ctrl) inFlightRef.current = null;
    };
  }, [args.enabled, args.key, args.url, tick, args.compareJsonStable]);

  return { loading, refreshing, data, error, refetch };
}

/** Dữ liệu hoạt động realtime (đồng bộ với `/analytics/realtime`, bundle trong overview). */
export type AffiliateRealtimeActivityClient = {
  ok: true;
  activeVisitors: number;
  realtime: {
    onlineVisitors: number;
    activeSessions: number;
    clicksLast5m: number;
    conversionsLast5m: number;
    revenueLast5m: number;
  };
  recentClicks: Array<{
    id: string;
    createdAt: string;
    pathname: string | null;
    trafficSource?: string;
    referrer?: string | null;
    device?: string | null;
  }>;
  recentConversions: Array<{ id: string; createdAt: string; orderId: string | null; revenue: number; commission: number }>;
  recentOrders: Array<{
    id: string;
    code: string;
    createdAt: string;
    totalAmount: number;
    paymentStatus: string;
    orderStatus: string;
  }>;
};

export function useAffiliateAnalyticsOverview(args: { range: RangeKey; enabled: boolean }) {
  const url = useMemo(() => `/api/account/affiliate/analytics/overview?range=${encodeURIComponent(args.range)}`, [args.range]);
  return useFetchJson<{
    ok: true;
    overview: {
      totalClicks: number;
      uniqueVisitors: number;
      sessions: number;
      orders: number;
      paidOrders: number;
      cancelledOrders: number;
      conversionRate: number;
      totalRevenue: number;
      totalCommission: number;
      pendingCommission: number;
      approvedCommission: number;
      EPC: number;
      RPM: number;
      AOV: number;
      returningVisitors: number;
    };
    realtime: {
      onlineVisitors: number;
      activeSessions: number;
      clicksLast5m: number;
      conversionsLast5m: number;
      revenueLast5m: number;
    };
    realtimeActivity?: AffiliateRealtimeActivityClient;
  }>({ key: "overview", enabled: args.enabled, pollActive: true, url, compareJsonStable: true });
}

export function useAffiliateRealtime(args: {
  enabled: boolean;
  pollActive?: boolean;
  /** When SSE is healthy, skip polling this endpoint (fallback hook only). */
  sseSuppressPoll?: boolean;
}) {
  const url = "/api/account/affiliate/analytics/realtime";
  const poll = args.pollActive !== false && args.enabled && args.sseSuppressPoll !== true;
  return useFetchJson<{
    ok: true;
    activeVisitors: number;
    realtime: { onlineVisitors: number; activeSessions: number; clicksLast5m: number; conversionsLast5m: number; revenueLast5m: number };
    recentClicks: Array<{
      id: string;
      createdAt: string;
      pathname: string | null;
      trafficSource?: string;
      referrer?: string | null;
      device?: string | null;
    }>;
    recentConversions: Array<{ id: string; createdAt: string; orderId: string | null; revenue: number; commission: number }>;
    recentOrders: Array<{ id: string; code: string; createdAt: string; totalAmount: number; paymentStatus: string; orderStatus: string }>;
  }>({ key: "realtime", enabled: args.enabled, pollActive: poll, url, compareJsonStable: true });
}

export function useAffiliateChart(args: { range: RangeKey; type: ChartType; enabled: boolean }) {
  const url = useMemo(
    () => `/api/account/affiliate/analytics/chart?range=${encodeURIComponent(args.range)}&type=${encodeURIComponent(args.type)}`,
    [args.range, args.type],
  );
  return useFetchJson<{
    ok: true;
    labels: string[];
    totals: { clicks: number; orders: number; revenue: number; commission: number };
    buckets: Array<{ label: string; clicks: number; orders: number; revenue: number; commission: number }>;
  }>({ key: `chart:${args.type}`, enabled: args.enabled, pollActive: false, url, compareJsonStable: true });
}

export type AffiliateAnalyticsFilters = {
  source: string;
  device: string;
  pathname: string;
  productId: string;
};

export function affiliateAnalyticsFiltersToSearchParams(f: AffiliateAnalyticsFilters): string {
  const p = new URLSearchParams();
  if (f.source && f.source !== "ALL") p.set("source", f.source);
  if (f.device && f.device !== "ALL") p.set("device", f.device);
  const path = f.pathname.trim().slice(0, 200);
  if (path) p.set("pathname", path);
  const pid = f.productId.trim();
  if (pid.length >= 16) p.set("productId", pid.slice(0, 40));
  return p.toString();
}

export function useAffiliateTopProducts(args: { range: RangeKey; enabled: boolean; sort?: string; filterQs?: string }) {
  const sort = args.sort ?? "clicks";
  const fq = args.filterQs ?? "";
  const url = useMemo(
    () =>
      `/api/account/affiliate/analytics/top-products?range=${encodeURIComponent(args.range)}&take=24&sort=${encodeURIComponent(sort)}${fq ? `&${fq}` : ""}`,
    [args.range, sort, fq],
  );
  return useFetchJson<{
    ok: true;
    rows: Array<{
      productId: string;
      productName: string;
      imageUrl?: string | null;
      clicks: number;
      visitors?: number;
      paidOrders: number;
      revenue: number;
      commission: number;
      conversionRate: number;
    }>;
  }>({ key: `top-products:${sort}:${fq}`, enabled: args.enabled, pollActive: false, url });
}

export function useAffiliateTopLinks(args: { range: RangeKey; enabled: boolean; filterQs: string; page?: number }) {
  const page = args.page ?? 1;
  const url = useMemo(
    () =>
      `/api/account/affiliate/analytics/top-links?range=${encodeURIComponent(args.range)}&take=20&page=${page}${args.filterQs ? `&${args.filterQs}` : ""}`,
    [args.range, args.filterQs, page],
  );
  return useFetchJson<{
    ok: true;
    rows: Array<{
      pathname: string;
      clicks: number;
      visitors: number;
      orders: number;
      revenue: number;
      commission: number;
      conversionRate: number;
    }>;
  }>({ key: `top-links:${args.filterQs}:${page}`, enabled: args.enabled, pollActive: false, url });
}

export function useAffiliateTrafficSources(args: {
  range: RangeKey;
  enabled: boolean;
  filterQs: string;
  /** `false` = poll chậm (dùng trên overview cùng lúc nhiều biểu đồ). Mặc định true. */
  live?: boolean;
}) {
  const url = useMemo(
    () => `/api/account/affiliate/analytics/sources?range=${encodeURIComponent(args.range)}${args.filterQs ? `&${args.filterQs}` : ""}`,
    [args.range, args.filterQs],
  );
  const pollActive = (args.live !== false) && args.enabled;
  return useFetchJson<{
    ok: true;
    rows: Array<{
      source: string;
      clicks: number;
      visitors: number;
      orders: number;
      revenue: number;
      commission: number;
      conversionRate: number;
    }>;
  }>({ key: `sources:${args.filterQs}`, enabled: args.enabled, pollActive, url });
}

export function useAffiliateDeviceAnalytics(args: {
  range: RangeKey;
  enabled: boolean;
  filterQs: string;
  live?: boolean;
}) {
  const url = useMemo(
    () => `/api/account/affiliate/analytics/devices?range=${encodeURIComponent(args.range)}${args.filterQs ? `&${args.filterQs}` : ""}`,
    [args.range, args.filterQs],
  );
  const pollActive = (args.live !== false) && args.enabled;
  return useFetchJson<{
    ok: true;
    rows: Array<{ device: string; visitors: number; orders: number; clicks: number; conversionRate: number }>;
  }>({ key: `devices:${args.filterQs}`, enabled: args.enabled, pollActive, url });
}

export function useAffiliateLandingAnalytics(args: {
  range: RangeKey;
  enabled: boolean;
  filterQs: string;
  page?: number;
  live?: boolean;
}) {
  const page = args.page ?? 1;
  const url = useMemo(
    () =>
      `/api/account/affiliate/analytics/landing?range=${encodeURIComponent(args.range)}&take=20&page=${page}${args.filterQs ? `&${args.filterQs}` : ""}`,
    [args.range, args.filterQs, page],
  );
  const pollActive = (args.live !== false) && args.enabled;
  return useFetchJson<{
    ok: true;
    rows: Array<{
      pathname: string;
      visits: number;
      clicks: number;
      orders: number;
      revenue: number;
      commission: number;
      conversionRate: number;
    }>;
  }>({ key: `landing:${args.filterQs}:${page}`, enabled: args.enabled, pollActive, url });
}

export function useAffiliateConversionTimeline(args: {
  range: RangeKey;
  enabled: boolean;
  filterQs: string;
  live?: boolean;
}) {
  const url = useMemo(
    () => `/api/account/affiliate/analytics/timeline?range=${encodeURIComponent(args.range)}${args.filterQs ? `&${args.filterQs}` : ""}`,
    [args.range, args.filterQs],
  );
  const pollActive = (args.live !== false) && args.enabled;
  return useFetchJson<{
    ok: true;
    buckets: Array<{
      label: string;
      clicks: number;
      orders: number;
      revenue: number;
      commission: number;
      conversionRate: number;
    }>;
  }>({ key: `timeline:${args.filterQs}`, enabled: args.enabled, pollActive, url });
}

export function useAffiliateTopPages(args: { range: RangeKey; enabled: boolean }) {
  const url = useMemo(() => `/api/account/affiliate/analytics/top-pages?range=${encodeURIComponent(args.range)}&take=20`, [args.range]);
  return useFetchJson<{
    ok: true;
    rows: Array<{ pathname: string; visits: number; paidOrders: number; revenue: number; conversionRate: number; bounceProxy: number; avgSessionProxySec: number }>;
  }>({ key: "top-pages", enabled: args.enabled, pollActive: false, url });
}

export function useAffiliateFunnel(args: { range: RangeKey; enabled: boolean; campaignId?: string | null }) {
  const url = useMemo(() => {
    const base = `/api/account/affiliate/analytics/funnel?range=${encodeURIComponent(args.range)}`;
    if (args.campaignId?.trim()) return `${base}&campaignId=${encodeURIComponent(args.campaignId.trim())}`;
    return base;
  }, [args.range, args.campaignId]);
  return useFetchJson<{
    ok: true;
    scope?: "profile" | "campaign";
    steps: Array<{ step: string; count: number; dropoff: number; conversionPct: number }>;
  }>({ key: `funnel:${args.campaignId ?? "all"}`, enabled: args.enabled, pollActive: args.enabled, url });
}

export function useAffiliateCampaignList(args: { range: RangeKey; enabled: boolean }) {
  const url = useMemo(
    () => `/api/account/affiliate/campaigns?range=${encodeURIComponent(args.range)}`,
    [args.range],
  );
  return useFetchJson<{
    ok: true;
    range: RangeKey;
    origin: string;
    campaigns: Array<{
      id: string;
      name: string;
      source: string | null;
      subId: string | null;
      note: string | null;
      isActive: boolean;
      archived: boolean;
      linkCount: number;
      createdAt: string;
      stats: { clicks: number; visitors: number; orders: number; conversion: number; revenue: number; commission: number; epc: number };
    }>;
  }>({ key: `campaigns:${args.range}`, enabled: args.enabled, pollActive: false, url });
}

export function useAffiliateCampaignAnalytics(args: { campaignId: string | null; range: RangeKey; enabled: boolean }) {
  const url = useMemo(() => {
    if (!args.campaignId) return "";
    return `/api/account/affiliate/campaigns/${encodeURIComponent(args.campaignId)}/analytics?range=${encodeURIComponent(args.range)}`;
  }, [args.campaignId, args.range]);
  return useFetchJson<{
    ok: true;
    range: RangeKey;
    campaignId: string;
    name: string;
    origin: string;
    summary: { clicks: number; visitors: number; orders: number; conversion: number; revenue: number; commission: number; epc: number };
    timeline: Array<{ label: string; clicks: number; orders: number; revenue: number; commission: number; conversionRate: number }>;
    conversionTrend: Array<{ label: string; conversionRate: number; clicks: number; orders: number }>;
    funnel: { steps: Array<{ step: string; count: number; dropoff: number; conversionPct: number }> };
    trackingLinks: Array<{
      id: string;
      slug: string | null;
      shortUrl: string | null;
      label: string | null;
      targetPathname: string;
      utmSource: string | null;
      subid: string | null;
      isActive: boolean;
      createdAt: string;
    }>;
  }>({ key: `campan:${args.campaignId}:${args.range}`, enabled: Boolean(args.campaignId) && args.enabled, pollActive: false, url });
}

export function useAffiliateLandingGrowth(args: { range: RangeKey; enabled: boolean }) {
  const url = useMemo(
    () => `/api/account/affiliate/analytics/landing-growth?range=${encodeURIComponent(args.range)}`,
    [args.range],
  );
  return useFetchJson<{
    ok: true;
    rows: Array<{
      pathname: string;
      visits: number;
      clicks: number;
      orders: number;
      revenue: number;
      commission: number;
      conversionRate: number;
      epc: number;
      topSource: string | null;
    }>;
  }>({ key: `landgrow:${args.range}`, enabled: args.enabled, pollActive: false, url });
}

export function useAffiliateGrowthInsightsPack(args: { range: RangeKey; enabled: boolean }) {
  const url = useMemo(
    () => `/api/account/affiliate/growth-insights?range=${encodeURIComponent(args.range)}`,
    [args.range],
  );
  return useFetchJson<{
    ok: true;
    insights: {
      bestSource: string | null;
      bestCampaign: { id: string; name: string; commission: number } | null;
      bestLanding: { pathname: string; epc: number; topSource: string | null } | null;
      strongestHourLabel: string | null;
      trendingProductName: string | null;
    };
  }>({ key: `growins:${args.range}`, enabled: args.enabled, pollActive: false, url });
}

export function useAffiliateAssetsLibrary(args: { enabled: boolean }) {
  const url = "/api/account/affiliate/assets-library";
  return useFetchJson<{
    ok: true;
    items: Array<{
      id: string;
      kind: string;
      title: string;
      url: string;
      previewUrl: string;
      linkHref: string | null;
    }>;
  }>({ key: "aff-assets", enabled: args.enabled, pollActive: false, url });
}

