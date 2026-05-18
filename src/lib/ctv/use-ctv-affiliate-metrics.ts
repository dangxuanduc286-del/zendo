"use client";

import { useCallback, useEffect, useState } from "react";
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

export function useCtvAffiliateMetrics(enabled: boolean): CtvAffiliateMetrics {
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [income, setIncome] = useState<CtvIncomeSummary | null>(null);
  const [todayOverview, setTodayOverview] = useState<AffiliateAnalyticsOverview | null>(null);
  const [monthOverview, setMonthOverview] = useState<AffiliateAnalyticsOverview | null>(null);

  const load = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [incomeRes, todayRes, monthRes] = await Promise.all([
        fetch("/api/account/affiliate/income-summary", { credentials: "same-origin", cache: "no-store" }),
        fetch("/api/account/affiliate/analytics/overview?range=today", {
          credentials: "same-origin",
          cache: "no-store",
        }),
        fetch("/api/account/affiliate/analytics/overview?range=month", {
          credentials: "same-origin",
          cache: "no-store",
        }),
      ]);

      if (incomeRes.ok) {
        const j = (await incomeRes.json()) as CtvIncomeSummary & { ok?: boolean };
        setIncome({
          ok: Boolean(j.ok),
          hasProfile: Boolean(j.hasProfile),
          todayCommission: Number(j.todayCommission ?? 0),
          monthCommission: Number(j.monthCommission ?? 0),
          pendingTotal: Number(j.pendingTotal ?? 0),
          paidTotal: Number(j.paidTotal ?? 0),
          affiliateOrderCount: Number(j.affiliateOrderCount ?? 0),
        });
      } else {
        setIncome(emptyIncome);
      }

      if (todayRes.ok) {
        const j = (await todayRes.json()) as OverviewResponse;
        setTodayOverview(j.overview ?? null);
      } else {
        setTodayOverview(null);
      }

      if (monthRes.ok) {
        const j = (await monthRes.json()) as OverviewResponse;
        setMonthOverview(j.overview ?? null);
      } else {
        setMonthOverview(null);
      }
    } catch {
      setError("Không tải được số liệu hiệu suất.");
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void load();
  }, [load]);

  return { loading, error, income, todayOverview, monthOverview, refetch: load };
}
