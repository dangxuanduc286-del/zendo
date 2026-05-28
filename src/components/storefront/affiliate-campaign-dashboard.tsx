"use client";

import dynamic from "next/dynamic";
import { Megaphone } from "lucide-react";
import { useState } from "react";
import { AnalyticsErrorBoundary } from "@/components/analytics/analytics-error-boundary";
import { AccountPageTabPanel } from "./account-page-tab-panel";
import { ACCOUNT_PAGE_HEADER_SELECT } from "./account-page-header-tokens";
import type { RangeKey } from "./use-affiliate-analytics-hooks";

const AffiliateCampaignGrowthHub = dynamic(() => import("./affiliate-campaign-growth-hub"), {
  loading: () => <div className="min-h-[12rem] animate-pulse rounded-2xl bg-[#F1F5F9]" />,
  ssr: false,
});

function rangeViLabel(r: RangeKey): string {
  if (r === "today") return "Hôm nay";
  if (r === "7d") return "7 ngày";
  if (r === "30d") return "30 ngày";
  return "Tháng này";
}

export default function AffiliateCampaignDashboard(): JSX.Element {
  const [range, setRange] = useState<RangeKey>("7d");

  return (
    <AnalyticsErrorBoundary title="Campaign & khuyến mãi tạm thời không khả dụng.">
      <AccountPageTabPanel
        id="affiliate-campaign"
        title="Campaign / Khuyến mãi"
        description="Quản lý chiến dịch, landing EPC, mẫu share và kho ảnh."
        icon={<Megaphone className="h-5 w-5" strokeWidth={1.75} aria-hidden />}
        headingLevel="h1"
        toolbar={
          <>
            <label className="sr-only" htmlFor="affiliate-campaign-range">
              Chọn khoảng thời gian
            </label>
            <select
              id="affiliate-campaign-range"
              name="range"
              value={range}
              onChange={(e) => setRange(e.target.value as RangeKey)}
              className={ACCOUNT_PAGE_HEADER_SELECT}
              aria-label={`Chọn khoảng thời gian: ${rangeViLabel(range)}`}
            >
              <option value="today">Hôm nay</option>
              <option value="7d">7 ngày</option>
              <option value="30d">30 ngày</option>
              <option value="month">Tháng này</option>
            </select>
          </>
        }
      >
        <div className="w-full min-w-0 lg:min-h-[min(52dvh,28rem)]">
          <AffiliateCampaignGrowthHub range={range} />
        </div>
      </AccountPageTabPanel>
    </AnalyticsErrorBoundary>
  );
}
