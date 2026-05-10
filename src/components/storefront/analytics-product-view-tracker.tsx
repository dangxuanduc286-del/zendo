"use client";

import { useEffect } from "react";
import { guiSuKienAnalyticsClient } from "../../lib/analytics/event-client";

interface AnalyticsProductViewTrackerProps {
  pathname: string;
  productId: string;
}

export default function AnalyticsProductViewTracker({
  pathname,
  productId,
}: AnalyticsProductViewTrackerProps): JSX.Element | null {
  useEffect(() => {
    if (!productId) return;
    guiSuKienAnalyticsClient({
      eventName: "product_view",
      pathname,
      productId,
    }).catch(() => {});
  }, [pathname, productId]);

  return null;
}

