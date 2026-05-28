"use client";

import { Globe2 } from "lucide-react";
import { useEffect, useState } from "react";
import { scheduleIdleWork } from "@/lib/next-dev-stability";
import { useAffiliateLandingAnalytics, type RangeKey } from "../use-affiliate-analytics-hooks";
import CreatorLandingBarsLazy from "../affiliate-creator-charts/creator-landing-bars-lazy";
import {
  AnalyticsCardBody,
  AnalyticsCardError,
  AnalyticsCardHeader,
  AnalyticsCardShell,
  AnalyticsCardSkeleton,
  AnalyticsChartContainer,
  AnalyticsEmptyState,
} from "./affiliate-analytics-card-ui";

const HEADING_ID = "affiliate-widget-landing-epc";

export default function AffiliateLandingEpcCard(props: { range: RangeKey; tabEnabled: boolean }): JSX.Element {
  const [idleReady, setIdleReady] = useState(false);

  useEffect(() => {
    if (!props.tabEnabled) {
      setIdleReady(false);
      return;
    }
    setIdleReady(false);
    let landingTimer: number | null = null;
    const cancel = scheduleIdleWork(() => {
      landingTimer = window.setTimeout(() => setIdleReady(true), 300);
    }, 520);
    return () => {
      cancel();
      if (landingTimer != null) window.clearTimeout(landingTimer);
    };
  }, [props.tabEnabled, props.range]);

  const query = useAffiliateLandingAnalytics({
    range: props.range,
    enabled: props.tabEnabled && idleReady,
    filterQs: "",
    page: 1,
    live: false,
  });

  const rows = query.data?.rows ?? [];
  const hasData = rows.length > 0;

  return (
    <AnalyticsCardShell headingId={HEADING_ID}>
      <AnalyticsCardHeader id={HEADING_ID} title="Landing & EPC" hint="Theo visits · EPC = HH/click" />
      <AnalyticsCardBody>
        <AnalyticsChartContainer>
          {query.loading && !query.data ? (
            <AnalyticsCardSkeleton />
          ) : !hasData ? (
            <AnalyticsEmptyState
              icon={Globe2}
              title="Chưa có landing"
              description="EPC theo trang đích sẽ hiện khi có visits."
            />
          ) : (
            <div className={`h-full w-full min-w-0 ${query.refreshing ? "opacity-75" : "opacity-100"}`}>
              <CreatorLandingBarsLazy rows={rows} />
            </div>
          )}
        </AnalyticsChartContainer>
        {query.error ? <AnalyticsCardError message={query.error} onRetry={query.refetch} /> : null}
      </AnalyticsCardBody>
    </AnalyticsCardShell>
  );
}
