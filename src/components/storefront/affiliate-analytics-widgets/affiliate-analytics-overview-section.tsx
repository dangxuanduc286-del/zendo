"use client";

import dynamic from "next/dynamic";
import { Sparkles } from "lucide-react";
import {
  CTV_ANALYTICS_CHART_PAIR_COL,
  CTV_ANALYTICS_CHART_PAIR_ROW,
  CTV_ANALYTICS_FULL_ROW,
  CTV_ANALYTICS_OVERVIEW_STACK,
  CTV_TYPE_CARD_TITLE,
} from "../affiliate/affiliate-ctv-account-ui-tokens";
import { AnalyticsSectionHintText } from "../affiliate/affiliate-analytics-card-hints";
import type {
  RangeKey,
  useAffiliateAnalyticsOverview,
  useAffiliateTrafficSources,
} from "../use-affiliate-analytics-hooks";
import { rangeViLabel } from "./affiliate-analytics-format";

/** Skeleton card ≈ header + chart 220px + padding (đồng bộ CTV_ANALYTICS_CHART_CONTAINER_HEIGHT_PX). */
const CARD_LOADING_MIN_H = "min-h-[340px]";

const cardLoading = () => (
  <div className={`${CARD_LOADING_MIN_H} w-full animate-pulse rounded-2xl bg-slate-100/90`} aria-hidden />
);

const AffiliateTrafficTimelineCard = dynamic(() => import("./affiliate-traffic-timeline-card"), {
  loading: cardLoading,
  ssr: false,
});
const AffiliateTrafficSourceCard = dynamic(() => import("./affiliate-traffic-source-card"), {
  loading: cardLoading,
  ssr: false,
});
const AffiliateTopCampaignCard = dynamic(() => import("./affiliate-top-campaign-card"), {
  loading: cardLoading,
  ssr: false,
});
const AffiliateRealtimeSparklineCard = dynamic(() => import("./affiliate-realtime-sparkline-card"), {
  loading: cardLoading,
  ssr: false,
});
const AffiliateLandingEpcCard = dynamic(() => import("./affiliate-landing-epc-card"), {
  loading: cardLoading,
  ssr: false,
});
const AffiliateDailyTrafficCard = dynamic(() => import("./affiliate-daily-traffic-card"), {
  loading: cardLoading,
  ssr: false,
});
const AffiliateTopProductsCard = dynamic(() => import("./affiliate-top-products-card"), {
  loading: cardLoading,
  ssr: false,
});
const AffiliateConversionFunnelCard = dynamic(() => import("./affiliate-conversion-funnel-card"), {
  loading: cardLoading,
  ssr: false,
});
const AffiliateRealtimeActivityCard = dynamic(() => import("./affiliate-realtime-activity-card"), {
  loading: cardLoading,
  ssr: false,
});

type OverviewQuery = ReturnType<typeof useAffiliateAnalyticsOverview>;
type SourcesQuery = ReturnType<typeof useAffiliateTrafficSources>;

export type AffiliateAnalyticsOverviewSectionProps = {
  range: RangeKey;
  tabEnabled: boolean;
  dailyTrafficEnabled: boolean;
  funnelEnabled: boolean;
  topProductsEnabled: boolean;
  sharedOverview?: OverviewQuery;
  sharedSources?: SourcesQuery;
};

/** Lưới 5 hàng — mỗi widget tự fetch, không gộp dataset. */
export default function AffiliateAnalyticsOverviewSection(props: AffiliateAnalyticsOverviewSectionProps): JSX.Element {
  const { range, tabEnabled, dailyTrafficEnabled, funnelEnabled, topProductsEnabled, sharedOverview, sharedSources } =
    props;

  return (
    <section className={CTV_ANALYTICS_OVERVIEW_STACK} aria-labelledby="affiliate-overview-widgets-heading">
      <div className="flex min-w-0 items-center gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600">
          <Sparkles className="h-4 w-4" strokeWidth={1.75} aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 id="affiliate-overview-widgets-heading" className={CTV_TYPE_CARD_TITLE}>
            Phân tích trực quan
          </h2>
          <AnalyticsSectionHintText text={`Mỗi khối tải dữ liệu riêng · kỳ ${rangeViLabel(range)}`} />
        </div>
      </div>

      <div className={CTV_ANALYTICS_CHART_PAIR_ROW}>
        <div className={CTV_ANALYTICS_CHART_PAIR_COL}>
          <AffiliateTrafficTimelineCard range={range} enabled={tabEnabled} />
        </div>
        <div className={CTV_ANALYTICS_CHART_PAIR_COL}>
          <AffiliateTrafficSourceCard
            range={range}
            enabled={tabEnabled}
            sharedSources={sharedSources != null}
            sourcesRows={sharedSources?.data?.rows}
            sourcesLoading={sharedSources?.loading}
          />
        </div>
      </div>

      <div className={CTV_ANALYTICS_CHART_PAIR_ROW}>
        <div className={CTV_ANALYTICS_CHART_PAIR_COL}>
          <AffiliateTopCampaignCard range={range} tabEnabled={tabEnabled} />
        </div>
        <div className={CTV_ANALYTICS_CHART_PAIR_COL}>
          <AffiliateRealtimeSparklineCard range={range} enabled={tabEnabled} sharedOverview={sharedOverview} />
        </div>
      </div>

      <div className={CTV_ANALYTICS_CHART_PAIR_ROW}>
        <div className={CTV_ANALYTICS_CHART_PAIR_COL}>
          <AffiliateLandingEpcCard range={range} tabEnabled={tabEnabled} />
        </div>
        <div className={CTV_ANALYTICS_CHART_PAIR_COL}>
          <AffiliateDailyTrafficCard range={range} enabled={dailyTrafficEnabled} />
        </div>
      </div>

      <div className={CTV_ANALYTICS_CHART_PAIR_ROW}>
        <div className={CTV_ANALYTICS_CHART_PAIR_COL}>
          <AffiliateTopProductsCard range={range} enabled={topProductsEnabled} />
        </div>
        <div className={CTV_ANALYTICS_CHART_PAIR_COL}>
          <AffiliateConversionFunnelCard range={range} enabled={funnelEnabled} />
        </div>
      </div>

      <div className={CTV_ANALYTICS_FULL_ROW}>
        <AffiliateRealtimeActivityCard range={range} enabled={tabEnabled} sharedOverview={sharedOverview} />
      </div>
    </section>
  );
}
