"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAffiliateCtvRuntimeActive } from "@/hooks/use-affiliate-ctv-runtime-active";
import {
  AFFILIATE_CLIENT_JSON_CACHE_TTL_MS,
  fetchAffiliateClientJson,
  readAffiliateClientJsonCache,
  writeAffiliateClientJsonCache,
} from "@/lib/affiliate-client-json-cache";
import type { StorefrontAffiliateDashboardData } from "../../lib/storefront-affiliate-dashboard";

type ApiPayload = { ok?: boolean; message?: string; data?: StorefrontAffiliateDashboardData };

/** Cache payload đã chuẩn hóa (StorefrontAffiliateDashboardData). */
const DASHBOARD_CACHE_KEY = "affiliate:dashboard";
const DASHBOARD_LITE_CACHE_KEY = "affiliate:dashboard:lite";
/** Cache raw API + in-flight dedupe — không đọc trực tiếp làm `data` state. */
const DASHBOARD_API_CACHE_KEY = "affiliate:dashboard:api";
const DASHBOARD_LITE_API_CACHE_KEY = "affiliate:dashboard:api:lite";

function isStorefrontAffiliateDashboardData(value: unknown): value is StorefrontAffiliateDashboardData {
  if (!value || typeof value !== "object") return false;
  const summary = (value as StorefrontAffiliateDashboardData).summary;
  return summary != null && typeof summary === "object";
}

/** Đọc cache: hỗ trợ bản ghi cũ lưu nhầm `{ ok, data }` từ fetchAffiliateClientJson. */
function cacheKeysForLifecycle(runLifecycle: boolean): { data: string; api: string } {
  return runLifecycle
    ? { data: DASHBOARD_CACHE_KEY, api: DASHBOARD_API_CACHE_KEY }
    : { data: DASHBOARD_LITE_CACHE_KEY, api: DASHBOARD_LITE_API_CACHE_KEY };
}

function readCachedAffiliateDashboard(runLifecycle: boolean): StorefrontAffiliateDashboardData | null {
  const keys = cacheKeysForLifecycle(runLifecycle);
  const raw = readAffiliateClientJsonCache<unknown>(keys.data);
  if (isStorefrontAffiliateDashboardData(raw)) return raw;

  const wrapped = raw as ApiPayload | null;
  if (wrapped?.ok && isStorefrontAffiliateDashboardData(wrapped.data)) {
    writeAffiliateClientJsonCache(keys.data, wrapped.data);
    return wrapped.data;
  }

  const apiRaw = readAffiliateClientJsonCache<unknown>(keys.api);
  const apiWrapped = apiRaw as ApiPayload | null;
  if (apiWrapped?.ok && isStorefrontAffiliateDashboardData(apiWrapped.data)) {
    writeAffiliateClientJsonCache(keys.data, apiWrapped.data);
    return apiWrapped.data;
  }

  if (!runLifecycle) {
    const full = readAffiliateClientJsonCache<unknown>(DASHBOARD_CACHE_KEY);
    if (isStorefrontAffiliateDashboardData(full)) return full;
  }

  return null;
}

async function fetchAffiliateDashboardPayload(force = false, runLifecycle = true): Promise<StorefrontAffiliateDashboardData> {
  const keys = cacheKeysForLifecycle(runLifecycle);
  if (!force) {
    const cached = readCachedAffiliateDashboard(runLifecycle);
    if (cached) return cached;
  }

  const json = await fetchAffiliateClientJson<ApiPayload>({
    cacheKey: keys.api,
    url: runLifecycle ? "/api/account/affiliate/dashboard" : "/api/account/affiliate/dashboard?lifecycle=0",
    ttlMs: AFFILIATE_CLIENT_JSON_CACHE_TTL_MS,
    force,
    parse: async (res) => (await res.json()) as ApiPayload,
  });
  if (!json.ok || !isStorefrontAffiliateDashboardData(json.data)) {
    throw new Error(json.message || "Không tải được dữ liệu CTV.");
  }
  writeAffiliateClientJsonCache(keys.data, json.data);
  return json.data;
}

export function useAffiliateDashboardApi(
  enabled: boolean,
  options?: { runLifecycle?: boolean },
): {
  loading: boolean;
  data: StorefrontAffiliateDashboardData | null;
  error: string | null;
  refetch: () => void;
} {
  const runtimeActive = useAffiliateCtvRuntimeActive();
  const runLifecycle = options?.runLifecycle !== false;
  const [loading, setLoading] = useState(() => {
    if (!enabled) return false;
    return readCachedAffiliateDashboard(runLifecycle) == null;
  });
  const [data, setData] = useState<StorefrontAffiliateDashboardData | null>(() =>
    enabled ? readCachedAffiliateDashboard(runLifecycle) : null,
  );
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const dataRef = useRef<StorefrontAffiliateDashboardData | null>(data);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const refetch = useCallback(() => {
    setTick((n) => n + 1);
  }, []);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    if (!runtimeActive) return;

    const cached = readCachedAffiliateDashboard(runLifecycle);
    const hadData = dataRef.current != null;
    if (cached && !hadData) {
      setData(cached);
      dataRef.current = cached;
    }

    const forceNetwork = tick > 0 || !cached;
    if (!forceNetwork) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    if (!hadData && !cached) {
      setLoading(true);
      setError(null);
    }

    void (async () => {
      try {
        const payload = await fetchAffiliateDashboardPayload(tick > 0, runLifecycle);
        if (cancelled) return;
        setData(payload);
        setError(null);
      } catch (e) {
        if (cancelled) return;
        if (!hadData && !cached) setData(null);
        setError(e instanceof Error ? e.message : "Không tải được dữ liệu CTV.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, tick, runtimeActive, runLifecycle]);

  return { loading, data, error, refetch };
}
