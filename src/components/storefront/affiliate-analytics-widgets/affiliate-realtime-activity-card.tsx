"use client";

import { clsx } from "clsx";
import { CircleDollarSign, MousePointer2, Percent, Users } from "lucide-react";
import { useMemo } from "react";
import {
  CTV_COLOR_BORDER,
  CTV_COLOR_SURFACE_TABLE_HEAD,
} from "../affiliate/affiliate-ctv-account-ui-tokens";
import {
  useAffiliateAnalyticsOverview,
  useAffiliateRealtime,
  type RangeKey,
} from "../use-affiliate-analytics-hooks";
import { fmtVnd, formatRelativeVi } from "./affiliate-analytics-format";
import {
  AnalyticsCardBody,
  AnalyticsCardError,
  AnalyticsCardHeader,
  AnalyticsCardShell,
  AnalyticsRealtimeMetricGrid,
  AnalyticsRealtimeMetricTab,
  AnalyticsRealtimeMetricsSkeleton,
} from "./affiliate-analytics-card-ui";

const HEADING_ID = "affiliate-widget-realtime-activity";

type OverviewQuery = ReturnType<typeof useAffiliateAnalyticsOverview>;

export default function AffiliateRealtimeActivityCard(props: {
  range: RangeKey;
  enabled: boolean;
  sharedOverview?: OverviewQuery;
}): JSX.Element {
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

  const loading = !activity && (overview.loading || (useFallback && realtime.loading));
  const refreshing = overview.refreshing || (useFallback && realtime.refreshing);

  const hint = useFallback
    ? "API tổng quan cũ — dùng endpoint realtime riêng"
    : "Đồng bộ tổng quan — ít request hơn";

  return (
    <AnalyticsCardShell headingId={HEADING_ID}>
      <AnalyticsCardHeader id={HEADING_ID} title="Realtime" hint={hint} />
      <AnalyticsCardBody className="gap-2.5 sm:gap-3">
        {loading ? (
          <AnalyticsRealtimeMetricsSkeleton />
        ) : (
          <AnalyticsRealtimeMetricGrid>
            <AnalyticsRealtimeMetricTab
              icon={Users}
              label="Online"
              value={`${activity?.activeVisitors ?? 0}`}
              tone="emerald"
              pulse={refreshing}
            />
            <AnalyticsRealtimeMetricTab
              icon={MousePointer2}
              label="Click 5 phút"
              value={`${activity?.realtime?.clicksLast5m ?? 0}`}
              pulse={refreshing}
            />
            <AnalyticsRealtimeMetricTab
              icon={Percent}
              label="Chuyển đổi 5 phút"
              value={`${activity?.realtime?.conversionsLast5m ?? 0}`}
              tone="emerald"
            />
            <AnalyticsRealtimeMetricTab
              icon={CircleDollarSign}
              label="Doanh thu 5 phút"
              value={fmtVnd(activity?.realtime?.revenueLast5m ?? 0)}
              tone="fuchsia"
            />
          </AnalyticsRealtimeMetricGrid>
        )}
        {activity?.recentClicks?.length ? (
          <div className="w-full min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Click gần đây</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {activity.recentClicks.slice(0, 6).map((c) => (
                <div
                  key={c.id}
                  className={clsx("min-h-[3.25rem] rounded-xl border px-3 py-2", CTV_COLOR_BORDER, CTV_COLOR_SURFACE_TABLE_HEAD)}
                >
                  <p className="truncate text-sm font-semibold text-slate-900">{c.pathname || "Trang"}</p>
                  <p className="mt-0.5 truncate text-[11px] text-slate-500">
                    {formatRelativeVi(c.createdAt)}
                    {c.trafficSource ? (
                      <>
                        {" · "}
                        <span className="font-semibold text-slate-800">{c.trafficSource}</span>
                      </>
                    ) : null}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        {(overview.error || realtime.error) && !activity ? (
          <AnalyticsCardError message={overview.error ?? realtime.error ?? ""} />
        ) : null}
      </AnalyticsCardBody>
    </AnalyticsCardShell>
  );
}
