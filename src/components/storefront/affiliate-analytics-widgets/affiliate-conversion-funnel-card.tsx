"use client";

import { Percent } from "lucide-react";
import AffiliateConversionFunnelVisual from "../affiliate-conversion-funnel-visual";
import { useAffiliateFunnel, type RangeKey } from "../use-affiliate-analytics-hooks";
import {
  AnalyticsCardBody,
  AnalyticsCardError,
  AnalyticsCardHeader,
  AnalyticsCardShell,
  AnalyticsCardSkeleton,
  AnalyticsChartContainer,
  AnalyticsEmptyState,
} from "./affiliate-analytics-card-ui";

const HEADING_ID = "affiliate-widget-conversion-funnel";

export default function AffiliateConversionFunnelCard(props: { range: RangeKey; enabled: boolean }): JSX.Element {
  const query = useAffiliateFunnel({ range: props.range, enabled: props.enabled });

  const steps = query.data?.steps ?? [];
  const hasSteps = steps.length > 0 && steps.some((s) => s.count > 0);

  return (
    <AnalyticsCardShell headingId={HEADING_ID}>
      <AnalyticsCardHeader id={HEADING_ID} title="Funnel chuyển đổi" hint="Từ click đến thanh toán" />
      <AnalyticsCardBody>
        <AnalyticsChartContainer>
          {query.loading && !query.data ? (
            <AnalyticsCardSkeleton />
          ) : !hasSteps ? (
            <AnalyticsEmptyState
              icon={Percent}
              title="Chưa đủ dữ liệu funnel"
              description="Khi có luồng click → đơn trong kỳ, các bước funnel sẽ hiển thị."
            />
          ) : (
            <div className="h-full w-full min-w-0 overflow-auto overscroll-contain">
              <AffiliateConversionFunnelVisual loading={false} steps={steps} variant="compact" />
            </div>
          )}
        </AnalyticsChartContainer>
        {query.error ? <AnalyticsCardError message={query.error} onRetry={query.refetch} /> : null}
      </AnalyticsCardBody>
    </AnalyticsCardShell>
  );
}
