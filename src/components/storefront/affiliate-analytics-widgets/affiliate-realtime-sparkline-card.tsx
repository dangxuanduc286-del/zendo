"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CTV_SEGMENTED_PILL_ITEM,
  CTV_SEGMENTED_PILL_ITEM_ACTIVE,
} from "../ctv/ctv-ui-tokens";
import {
  useAffiliateAnalyticsOverview,
  useAffiliateRealtime,
  type RangeKey,
} from "../use-affiliate-analytics-hooks";
import CreatorRealtimeSparklineLazy from "../affiliate-creator-charts/creator-realtime-sparkline-lazy";
import type { RtPoint } from "../affiliate-creator-charts/creator-realtime-sparkline-inner";
import {
  AnalyticsCardBody,
  AnalyticsCardError,
  AnalyticsCardHeader,
  AnalyticsCardShell,
  AnalyticsCardSkeleton,
  AnalyticsCardToolbar,
  AnalyticsChartContainer,
} from "./affiliate-analytics-card-ui";

const HEADING_ID = "affiliate-widget-realtime-sparkline";

type OverviewQuery = ReturnType<typeof useAffiliateAnalyticsOverview>;

export default function AffiliateRealtimeSparklineCard(props: {
  range: RangeKey;
  enabled: boolean;
  sharedOverview?: OverviewQuery;
}): JSX.Element {
  const [rtWindow, setRtWindow] = useState<5 | 15 | 60>(15);
  const [rtHistory, setRtHistory] = useState<RtPoint[]>([]);

  const overviewHook = useAffiliateAnalyticsOverview({
    range: props.range,
    enabled: props.enabled && props.sharedOverview == null,
  });
  const overview = props.sharedOverview ?? overviewHook;
  const useFallback = props.enabled && Boolean(overview.data) && !overview.data.realtimeActivity;
  const realtime = useAffiliateRealtime({
    enabled: useFallback,
    pollActive: true,
  });

  const activity = useMemo(() => {
    const bundled = overview.data?.realtimeActivity;
    if (bundled) return bundled;
    const d = realtime.data;
    if (!d?.realtime) return null;
    return {
      ok: true as const,
      activeVisitors: d.activeVisitors,
      realtime: d.realtime,
      recentClicks: d.recentClicks,
      recentConversions: d.recentConversions,
      recentOrders: d.recentOrders,
    };
  }, [overview.data?.realtimeActivity, realtime.data]);

  const pollSignature = useMemo(() => {
    if (!activity?.realtime) return "";
    const r = activity.realtime;
    return `${activity.activeVisitors}|${r.clicksLast5m}|${r.conversionsLast5m}|${r.revenueLast5m}`;
  }, [activity]);

  useEffect(() => {
    setRtHistory([]);
  }, [props.range]);

  useEffect(() => {
    if (!props.enabled || !pollSignature || !activity?.realtime) return;
    const r = activity.realtime;
    setRtHistory((prev) =>
      [...prev, { t: Date.now(), clicks: r.clicksLast5m, online: activity.activeVisitors, conv: r.conversionsLast5m }].slice(-120),
    );
  }, [props.enabled, pollSignature, activity]);

  const loading = !activity && (overview.loading || (useFallback && realtime.loading));

  return (
    <AnalyticsCardShell headingId={HEADING_ID}>
      <AnalyticsCardHeader id={HEADING_ID} title="Realtime" hint="Không rung layout · theo cửa sổ thời gian" />
      <AnalyticsCardBody>
        <AnalyticsCardToolbar>
          {([5, 15, 60] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setRtWindow(m)}
              className={rtWindow === m ? CTV_SEGMENTED_PILL_ITEM_ACTIVE : CTV_SEGMENTED_PILL_ITEM}
            >
              {m === 60 ? "1h" : `${m}p`}
            </button>
          ))}
        </AnalyticsCardToolbar>
        <AnalyticsChartContainer>
          {loading ? (
            <AnalyticsCardSkeleton />
          ) : (
            <div className="h-full w-full min-w-0">
              <CreatorRealtimeSparklineLazy history={rtHistory} windowMinutes={rtWindow} />
            </div>
          )}
        </AnalyticsChartContainer>
        {(overview.error || realtime.error) && !activity ? (
          <AnalyticsCardError message={overview.error ?? realtime.error ?? ""} />
        ) : null}
      </AnalyticsCardBody>
    </AnalyticsCardShell>
  );
}
