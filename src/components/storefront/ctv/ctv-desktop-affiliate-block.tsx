"use client";

import { memo, useMemo } from "react";
import type { AffiliateSubTab } from "@/lib/affiliate-account-dashboard-model";
import { useAffiliateAccountDashboardModel } from "@/lib/affiliate-account-dashboard-model";
import { useCtvAffiliateMetrics } from "@/lib/ctv/use-ctv-affiliate-metrics";
import type { AffiliateAccountDashboardTabProps } from "../affiliate/affiliate-account-dashboard-tab";
import type { CtvProfileIdentityCardProps } from "./ctv-profile-identity-card";
import { CtvProfileHeader } from "./ctv-profile-header";
import { CtvAffiliateWorkspace } from "./ctv-affiliate-workspace";
import { CtvAffiliateDashboardProvider } from "./ctv-affiliate-dashboard-context";
import { useCtvRankRevenue } from "@/lib/ctv/use-ctv-rank-revenue";
import { CTV_V2_STACK_GAP } from "./ctv-ui-tokens";
import { CtvMobilePageShell } from "./ctv-mobile-page-shell";

type CtvDesktopAffiliateBlockProps = AffiliateAccountDashboardTabProps &
  Omit<CtvProfileIdentityCardProps, "commissionAmount" | "rewardPoints" | "loyaltyPoints" | "refCode"> & {
    loyaltyPoints: number;
    refCode: string;
    onSelectSubTab: (sub: AffiliateSubTab) => void;
    /** Tab Tổng quan trang: hiện hero + workspace trên mọi breakpoint. */
    overviewLayout?: "all" | "desktop";
    /** Ẩn sub-tab «overview» trùng KPI với hero phía trên. */
    embedInPageOverview?: boolean;
  };

function pickProfileIdentityProps(props: {
  accountSettings: CtvProfileIdentityCardProps["accountSettings"];
  displayName: string;
  contactText: string;
  refCode: string;
  badge: string;
  currentAvatar: string;
  avatarUrl: string;
  avatarInputRef: CtvProfileIdentityCardProps["avatarInputRef"];
  avatarUploading: boolean;
  onPickAvatar: () => void;
  onAvatarFileChange: CtvProfileIdentityCardProps["onAvatarFileChange"];
  onRemoveAvatar: () => void;
  onEditProfile?: () => void;
  showProfileLink: boolean;
  orderLookupHref: string;
  commissionAmount: number;
  rewardPoints: number;
  loyaltyPoints: number;
}): CtvProfileIdentityCardProps {
  return {
    accountSettings: props.accountSettings,
    displayName: props.displayName,
    contactText: props.contactText,
    refCode: props.refCode,
    badge: props.badge,
    currentAvatar: props.currentAvatar,
    avatarUrl: props.avatarUrl,
    avatarInputRef: props.avatarInputRef,
    avatarUploading: props.avatarUploading,
    onPickAvatar: props.onPickAvatar,
    onAvatarFileChange: props.onAvatarFileChange,
    onRemoveAvatar: props.onRemoveAvatar,
    onEditProfile: props.onEditProfile,
    showProfileLink: props.showProfileLink,
    orderLookupHref: props.orderLookupHref,
    commissionAmount: props.commissionAmount,
    rewardPoints: props.rewardPoints,
    loyaltyPoints: props.loyaltyPoints,
  };
}

function CtvDesktopAffiliateBlockInner({
  accountSettings,
  data,
  supportHref,
  shoppingHomeHref,
  activeSubTab,
  onSelectSubTab,
  highlightOrderCode,
  showGrowthToolkit,
  loyaltyPoints,
  refCode,
  overviewLayout = "desktop",
  embedInPageOverview = false,
  ...identityRest
}: CtvDesktopAffiliateBlockProps): JSX.Element {
  const model = useAffiliateAccountDashboardModel(accountSettings, data);
  const metrics = useCtvAffiliateMetrics(Boolean(data.affiliate.hasProfile && data.affiliate.isActive));

  const commissionAmount = model.approvedCommission;
  const rewardPoints = Number(data.stats.rewardPoints ?? 0);

  const identityProps = pickProfileIdentityProps({
    ...identityRest,
    accountSettings,
    refCode,
    loyaltyPoints,
    commissionAmount,
    rewardPoints,
  });

  const shellVisibility = overviewLayout === "all" ? "flex" : "hidden lg:flex";

  const withdrawalEnabled = Boolean(
    accountSettings.affiliateShowWithdrawals && model.affDash.data?.program.withdrawalEnabled,
  );

  const conversionRatePercent = useMemo(() => {
    const s = model.affDash.data?.summary;
    if (s?.conversionRatePercent != null) return s.conversionRatePercent;
    return null;
  }, [model.affDash.data?.summary]);

  const { totalRevenue: ctvRankRevenue, loading: ctvRankRevenueLoading } = useCtvRankRevenue(model.affDash);

  return (
    <CtvAffiliateDashboardProvider model={model}>
      <CtvMobilePageShell className={`${shellVisibility} flex flex-col ${CTV_V2_STACK_GAP}`}>
        <CtvProfileHeader
          {...identityProps}
          ctvRankRevenue={ctvRankRevenue}
          ctvRankRevenueLoading={ctvRankRevenueLoading}
          withdrawableBalance={model.withdrawableBalanceUi}
          conversionRatePercent={conversionRatePercent}
          metrics={metrics}
          withdrawalEnabled={withdrawalEnabled}
          onWithdraw={() => onSelectSubTab("withdrawal")}
        />
        <CtvAffiliateWorkspace
          accountSettings={accountSettings}
          data={data}
          supportHref={supportHref}
          shoppingHomeHref={shoppingHomeHref}
          activeSubTab={activeSubTab}
          onSelectSubTab={onSelectSubTab}
          highlightOrderCode={highlightOrderCode}
          showGrowthToolkit={showGrowthToolkit}
          affiliateSubTabs={model.affiliateSubTabs}
          embedInPageOverview={embedInPageOverview}
        />
      </CtvMobilePageShell>
    </CtvAffiliateDashboardProvider>
  );
}

export const CtvDesktopAffiliateBlock = memo(CtvDesktopAffiliateBlockInner);
