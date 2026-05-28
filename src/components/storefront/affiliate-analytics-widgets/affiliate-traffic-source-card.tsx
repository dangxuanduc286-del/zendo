"use client";

import { Share2 } from "lucide-react";
import { useAffiliateTrafficSources, type RangeKey } from "../use-affiliate-analytics-hooks";
import CreatorSourceDonutLazy from "../affiliate-creator-charts/creator-source-donut-lazy";
import {
  AnalyticsCardBody,
  AnalyticsCardError,
  AnalyticsCardHeader,
  AnalyticsCardShell,
  AnalyticsCardSkeleton,
  AnalyticsChartContainer,
  AnalyticsEmptyState,
} from "./affiliate-analytics-card-ui";

const HEADING_ID = "affiliate-widget-traffic-source";

type SourceRow = {
  source: string;
  clicks: number;
  visitors: number;
  orders: number;
  revenue: number;
  commission: number;
  conversionRate: number;
};

export default function AffiliateTrafficSourceCard(props: {
  range: RangeKey;
  enabled: boolean;
  /** Khi set (kể cả đang loading) — không gọi hook fetch trùng URL. */
  sharedSources?: boolean;
  sourcesRows?: SourceRow[];
  sourcesLoading?: boolean;
}): JSX.Element {
  const query = useAffiliateTrafficSources({
    range: props.range,
    enabled: props.enabled && !props.sharedSources,
    filterQs: "",
    live: false,
  });

  const rows = props.sourcesRows ?? query.data?.rows ?? [];
  const loading = props.sharedSources ? Boolean(props.sourcesLoading) : query.loading && !query.data;
  const hasData = rows.some((r) => r.clicks > 0);

  return (
    <AnalyticsCardShell headingId={HEADING_ID}>
      <AnalyticsCardHeader id={HEADING_ID} title="Nguồn traffic" hint="% theo click · đơn · conv" />
      <AnalyticsCardBody>
        <AnalyticsChartContainer>
          {loading ? (
            <AnalyticsCardSkeleton />
          ) : !hasData ? (
            <AnalyticsEmptyState
              icon={Share2}
              title="Chưa có phân bổ nguồn"
              description="Nguồn traffic sẽ hiện khi có click theo kênh."
            />
          ) : (
            <div className={`h-full w-full min-w-0 ${query.refreshing ? "opacity-75" : "opacity-100"}`}>
              <CreatorSourceDonutLazy rows={rows} />
            </div>
          )}
        </AnalyticsChartContainer>
        {query.error ? <AnalyticsCardError message={query.error} onRetry={query.refetch} /> : null}
      </AnalyticsCardBody>
    </AnalyticsCardShell>
  );
}
