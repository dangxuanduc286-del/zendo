"use client";

import dynamic from "next/dynamic";
import { Megaphone } from "lucide-react";
import { useState } from "react";
import { AnalyticsErrorBoundary } from "@/components/analytics/analytics-error-boundary";
import {
  CTV_DASHBOARD_HEADER_BORDER,
  CTV_DASHBOARD_HEADER_ICON,
  CTV_DASHBOARD_SHELL,
  CTV_TYPE_BODY,
  CTV_TYPE_TITLE,
} from "./affiliate/affiliate-ctv-account-ui-tokens";
import { CreatorSectionShell } from "./affiliate-creator-metric-card";
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
      <div className={CTV_DASHBOARD_SHELL}>
        <section className="flex w-full min-w-0 flex-1 flex-col gap-5 overflow-x-hidden sm:gap-6 lg:gap-7">
          <header
            className={`flex w-full min-w-0 shrink-0 flex-col gap-5 ${CTV_DASHBOARD_HEADER_BORDER} lg:flex-row lg:items-end lg:justify-between lg:gap-8`}
          >
            <div className="flex min-w-0 items-start gap-3 sm:gap-4">
              <span className={CTV_DASHBOARD_HEADER_ICON}>
                <Megaphone className="h-5 w-5" strokeWidth={1.75} aria-hidden />
              </span>
              <div className="min-w-0 space-y-1.5">
                <h1 className={CTV_TYPE_TITLE}>Campaign / Khuyến mãi</h1>
                <p className={`${CTV_TYPE_BODY} w-full min-w-0`}>
                  Quản lý chiến dịch, landing EPC, mẫu share và kho ảnh.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
              <label className="sr-only" htmlFor="affiliate-campaign-range">
                Chọn khoảng thời gian
              </label>
              <select
                id="affiliate-campaign-range"
                value={range}
                onChange={(e) => setRange(e.target.value as RangeKey)}
                className="h-10 min-w-[9.5rem] cursor-pointer rounded-xl border border-[#BFDBFE]/90 bg-white px-3.5 text-sm font-medium text-[#1E293B] shadow-[0_1px_2px_rgba(37,99,235,0.06)] outline-none transition-shadow focus-visible:border-[#93C5FD] focus-visible:ring-2 focus-visible:ring-[#60A5FA]/25"
                aria-label={`Chọn khoảng thời gian: ${rangeViLabel(range)}`}
              >
                <option value="today">Hôm nay</option>
                <option value="7d">7 ngày</option>
                <option value="30d">30 ngày</option>
                <option value="month">Tháng này</option>
              </select>
            </div>
          </header>

          <CreatorSectionShell
            className="flex flex-1 flex-col lg:min-h-[min(52dvh,28rem)]"
            title="Campaign & tăng trưởng CTV"
            hint="Landing EPC, mẫu share, kho ảnh, growth insights"
          >
            <div className="mt-4 w-full min-w-0">
              <AffiliateCampaignGrowthHub range={range} />
            </div>
          </CreatorSectionShell>
        </section>
      </div>
    </AnalyticsErrorBoundary>
  );
}
