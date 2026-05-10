"use client";

import { useEffect, useRef } from "react";
import { trackDealsImpression, trackSectionView } from "../../../lib/deals/metrics";

export default function DealsSectionMetrics({
  sectionId,
  sectionType,
  productSource,
  campaignState,
  campaignId,
}: {
  sectionId: string;
  sectionType: string;
  productSource?: string;
  campaignState?: string;
  campaignId?: string;
}): null {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    trackDealsImpression({ sectionId, sectionType, productSource, campaignState, campaignId });
    trackSectionView({ sectionId, sectionType, productSource, campaignState, campaignId });
  }, [sectionId, sectionType, productSource, campaignState, campaignId]);
  return null;
}

