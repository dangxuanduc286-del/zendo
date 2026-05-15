"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDocumentVisibility } from "@/hooks/use-document-visibility";
import {
  adminAffiliateHealthIntervalMs,
  adminAffiliatePollIntervalMs,
  devManualRefetchDebounceMs,
  devStabilityLog,
  devVisibilityResumeDelayMs,
} from "@/lib/next-dev-stability";

export type AdminAffiliateAnalyticsHealthPayload = {
  latestTrafficEventAt: string | null;
  latestDailyAggregateAt: string | null;
  realtimeSessionsActive5m: number;
  hourlyAggregateRows: number;
  dailyAggregateRows: number;
  jobHint: string;
};

export type AdminRangeKey = "today" | "7d" | "30d" | "month";

function useAdminFetchJson<T>(args: {
  key: string;
  enabled: boolean;
  pollActive: boolean;
  url: string;
}): { loading: boolean; data: T | null; error: string | null; refetch: () => void } {
  const [tick, setTick] = useState(0);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const visible = useDocumentVisibility();
  const pollMs = adminAffiliatePollIntervalMs(visible, args.pollActive);
  const inFlightRef = useRef<AbortController | null>(null);
  const lastKeyRef = useRef<string>("");
  const refetchTimeoutRef = useRef<number | null>(null);
  const tabWasHiddenRef = useRef(false);

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
        devStabilityLog("[PollingCleanup]", "cleared pending admin affiliate refetch debounce", { key: args.key });
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
      devStabilityLog("[NextDevStability]", "admin affiliate poll resume after tab visible", { key: args.key, delayMs: delay });
    }, delay);
    return () => window.clearTimeout(t);
  }, [visible, args.enabled, args.key]);

  useEffect(() => {
    if (!args.enabled) return;
    if (!pollMs) return;
    const id = window.setInterval(() => setTick((n) => n + 1), pollMs);
    devStabilityLog("[HotReloadSafe]", "admin affiliate poll interval start", { key: args.key, pollMs });
    return () => {
      window.clearInterval(id);
      devStabilityLog("[PollingCleanup]", "admin affiliate poll interval cleared", { key: args.key });
    };
  }, [args.enabled, pollMs, args.key]);

  useEffect(() => {
    if (!args.enabled) return;
    const reqKey = `${args.key}:${args.url}:${tick}`;
    lastKeyRef.current = reqKey;

    if (inFlightRef.current) {
      inFlightRef.current.abort();
      inFlightRef.current = null;
    }

    const ctrl = new AbortController();
    inFlightRef.current = ctrl;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const res = await fetch(args.url, { credentials: "same-origin", cache: "no-store", signal: ctrl.signal });
        const json = (await res.json()) as { ok?: boolean; message?: string } & T;
        if (!res.ok || json.ok === false) throw new Error(json.message || "Không tải được dữ liệu.");
        if (ctrl.signal.aborted) return;
        if (lastKeyRef.current !== reqKey) return;
        setData(json as unknown as T);
        setError(null);
      } catch (e) {
        if (ctrl.signal.aborted) return;
        if (lastKeyRef.current !== reqKey) return;
        setData(null);
        setError(e instanceof Error ? e.message : "Không tải được dữ liệu.");
      } finally {
        if (!ctrl.signal.aborted && lastKeyRef.current === reqKey) setLoading(false);
      }
    })();

    return () => {
      ctrl.abort();
      if (inFlightRef.current === ctrl) inFlightRef.current = null;
    };
  }, [args.enabled, args.key, args.url, tick]);

  return { loading, data, error, refetch };
}

export function useAdminAffiliateHealth(args: { enabled: boolean }) {
  const visible = useDocumentVisibility();
  const r = useAdminFetchJson<{ ok: true; health: AdminAffiliateAnalyticsHealthPayload }>({
    key: "admin-aff-health",
    enabled: args.enabled,
    pollActive: false,
    url: "/api/admin/affiliate-analytics/health",
  });
  const refetchRef = useRef(r.refetch);
  refetchRef.current = r.refetch;
  const healthPollMs = adminAffiliateHealthIntervalMs(visible);
  useEffect(() => {
    if (!args.enabled) return;
    if (!healthPollMs) return;
    const id = window.setInterval(() => refetchRef.current(), healthPollMs);
    devStabilityLog("[HotReloadSafe]", "admin affiliate health interval start", { pollMs: healthPollMs });
    return () => {
      window.clearInterval(id);
      devStabilityLog("[PollingCleanup]", "admin affiliate health interval cleared", {});
    };
  }, [args.enabled, healthPollMs]);
  return r;
}

export function useAdminAffiliateOverview(args: { range: AdminRangeKey; enabled: boolean }) {
  const url = useMemo(
    () => `/api/admin/affiliate-analytics/overview?range=${encodeURIComponent(args.range)}`,
    [args.range],
  );
  return useAdminFetchJson<{
    ok: true;
    overview: Record<string, unknown>;
    campaigns: {
      utmSources: Array<Record<string, unknown>>;
      subIds: Array<Record<string, unknown>>;
      landings: Array<Record<string, unknown>>;
    };
  }>({ key: "admin-aff-overview", enabled: args.enabled, pollActive: true, url });
}

export function useAdminAffiliateRealtime(args: { enabled: boolean; affiliateId?: string | null }) {
  const url = useMemo(() => {
    const base = "/api/admin/affiliate-analytics/realtime";
    if (args.affiliateId) return `${base}?affiliateId=${encodeURIComponent(args.affiliateId)}`;
    return base;
  }, [args.affiliateId]);
  return useAdminFetchJson<{
    ok: true;
    scoped: boolean;
    realtime: {
      onlineAffiliates: number;
      activeSessions: number;
      clicksLast5m: number;
      conversionsLast5m: number;
      revenueLast5m: number;
    };
    recentClicks: Array<Record<string, unknown>>;
    recentConversions: Array<Record<string, unknown>>;
  }>({ key: `admin-aff-rt:${args.affiliateId ?? "all"}`, enabled: args.enabled, pollActive: true, url });
}

export function useAdminAffiliateChart(args: { range: AdminRangeKey; enabled: boolean }) {
  const url = useMemo(
    () => `/api/admin/affiliate-analytics/chart?range=${encodeURIComponent(args.range)}`,
    [args.range],
  );
  return useAdminFetchJson<{
    ok: true;
    labels: string[];
    totals: { clicks: number; orders: number; revenue: number; commission: number };
    buckets: Array<{ label: string; clicks: number; orders: number; revenue: number; commission: number }>;
  }>({ key: "admin-aff-chart", enabled: args.enabled, pollActive: args.enabled, url });
}

export function useAdminAffiliateTopAffiliates(args: {
  range: AdminRangeKey;
  page: number;
  pageSize: number;
  sort: string;
  dir: "asc" | "desc";
  q: string;
  status: string;
  online: string;
  enabled: boolean;
}) {
  const url = useMemo(() => {
    const p = new URLSearchParams();
    p.set("range", args.range);
    p.set("page", String(args.page));
    p.set("pageSize", String(args.pageSize));
    p.set("sort", args.sort);
    p.set("dir", args.dir);
    p.set("status", args.status);
    p.set("online", args.online);
    if (args.q.trim()) p.set("q", args.q.trim());
    return `/api/admin/affiliate-analytics/top-affiliates?${p.toString()}`;
  }, [args.range, args.page, args.pageSize, args.sort, args.dir, args.q, args.status, args.online]);
  return useAdminFetchJson<{
    ok: true;
    total: number;
    rows: Array<{
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
    }>;
  }>({ key: "admin-aff-top", enabled: args.enabled, pollActive: false, url });
}

export function useAdminAffiliateFraud(args: { range: AdminRangeKey; severity: string; q: string; enabled: boolean }) {
  const url = useMemo(() => {
    const p = new URLSearchParams();
    p.set("range", args.range);
    p.set("severity", args.severity);
    if (args.q.trim()) p.set("q", args.q.trim());
    return `/api/admin/affiliate-analytics/fraud?${p.toString()}`;
  }, [args.range, args.severity, args.q]);
  return useAdminFetchJson<{
    ok: true;
    affiliates: Array<Record<string, unknown>>;
    suspiciousSessions: Array<Record<string, unknown>>;
    suspiciousIps: Array<Record<string, unknown>>;
    counts: { high: number; medium: number; low: number };
  }>({ key: "admin-aff-fraud", enabled: args.enabled, pollActive: false, url });
}

export function useAdminAffiliateDetail(args: { affiliateId: string; range: AdminRangeKey; enabled: boolean }) {
  const url = useMemo(
    () =>
      `/api/admin/affiliate-analytics/affiliate/${encodeURIComponent(args.affiliateId)}?range=${encodeURIComponent(args.range)}`,
    [args.affiliateId, args.range],
  );
  return useAdminFetchJson<Record<string, unknown>>({
    key: `admin-aff-detail:${args.affiliateId}`,
    enabled: args.enabled,
    pollActive: false,
    url,
  });
}
