import type { AffiliateRealtimeActivityClient } from "@/components/storefront/use-affiliate-analytics-hooks";
import type { AffiliateTrackingStreamTickV1 } from "@/lib/affiliate-tracking-stream-types";

const CLICK_LIKE = new Set(["AFFILIATE_CLICK", "PAGE_VIEW", "PRODUCT_VIEW", "ADD_TO_CART", "CHECKOUT_STARTED"]);

function syntheticClickId(ts: number): string {
  return `sse-${ts}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Merge batched bus ticks into the last realtime snapshot (incremental UI, no full dashboard refetch).
 */
export function mergeAffiliateStreamTicksIntoActivity(
  base: AffiliateRealtimeActivityClient,
  ticks: AffiliateTrackingStreamTickV1[],
): AffiliateRealtimeActivityClient {
  if (!ticks.length) return base;
  const nextRealtime = { ...base.realtime };
  let recentClicks = [...base.recentClicks];
  let recentConversions = [...base.recentConversions];
  let activeVisitors = base.activeVisitors;

  for (const t of ticks) {
    if (t.sink === "pipeline") continue;

    if (t.sink === "traffic" && t.trafficEventType && CLICK_LIKE.has(t.trafficEventType)) {
      nextRealtime.clicksLast5m += 1;
      recentClicks = [
        {
          id: syntheticClickId(t.ts),
          createdAt: new Date(t.ts).toISOString(),
          pathname: t.pathname ?? null,
          trafficSource: undefined,
          referrer: null,
          device: null,
        },
        ...recentClicks,
      ].slice(0, 14);
      activeVisitors = Math.max(activeVisitors, 1);
    }

    if (t.sink === "conversion" && t.channel === "tracking.converted") {
      nextRealtime.conversionsLast5m += 1;
      recentConversions = [
        {
          id: syntheticClickId(t.ts + 1),
          createdAt: new Date(t.ts).toISOString(),
          orderId: null,
          revenue: 0,
          commission: 0,
        },
        ...recentConversions,
      ].slice(0, 14);
    }

    if (t.sink === "attribution") {
      /* subtle pulse: bump activeVisitors minimally so sparkline can react */
      activeVisitors = Math.max(activeVisitors, 1);
    }
  }

  return {
    ...base,
    activeVisitors,
    realtime: nextRealtime,
    recentClicks,
    recentConversions,
    recentOrders: base.recentOrders,
  };
}
