"use client";

import dynamic from "next/dynamic";

const Inner = dynamic(() => import("./affiliate-analytics-timeline-inner"), {
  loading: () => <div className="flex h-56 items-center justify-center text-sm text-[#64748B]">Đang tải biểu đồ…</div>,
  ssr: false,
});

export default function AffiliateAnalyticsTimelineLazy(props: {
  buckets: Array<{ label: string; clicks: number; orders: number; revenue: number; commission: number; conversionRate: number }>;
  compact?: boolean;
}): JSX.Element {
  return <Inner {...props} />;
}
