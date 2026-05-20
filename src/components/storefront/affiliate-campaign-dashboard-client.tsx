"use client";

import dynamic from "next/dynamic";

const AffiliateCampaignDashboard = dynamic(() => import("./affiliate-campaign-dashboard"), {
  loading: () => (
    <div className="min-h-[20rem] animate-pulse rounded-2xl bg-[#F1F5F9]/90" aria-busy aria-label="Đang tải campaign" />
  ),
  ssr: false,
});

export default function AffiliateCampaignDashboardClient(): JSX.Element {
  return <AffiliateCampaignDashboard />;
}
