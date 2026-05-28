"use client";

import Link from "next/link";
import { memo, useEffect, useState } from "react";
import { useAffiliateCtvRuntimeActive } from "@/hooks/use-affiliate-ctv-runtime-active";
import {
  fetchAffiliateClientJson,
  readAffiliateClientJsonCache,
} from "@/lib/affiliate-client-json-cache";

const CACHE_REVENUE_INSIGHTS = "affiliate:revenue-insights:30d";
import {
  CTV_MOBILE_INSIGHTS_BODY,
  CTV_MOBILE_INSIGHTS_LINK,
  CTV_MOBILE_INSIGHTS_SHELL,
  CTV_MOBILE_INSIGHTS_TITLE,
  CTV_MOBILE_SAFE,
} from "./ctv-ui-tokens";

type Insights = {
  strongestDayLabel: string | null;
  bestSourceLabel: string | null;
  trendingProductName: string | null;
  topLandingPath: string | null;
};

/** Gợi ý kiếm đơn — UI mobile-native cho CTV (không dùng ở buyer/admin). */
function CtvRevenueInsightsPanelInner(): JSX.Element {
  const runtimeActive = useAffiliateCtvRuntimeActive();
  const [data, setData] = useState<Insights | null>(() =>
    readAffiliateClientJsonCache<Insights>(CACHE_REVENUE_INSIGHTS),
  );
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!runtimeActive) return;
    let cancelled = false;
    const cached = readAffiliateClientJsonCache<Insights>(CACHE_REVENUE_INSIGHTS);
    if (cached) setData(cached);

    void fetchAffiliateClientJson<{ ok?: boolean; message?: string; insights?: Insights }>({
      cacheKey: CACHE_REVENUE_INSIGHTS,
      url: "/api/account/affiliate/analytics/revenue-insights?range=30d",
      force: !cached,
      parse: async (r) => r.json(),
    })
      .then((j) => {
        if (cancelled) return;
        if (!j?.ok) throw new Error(j?.message || "Lỗi");
        setData(j.insights as Insights);
      })
      .catch((e) => {
        if (!cancelled && !cached) setErr(e instanceof Error ? e.message : "Lỗi");
      });
    return () => {
      cancelled = true;
    };
  }, [runtimeActive]);

  if (err) {
    return <p className="text-sm text-rose-600">{err}</p>;
  }

  if (!data) {
    return (
      <div
        className="h-14 animate-pulse rounded-xl bg-slate-100 motion-reduce:animate-none"
        aria-hidden
      />
    );
  }

  const items = [
    { k: "Ngày hiệu quả (gợi ý lịch đăng)", v: data.strongestDayLabel },
    { k: "Nguồn traffic mạnh", v: data.bestSourceLabel },
    { k: "Sản phẩm đang được click nhiều", v: data.trendingProductName },
    { k: "Landing mạnh", v: data.topLandingPath },
  ];

  return (
    <div className={`${CTV_MOBILE_SAFE} ${CTV_MOBILE_INSIGHTS_SHELL}`}>
      <p className={CTV_MOBILE_INSIGHTS_TITLE}>Gợi ý kiếm đơn (30 ngày)</p>
      <ul className={CTV_MOBILE_INSIGHTS_BODY}>
        {items.map((it) => (
          <li key={it.k} className="min-w-0 break-words">
            <span className="font-medium text-emerald-900">{it.k}:</span>{" "}
            <span className="text-emerald-950">{it.v ?? "—"}</span>
          </li>
        ))}
      </ul>
      <Link
        className={CTV_MOBILE_INSIGHTS_LINK}
        href="/api/account/affiliate/analytics/export?type=revenue-insights&range=30d&format=csv"
        prefetch={false}
      >
        Xuất CSV insights
      </Link>
    </div>
  );
}

export const CtvRevenueInsightsPanel = memo(CtvRevenueInsightsPanelInner);
