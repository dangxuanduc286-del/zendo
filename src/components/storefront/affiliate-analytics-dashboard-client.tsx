"use client";

import AffiliateAnalyticsDashboard from "./affiliate-analytics-dashboard";

/** Client boundary cho trang analytics — import tĩnh tránh lệch chunk/manifest khi HMR. */
export default function AffiliateAnalyticsDashboardClient(props: {
  affiliateRefCode: string;
  initialMenuKey?: string;
}): JSX.Element {
  return <AffiliateAnalyticsDashboard {...props} />;
}
