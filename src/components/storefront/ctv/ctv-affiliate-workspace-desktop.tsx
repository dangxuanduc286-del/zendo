"use client";

import { memo } from "react";
import { useAffiliateAccountDashboardModel } from "@/lib/affiliate-account-dashboard-model";
import type { AffiliateAccountDashboardTabProps } from "../affiliate/affiliate-account-dashboard-tab";
import { CtvAffiliateDashboardProvider } from "./ctv-affiliate-dashboard-context";
import { CtvAffiliateWorkspace } from "./ctv-affiliate-workspace";

type CtvAffiliateWorkspaceDesktopProps = AffiliateAccountDashboardTabProps;

/** Chỉ workspace CTV (tabs + panel) — không có profile/rank hero. Desktop lg+. */
function CtvAffiliateWorkspaceDesktopInner(props: CtvAffiliateWorkspaceDesktopProps): JSX.Element {
  const model = useAffiliateAccountDashboardModel(props.accountSettings, props.data);

  return (
    <CtvAffiliateDashboardProvider model={model}>
      <div className="hidden min-w-0 lg:block">
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
      </div>
    </CtvAffiliateDashboardProvider>
  );
}

export const CtvAffiliateWorkspaceDesktop = memo(CtvAffiliateWorkspaceDesktopInner);
