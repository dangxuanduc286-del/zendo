"use client";

import { Megaphone } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  CTV_SEGMENTED_PILL_ITEM,
  CTV_SEGMENTED_PILL_ITEM_ACTIVE,
} from "../ctv/ctv-ui-tokens";
import { scheduleIdleWork } from "@/lib/next-dev-stability";
import { useAffiliateCampaignList, type RangeKey } from "../use-affiliate-analytics-hooks";
import CreatorCampaignBarsLazy from "../affiliate-creator-charts/creator-campaign-bars-lazy";
import {
  AnalyticsCardBody,
  AnalyticsCardError,
  AnalyticsCardHeader,
  AnalyticsCardShell,
  AnalyticsCardSkeleton,
  AnalyticsCardToolbar,
  AnalyticsChartContainer,
  AnalyticsEmptyState,
} from "./affiliate-analytics-card-ui";

const HEADING_ID = "affiliate-widget-top-campaign";

export default function AffiliateTopCampaignCard(props: { range: RangeKey; tabEnabled: boolean }): JSX.Element {
  const [idleReady, setIdleReady] = useState(false);
  const [campaignMetric, setCampaignMetric] = useState<"revenue" | "epc" | "clicks">("revenue");

  useEffect(() => {
    if (!props.tabEnabled) {
      setIdleReady(false);
      return;
    }
    setIdleReady(false);
    const cancel = scheduleIdleWork(() => setIdleReady(true), 520);
    return cancel;
  }, [props.tabEnabled, props.range]);

  const query = useAffiliateCampaignList({
    range: props.range,
    enabled: props.tabEnabled && idleReady,
  });

  const barRows = useMemo(
    () =>
      (query.data?.campaigns ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        clicks: c.stats.clicks,
        revenue: c.stats.revenue,
        commission: c.stats.commission,
        epc: c.stats.epc,
        conversion: c.stats.conversion,
      })),
    [query.data?.campaigns],
  );

  const hasData = barRows.length > 0;

  return (
    <AnalyticsCardShell headingId={HEADING_ID}>
      <AnalyticsCardHeader id={HEADING_ID} title="Campaign mạnh" hint="Top theo tiêu chí sort" />
      <AnalyticsCardBody>
        <AnalyticsCardToolbar>
          {(
            [
              { k: "revenue" as const, label: "Doanh thu" },
              { k: "epc" as const, label: "EPC" },
              { k: "clicks" as const, label: "Click" },
            ] as const
          ).map((x) => (
            <button
              key={x.k}
              type="button"
              onClick={() => setCampaignMetric(x.k)}
              className={campaignMetric === x.k ? CTV_SEGMENTED_PILL_ITEM_ACTIVE : CTV_SEGMENTED_PILL_ITEM}
            >
              {x.label}
            </button>
          ))}
        </AnalyticsCardToolbar>
        <AnalyticsChartContainer>
          {query.loading && !query.data ? (
            <AnalyticsCardSkeleton />
          ) : !hasData ? (
            <AnalyticsEmptyState
              icon={Megaphone}
              title="Chưa có campaign"
              description="Tạo campaign để xem thứ hạng theo tiêu chí."
            />
          ) : (
            <div className={`h-full w-full min-w-0 ${query.refreshing ? "opacity-75" : "opacity-100"}`}>
              <CreatorCampaignBarsLazy rows={barRows} metric={campaignMetric} />
            </div>
          )}
        </AnalyticsChartContainer>
        {query.error ? <AnalyticsCardError message={query.error} onRetry={query.refetch} /> : null}
      </AnalyticsCardBody>
    </AnalyticsCardShell>
  );
}
