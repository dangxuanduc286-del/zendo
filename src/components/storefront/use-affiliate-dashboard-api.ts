"use client";

import { useCallback, useEffect, useState } from "react";
import type { StorefrontAffiliateDashboardData } from "../../lib/storefront-affiliate-dashboard";

type ApiPayload = { ok?: boolean; message?: string; data?: StorefrontAffiliateDashboardData };
const DASHBOARD_CACHE_TTL_MS = 15_000;

let sharedDashboardCache: { at: number; data: StorefrontAffiliateDashboardData } | null = null;
let sharedDashboardInFlight: Promise<StorefrontAffiliateDashboardData> | null = null;

async function fetchAffiliateDashboardShared(force = false): Promise<StorefrontAffiliateDashboardData> {
  const now = Date.now();
  if (!force && sharedDashboardCache && now - sharedDashboardCache.at < DASHBOARD_CACHE_TTL_MS) {
    return sharedDashboardCache.data;
  }
  if (sharedDashboardInFlight) return sharedDashboardInFlight;

  sharedDashboardInFlight = (async () => {
    const res = await fetch("/api/account/affiliate/dashboard", { credentials: "same-origin" });
    const json = (await res.json()) as ApiPayload;
    if (!res.ok || !json.ok || !json.data) {
      throw new Error(json.message || "Không tải được dữ liệu CTV.");
    }
    sharedDashboardCache = { at: Date.now(), data: json.data };
    return json.data;
  })();

  try {
    return await sharedDashboardInFlight;
  } finally {
    sharedDashboardInFlight = null;
  }
}

export function useAffiliateDashboardApi(enabled: boolean): {
  loading: boolean;
  data: StorefrontAffiliateDashboardData | null;
  error: string | null;
  refetch: () => void;
} {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<StorefrontAffiliateDashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => {
    setTick((n) => n + 1);
  }, []);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const json = await fetchAffiliateDashboardShared(tick > 0);
        if (cancelled) return;
        setData(json);
        setError(null);
      } catch (e) {
        if (cancelled) return;
        setData(null);
        setError(e instanceof Error ? e.message : "Không tải được dữ liệu CTV.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, tick]);

  return { loading, data, error, refetch };
}
