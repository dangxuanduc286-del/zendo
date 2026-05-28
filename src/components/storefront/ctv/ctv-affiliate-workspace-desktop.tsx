"use client";

import { memo } from "react";
import { useAffiliateAccountDashboardModel } from "@/lib/affiliate-account-dashboard-model";
import type { AffiliateAccountDashboardTabProps } from "../affiliate/affiliate-account-dashboard-tab";
import { HandCoins } from "lucide-react";
import { AccountPageTabPanel } from "../account-page-tab-panel";
import { CtvAffiliateDashboardProvider } from "./ctv-affiliate-dashboard-context";
import { CtvAffiliateWorkspace } from "./ctv-affiliate-workspace";

type CtvAffiliateWorkspaceDesktopProps = AffiliateAccountDashboardTabProps;

/** Chỉ workspace CTV (tabs + panel) — không có profile/rank hero. Desktop lg+. */
function CtvAffiliateWorkspaceDesktopInner(props: CtvAffiliateWorkspaceDesktopProps): JSX.Element {
  const model = useAffiliateAccountDashboardModel(props.accountSettings, props.data, {
    dashboardEnabled: props.activeSubTab !== "history",
    metricsEnabled: props.activeSubTab === "overview",
    runDashboardLifecycle: props.activeSubTab === "overview" || props.activeSubTab === "revenueRewards",
  });

  return (
    <CtvAffiliateDashboardProvider model={model}>
      <div className="hidden min-w-0 lg:block">
        <AccountPageTabPanel
          id="ctv-affiliate"
          title={props.accountSettings.affiliateTitle || "CTV / Affiliate"}
          description={
            props.accountSettings.affiliateSubtitle ||
            "Theo dõi hiệu suất giới thiệu, hoa hồng và điểm thưởng của bạn."
          }
          icon={<HandCoins className="h-5 w-5" strokeWidth={1.75} aria-hidden />}
          headingLevel="h1"
        >
        <CtvAffiliateWorkspace
          accountSettings={props.accountSettings}
          data={props.data}
          supportHref={props.supportHref}
          shoppingHomeHref={props.shoppingHomeHref}
          activeSubTab={props.activeSubTab}
          onSelectSubTab={props.onSelectSubTab}
          highlightOrderCode={props.highlightOrderCode}
          showGrowthToolkit={props.showGrowthToolkit}
          affiliateSubTabs={model.affiliateSubTabs}
        />
        </AccountPageTabPanel>
      </div>
    </CtvAffiliateDashboardProvider>
  );
}

export const CtvAffiliateWorkspaceDesktop = memo(CtvAffiliateWorkspaceDesktopInner);
