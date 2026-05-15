"use client";

import dynamic from "next/dynamic";

const Inner = dynamic(() => import("./admin-affiliate-analytics-chart-inner"), {
  loading: () => (
    <div className="flex h-56 w-full items-center justify-center rounded-xl border border-dashed border-[#E2E8F0] bg-[#F8FAFC] text-sm text-[#64748B] md:h-72">
      Đang tải biểu đồ…
    </div>
  ),
  ssr: false,
});

export type AdminAffiliateChartBucket = {
  label: string;
  clicks: number;
  orders: number;
  revenue: number;
  commission: number;
};

export default function AdminAffiliateAnalyticsChartLazy(props: {
  buckets: AdminAffiliateChartBucket[];
  compact?: boolean;
}): JSX.Element {
  return <Inner {...props} />;
}
