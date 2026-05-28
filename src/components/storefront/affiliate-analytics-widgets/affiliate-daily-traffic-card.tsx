"use client";

import { BarChart3 } from "lucide-react";
import { useMemo } from "react";
import { AnalyticsErrorBoundary } from "@/components/analytics/analytics-error-boundary";
import AffiliateAnalyticsBarChartLazy from "../affiliate-analytics-bar-chart-lazy";
import { useAffiliateChart, type RangeKey } from "../use-affiliate-analytics-hooks";
import { rangeViLabel } from "./affiliate-analytics-format";
import {
  AnalyticsCardBody,
  AnalyticsCardError,
  AnalyticsCardHeader,
  AnalyticsCardShell,
  AnalyticsCardSkeleton,
  AnalyticsChartContainer,
  AnalyticsEmptyState,
} from "./affiliate-analytics-card-ui";

const HEADING_ID = "affiliate-widget-daily-traffic";

export default function AffiliateDailyTrafficCard(props: { range: RangeKey; enabled: boolean }): JSX.Element {
  const query = useAffiliateChart({ range: props.range, type: "traffic", enabled: props.enabled });

  const buckets = useMemo(() => {
    const b = query.data?.buckets ?? [];
    return b.map((r) => ({
      label: r.label,
      clicks: r.clicks,
      orders: r.orders,
      revenue: r.revenue,
      commission: r.commission,
    }));
  }, [query.data?.buckets]);

  const hasTraffic = useMemo(() => {
    if (!buckets.length) return false;
    return buckets.some((x) => x.clicks > 0 || x.orders > 0 || x.revenue > 0 || x.commission > 0);
  }, [buckets]);

  const hint = props.range === "today" ? "Hôm nay" : `Theo khoảng · ${rangeViLabel(props.range)}`;

  return (
    <AnalyticsCardShell headingId={HEADING_ID}>
      <AnalyticsCardHeader id={HEADING_ID} title="Traffic theo ngày" hint={hint} />
      <AnalyticsCardBody>
        <AnalyticsChartContainer>
          {query.loading && !query.data ? (
            <AnalyticsCardSkeleton />
          ) : !hasTraffic ? (
            <AnalyticsEmptyState
              icon={BarChart3}
              title="Chưa có traffic trong kỳ"
              description="Chia sẻ link ref — biểu đồ theo ngày sẽ tự điền."
            />
          ) : (
            <div
              className={`h-full w-full min-w-0 transition-opacity duration-300 ${query.refreshing ? "opacity-75" : "opacity-100"}`}
            >
              <AnalyticsErrorBoundary title="Biểu đồ traffic lỗi.">
                <AffiliateAnalyticsBarChartLazy buckets={buckets} />
              </AnalyticsErrorBoundary>
            </div>
          )}
        </AnalyticsChartContainer>
        {query.error ? <AnalyticsCardError message={query.error} onRetry={query.refetch} /> : null}
      </AnalyticsCardBody>
    </AnalyticsCardShell>
  );
}
