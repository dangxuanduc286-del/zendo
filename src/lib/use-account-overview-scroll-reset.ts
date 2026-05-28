"use client";

import { useEffect } from "react";
import { resetAccountOverviewScroll } from "./account-tab-navigation";

/** Khi tab Tổng quan active: scroll window về 0 (sau layout / lazy chunk). */
export function useAccountOverviewScrollReset(activeTab: string, enabled = true): void {
  useEffect(() => {
    if (!enabled || activeTab !== "overview") return;

    resetAccountOverviewScroll();
    const t = window.setTimeout(resetAccountOverviewScroll, 120);
    return () => window.clearTimeout(t);
  }, [activeTab, enabled]);
}
