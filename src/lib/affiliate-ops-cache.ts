import "server-only";


/** Gom refresh cache analytics (server-only, tránh vòng import). */
export async function clearAllAffiliateAnalyticsCaches(): Promise<void> {
  const [a, t, ad, rt] = await Promise.all([
    import("@/lib/affiliate-analytics"),
    import("@/lib/affiliate-traffic-analytics"),
    import("@/lib/admin-affiliate-analytics"),
    import("@/lib/affiliate-realtime-metrics"),
  ]);
  a.clearAffiliateAnalyticsOverviewServiceCache();
  t.clearAffiliateTrafficAnalyticsCache();
  ad.clearAdminAffiliateOverviewCache();
  rt.clearAffiliateRealtimeMetricsCache();}

export async function getAffiliateAnalyticsCacheFootprint(): Promise<{
  affiliateOverviewEntries: number;
  trafficAnalyticsEntries: number;
  adminOverviewEntries: number;
  realtimeMetricsEntries: number;
}> {
  const [a, t, ad, rt] = await Promise.all([
    import("@/lib/affiliate-analytics"),
    import("@/lib/affiliate-traffic-analytics"),
    import("@/lib/admin-affiliate-analytics"),
    import("@/lib/affiliate-realtime-metrics"),
  ]);
  return {
    affiliateOverviewEntries: a.getAffiliateAnalyticsOverviewCacheSize(),
    trafficAnalyticsEntries: t.getAffiliateTrafficAnalyticsCacheSize(),
    adminOverviewEntries: ad.getAdminAffiliateOverviewCacheSize(),
    realtimeMetricsEntries: rt.getAffiliateRealtimeMetricsCacheSize(),
  };
}
