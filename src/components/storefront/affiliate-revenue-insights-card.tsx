"use client";

import Link from "next/link";
import { memo, useEffect, useState } from "react";


type Insights = {
  strongestDayLabel: string | null;
  bestSourceLabel: string | null;
  trendingProductName: string | null;
  topLandingPath: string | null;
};

export default memo(function AffiliateRevenueInsightsCard(): JSX.Element {
  const [data, setData] = useState<Insights | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/account/affiliate/analytics/revenue-insights?range=30d", { credentials: "same-origin" })
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (!j?.ok) throw new Error(j?.message || "Lỗi");
        setData(j.insights as Insights);      })
      .catch((e) => {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Lỗi");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (err) return <p className="text-xs text-rose-600">{err}</p>;
  if (!data) return <div className="h-16 animate-pulse rounded-xl bg-slate-100 motion-reduce:animate-none" />;

  const items = [
    { k: "Ngày hiệu quả (gợi ý lịch đăng)", v: data.strongestDayLabel },
    { k: "Nguồn traffic mạnh", v: data.bestSourceLabel },
    { k: "Sản phẩm đang được click nhiều", v: data.trendingProductName },
    { k: "Landing mạnh", v: data.topLandingPath },
  ];

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
      <p className="text-sm font-semibold text-emerald-950">Gợi ý kiếm đơn (30 ngày)</p>
      <ul className="mt-2 space-y-1.5 text-xs text-emerald-950">
        {items.map((it) => (
          <li key={it.k}>
            <span className="font-medium text-emerald-900">{it.k}:</span>{" "}
            <span className="text-emerald-950">{it.v ?? "—"}</span>
          </li>
        ))}
      </ul>
      <Link
        className="mt-2 inline-block text-[11px] font-semibold text-[#2563EB] hover:underline"
        href="/api/account/affiliate/analytics/export?type=revenue-insights&range=30d&format=csv"
        prefetch={false}
      >
        Xuất CSV insights
      </Link>
    </div>
  );
});
