"use client";

import { memo } from "react";
import { useCtvMembershipTiers } from "@/lib/ctv/use-ctv-membership-tiers";
import type { CtvProfileIdentityCardProps } from "./ctv-profile-identity-card";
import { CtvProfileIdentityCard } from "./ctv-profile-identity-card";
import { CtvCommissionHero } from "./ctv-commission-hero";
import { CtvMemberRankCard } from "./ctv-member-rank-card";
import { CtvPerformanceSection } from "./ctv-performance-section";
import { CtvTierProgressWidget } from "./ctv-tier-progress-widget";
import type { CtvTierProgressSummary } from "@/lib/ctv/ctv-affiliate-lifecycle";
import type { CtvAffiliateMetrics } from "@/lib/ctv/use-ctv-affiliate-metrics";
import { AccountPageTabPanel } from "../account-page-tab-panel";
import {
  CTV_HUB_ACCOUNT_RANK_GROUP,
  CTV_HUB_LAYOUT_STACK,
  CTV_HUB_MAIN_WRAP,
  CTV_HUB_PAGE_PANEL,
  CTV_HUB_MOBILE_ORDER_IDENTITY,
  CTV_HUB_MOBILE_ORDER_PERFORMANCE,
  CTV_HUB_MOBILE_ORDER_RANK,
  CTV_HUB_MOBILE_ORDER_TIER,
  CTV_HUB_MOBILE_ORDER_WALLET,
} from "./ctv-ui-tokens";

export type CtvProfileHeaderProps = CtvProfileIdentityCardProps & {
  ctvRankRevenue: number;
  ctvRankRevenueLoading?: boolean;
  grantedCtvTierIds?: string[];
  withdrawableBalance: number;
  waitingReleaseCommission: number;
  metrics: CtvAffiliateMetrics;
  withdrawalEnabled: boolean;
  onWithdraw: () => void;
  ctvTierProgress?: CtvTierProgressSummary | null;
  ctvTierProgressLoading?: boolean;
};

function CtvProfileHeaderInner(props: CtvProfileHeaderProps): JSX.Element {
  const {
    ctvRankRevenue,
    ctvRankRevenueLoading,
    grantedCtvTierIds = [],
    withdrawableBalance,
    waitingReleaseCommission,
    metrics,
    withdrawalEnabled,
    onWithdraw,
    ctvTierProgress = null,
    ctvTierProgressLoading = false,
    ...identityProps
  } = props;

  const { tiers, loading: tiersLoading, error: tiersError } = useCtvMembershipTiers();

  const showRankCard = !tiersError;

  return (
    <main className={CTV_HUB_MAIN_WRAP} aria-label="Trung tâm CTV — kiếm tiền và hiệu suất">
      <AccountPageTabPanel
        id="ctv-hub"
        title="Trung tâm CTV"
        description="Xem hoa hồng, cấp bậc và hiệu suất kiếm tiền của bạn"
        headingLevel="h1"
        className={CTV_HUB_PAGE_PANEL}
        contentClassName={CTV_HUB_LAYOUT_STACK}
      >
          <div className={CTV_HUB_ACCOUNT_RANK_GROUP}>
            <div className={CTV_HUB_MOBILE_ORDER_IDENTITY}>
              <CtvProfileIdentityCard {...identityProps} />
            </div>
            <div className={CTV_HUB_MOBILE_ORDER_RANK}>
              {showRankCard ? (
                <CtvMemberRankCard
                  totalRevenue={ctvRankRevenue}
                  tiers={tiers}
                  grantedTierIds={grantedCtvTierIds}
                  loading={ctvRankRevenueLoading}
                  tiersLoading={tiersLoading}
                />
              ) : (
                <div
                  className="min-h-[12rem] animate-pulse rounded-2xl bg-slate-100/90 ring-1 ring-slate-200/60"
                  role="status"
                  aria-label="Không tải được cấp bậc CTV"
                />
              )}
            </div>
          </div>

          {ctvTierProgress ? (
            <div className={CTV_HUB_MOBILE_ORDER_TIER}>
              <CtvTierProgressWidget progress={ctvTierProgress} loading={ctvTierProgressLoading} />
            </div>
          ) : null}

          <div className={CTV_HUB_MOBILE_ORDER_WALLET}>
            <CtvCommissionHero
              withdrawableBalance={withdrawableBalance}
              waitingReleaseCommission={waitingReleaseCommission}
              withdrawalEnabled={withdrawalEnabled}
              onWithdraw={onWithdraw}
            />
          </div>

          <div className={CTV_HUB_MOBILE_ORDER_PERFORMANCE}>
            <CtvPerformanceSection metrics={metrics} />
          </div>
      </AccountPageTabPanel>
    </main>
  );
}

export const CtvProfileHeader = memo(CtvProfileHeaderInner);
