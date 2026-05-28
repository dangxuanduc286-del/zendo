"use client";

import { Activity } from "lucide-react";
import { AnalyticsErrorBoundary } from "@/components/analytics/analytics-error-boundary";
import { useAffiliateConversionTimeline, type RangeKey } from "../use-affiliate-analytics-hooks";
import CreatorTrafficLineLazy from "../affiliate-creator-charts/creator-traffic-line-lazy";
import {
  AnalyticsCardBody,
  AnalyticsCardError,
  AnalyticsCardHeader,
  AnalyticsCardShell,
  AnalyticsCardSkeleton,
  AnalyticsChartContainer,
  AnalyticsEmptyState,
} from "./affiliate-analytics-card-ui";

const HEADING_ID = "affiliate-widget-traffic-timeline";

export default function AffiliateTrafficTimelineCard(props: { range: RangeKey; enabled: boolean }): JSX.Element {
  const query = useAffiliateConversionTimeline({
    range: props.range,
    enabled: props.enabled,
    filterQs: "",
    live: false,
  });

  const buckets = query.data?.buckets ?? [];
  const hasData = buckets.some((b) => b.clicks > 0 || b.orders > 0);

  return (
    <AnalyticsCardShell headingId={HEADING_ID}>
      <AnalyticsCardHeader
        id={HEADING_ID}
        title="Traffic theo thời gian"
        hint="Click, đơn trả, conv % — sessions tổng xem thẻ Sessions phía trên."
      />
      <AnalyticsCardBody>
        <AnalyticsChartContainer>
          {query.loading && !query.data ? (
            <AnalyticsCardSkeleton />
          ) : !hasData ? (
            <AnalyticsEmptyState
              icon={Activity}
              title="Chưa có traffic theo thời gian"
              description="Dữ liệu timeline sẽ hiện khi có click trong kỳ."
            />
          ) : (
            <div
              className={`h-full w-full min-w-0 transition-opacity duration-300 ${query.refreshing ? "opacity-75" : "opacity-100"}`}
            >
              <AnalyticsErrorBoundary title="Biểu đồ traffic theo thời gian lỗi.">
                <CreatorTrafficLineLazy buckets={buckets} />
              </AnalyticsErrorBoundary>
            </div>
          )}
        </AnalyticsChartContainer>
        {query.error ? <AnalyticsCardError message={query.error} onRetry={query.refetch} /> : null}
      </AnalyticsCardBody>
    </AnalyticsCardShell>
  );
}
