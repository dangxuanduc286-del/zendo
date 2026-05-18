"use client";

import { memo } from "react";
import type { AffiliateSubTab } from "@/lib/affiliate-account-dashboard-model";
import type { AffiliateAccountDashboardTabProps } from "../affiliate/affiliate-account-dashboard-tab";
import type { CtvProfileIdentityCardProps } from "./ctv-profile-identity-card";
import { CtvDesktopAffiliateBlock } from "./ctv-desktop-affiliate-block";

export type CtvOverviewDashboardProps = AffiliateAccountDashboardTabProps &
  Omit<CtvProfileIdentityCardProps, "commissionAmount" | "rewardPoints" | "loyaltyPoints" | "refCode"> & {
    loyaltyPoints: number;
    refCode: string;
    onSelectSubTab: (sub: AffiliateSubTab) => void;
    overviewLayout?: "all" | "desktop";
    embedInPageOverview?: boolean;
  };

/** Tab Tổng quan: hero + rank + ví + KPI + workspace affiliate (desktop). */
function CtvOverviewDashboardInner(props: CtvOverviewDashboardProps): JSX.Element {
  return <CtvDesktopAffiliateBlock {...props} />;
}

export const CtvOverviewDashboard = memo(CtvOverviewDashboardInner);
