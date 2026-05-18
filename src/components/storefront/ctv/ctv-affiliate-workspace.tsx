"use client";

import { memo, useEffect, useState } from "react";
import type { AffiliateSubTab } from "@/lib/affiliate-account-dashboard-model";
import { AffiliateAccountDashboardTab } from "../affiliate/affiliate-account-dashboard-tab";
import type { AffiliateAccountDashboardTabProps } from "../affiliate/affiliate-account-dashboard-tab";
import { CtvSegmentedTabs } from "./ctv-segmented-tabs";
import { CTV_MOTION_CLASS } from "./ctv-motion-tokens";
import { CTV_MOBILE_SAFE, CTV_V2_CONTENT } from "./ctv-ui-tokens";
type CtvAffiliateWorkspaceProps = Omit<AffiliateAccountDashboardTabProps, "uiShell" | "panelClassName"> & {
  affiliateSubTabs: Array<{ key: AffiliateSubTab; label: string }>;
  /** Tab trang Tổng quan: bỏ sub-tab trùng KPI hero. */
  embedInPageOverview?: boolean;
};

function CtvAffiliateWorkspaceInner({
  affiliateSubTabs,
  activeSubTab,
  embedInPageOverview = false,
  ...panelProps
}: CtvAffiliateWorkspaceProps): JSX.Element {
  const visibleSubTabs = embedInPageOverview
    ? affiliateSubTabs.filter((tab) => tab.key !== "overview")
    : affiliateSubTabs;
  const panelSubTab =
    embedInPageOverview && activeSubTab === "overview" ? ("links" as AffiliateSubTab) : activeSubTab;
  const [panelPhase, setPanelPhase] = useState<"idle" | "enter">("idle");

  useEffect(() => {
    setPanelPhase("enter");
    const t = window.setTimeout(() => setPanelPhase("idle"), 200);
    return () => window.clearTimeout(t);
  }, [panelSubTab]);

  return (
    <section className={`${CTV_MOBILE_SAFE} min-w-0 space-y-4 max-md:space-y-4`} aria-label="Không gian làm việc CTV">
      <CtvSegmentedTabs tabs={visibleSubTabs} activeKey={activeSubTab} onSelect={panelProps.onSelectSubTab} />
      <div
        id={`ctv-panel-${panelSubTab}`}
        role="tabpanel"
        aria-labelledby={`ctv-tab-${panelSubTab}`}
        className={`mt-3 min-w-0 ${CTV_V2_CONTENT} ${CTV_MOTION_CLASS.panel} ${
          panelPhase === "enter" ? "opacity-90" : "opacity-100"
        }`}
      >
        <AffiliateAccountDashboardTab
          {...panelProps}
          activeSubTab={panelSubTab}
          uiShell="ctv-panels"
          showGrowthToolkit={panelProps.showGrowthToolkit ?? true}
          embedInPageOverview={embedInPageOverview}
        />
      </div>
    </section>
  );
}

export const CtvAffiliateWorkspace = memo(CtvAffiliateWorkspaceInner);
