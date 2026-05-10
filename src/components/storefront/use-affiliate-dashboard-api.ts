"use client";

import { useCallback, useEffect, useState } from "react";
import type { StorefrontAffiliateDashboardData } from "../../lib/storefront-affiliate-dashboard";

type ApiPayload = { ok?: boolean; message?: string; data?: StorefrontAffiliateDashboardData };

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
        const res = await fetch("/api/account/affiliate/dashboard", { credentials: "same-origin" });
        const json = (await res.json()) as ApiPayload;
        if (!res.ok || !json.ok || !json.data) {
          throw new Error(json.message || "Không tải được dữ liệu CTV.");
        }
        if (cancelled) return;
        setData(json.data);
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
