"use client";

import dynamic from "next/dynamic";

const AffiliateAnalyticsDashboard = dynamic(() => import("./affiliate-analytics-dashboard"), {
  loading: () => (
    <div className="min-h-[20rem] animate-pulse rounded-2xl bg-[#F1F5F9]/90" aria-busy aria-label="Đang tải analytics" />
  ),
  ssr: false,
});

export default function AffiliateAnalyticsDashboardClient(props: {
  affiliateRefCode: string;
  initialMenuKey?: string;
}): JSX.Element {
  return <AffiliateAnalyticsDashboard {...props} />;
}
