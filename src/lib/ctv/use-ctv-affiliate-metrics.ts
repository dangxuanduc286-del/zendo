"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAffiliateCtvRuntimeActive } from "@/hooks/use-affiliate-ctv-runtime-active";
import {
  fetchAffiliateClientJson,
  readAffiliateClientJsonCache,
} from "@/lib/affiliate-client-json-cache";
import type { AffiliateAnalyticsOverview } from "@/lib/affiliate-analytics";

export type CtvIncomeSummary = {
  ok: boolean;
  hasProfile: boolean;
  todayCommission: number;
  monthCommission: number;
  pendingTotal: number;
  paidTotal: number;
  affiliateOrderCount: number;
};

type OverviewResponse = {
  ok: boolean;
  overview?: AffiliateAnalyticsOverview;
};

export type CtvAffiliateMetrics = {
  loading: boolean;
  error: string | null;
  income: CtvIncomeSummary | null;
  todayOverview: AffiliateAnalyticsOverview | null;
  monthOverview: AffiliateAnalyticsOverview | null;
  refetch: () => void;
};

const emptyIncome: CtvIncomeSummary = {
  ok: true,
  hasProfile: false,
  todayCommission: 0,
  monthCommission: 0,
  pendingTotal: 0,
  paidTotal: 0,
  affiliateOrderCount: 0,
};

const CACHE_INCOME = "ctv:metrics:income";
const CACHE_OVERVIEW_TODAY = "ctv:metrics:overview:today";
const CACHE_OVERVIEW_MONTH = "ctv:metrics:overview:month";

function hasAnyMetrics(
  income: CtvIncomeSummary | null,
  today: AffiliateAnalyticsOverview | null,
  month: AffiliateAnalyticsOverview | null,
): boolean {
  return income != null || today != null || month != null;
}

export function useCtvAffiliateMetrics(enabled: boolean): CtvAffiliateMetrics {
  const runtimeActive = useAffiliateCtvRuntimeActive();
  const initialIncome = enabled ? readAffiliateClientJsonCache<CtvIncomeSummary>(CACHE_INCOME) : null;
  const initialToday = enabled ? readAffiliateClientJsonCache<AffiliateAnalyticsOverview>(CACHE_OVERVIEW_TODAY) : null;
  const initialMonth = enabled ? readAffiliateClientJsonCache<AffiliateAnalyticsOverview>(CACHE_OVERVIEW_MONTH) : null;
  const initialCached = hasAnyMetrics(initialIncome, initialToday, initialMonth);

  const [loading, setLoading] = useState(() => Boolean(enabled && !initialCached));
  const [error, setError] = useState<string | null>(null);
  const [income, setIncome] = useState<CtvIncomeSummary | null>(initialIncome);
  const [todayOverview, setTodayOverview] = useState<AffiliateAnalyticsOverview | null>(initialToday);
  const [monthOverview, setMonthOverview] = useState<AffiliateAnalyticsOverview | null>(initialMonth);
  const [tick, setTick] = useState(0);
  const hasDataRef = useRef(initialCached);

  const refetch = useCallback(() => {
    setTick((n) => n + 1);
  }, []);

  useEffect(() => {
    if (!enabled || !runtimeActive) return;

    const cachedIncome = readAffiliateClientJsonCache<CtvIncomeSummary>(CACHE_INCOME);
    const cachedToday = readAffiliateClientJsonCache<AffiliateAnalyticsOverview>(CACHE_OVERVIEW_TODAY);
    const cachedMonth = readAffiliateClientJsonCache<AffiliateAnalyticsOverview>(CACHE_OVERVIEW_MONTH);
    const hadData = hasDataRef.current;
    const allCached = Boolean(cachedIncome && cachedToday && cachedMonth);

    if (!hadData) {
      if (cachedIncome) setIncome(cachedIncome);
      if (cachedToday) setTodayOverview(cachedToday);
      if (cachedMonth) setMonthOverview(cachedMonth);
      if (cachedIncome || cachedToday || cachedMonth) hasDataRef.current = true;
    }

    const forceNetwork = tick > 0 || !allCached;
    if (!forceNetwork) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    if (!hadData && !allCached) {
      setLoading(true);
      setError(null);
    }

    void (async () => {
      try {
        const [incomeRes, todayRes, monthRes] = await Promise.all([
          fetchAffiliateClientJson<CtvIncomeSummary & { ok?: boolean }>({
            cacheKey: CACHE_INCOME,
            url: "/api/account/affiliate/income-summary",
            force: tick > 0,
          }),
          fetchAffiliateClientJson<OverviewResponse>({
            cacheKey: CACHE_OVERVIEW_TODAY,
            url: "/api/account/affiliate/analytics/overview?range=today",
            force: tick > 0,
          }),
          fetchAffiliateClientJson<OverviewResponse>({
            cacheKey: CACHE_OVERVIEW_MONTH,
            url: "/api/account/affiliate/analytics/overview?range=month",
            force: tick > 0,
          }),
        ]);

        if (cancelled) return;

        if (incomeRes.ok !== false) {
          setIncome({
            ok: Boolean(incomeRes.ok),
            hasProfile: Boolean(incomeRes.hasProfile),
            todayCommission: Number(incomeRes.todayCommission ?? 0),
            monthCommission: Number(incomeRes.monthCommission ?? 0),
            pendingTotal: Number(incomeRes.pendingTotal ?? 0),
            paidTotal: Number(incomeRes.paidTotal ?? 0),
            affiliateOrderCount: Number(incomeRes.affiliateOrderCount ?? 0),
          });
        } else {
          setIncome(emptyIncome);
        }

        setTodayOverview(todayRes.overview ?? null);
        setMonthOverview(monthRes.overview ?? null);
        setError(null);
        hasDataRef.current = true;
      } catch {
        if (!cancelled && !hadData && !allCached) {
          setError("Không tải được số liệu hiệu suất.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, runtimeActive, tick]);

  return { loading, error, income, todayOverview, monthOverview, refetch };
}
