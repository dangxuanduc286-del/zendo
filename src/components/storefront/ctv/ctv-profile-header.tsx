"use client";

import { memo } from "react";
import type { CtvProfileIdentityCardProps } from "./ctv-profile-identity-card";
import { CtvProfileIdentityCard } from "./ctv-profile-identity-card";
import { CtvRankPerformanceCard } from "./ctv-rank-performance-card";
import type { CtvAffiliateMetrics } from "@/lib/ctv/use-ctv-affiliate-metrics";
import { CTV_MOBILE_SAFE, CTV_V2_DASHBOARD_HEADER_GRID } from "./ctv-ui-tokens";

export type CtvProfileHeaderProps = CtvProfileIdentityCardProps & {
  ctvRankRevenue: number;
  ctvRankRevenueLoading?: boolean;
  withdrawableBalance: number;
  conversionRatePercent: number | null;
  metrics: CtvAffiliateMetrics;
  withdrawalEnabled: boolean;
  onWithdraw: () => void;
};

function CtvProfileHeaderInner(props: CtvProfileHeaderProps): JSX.Element {
  const {
    ctvRankRevenue,
    ctvRankRevenueLoading,
    withdrawableBalance,
    conversionRatePercent,
    metrics,
    withdrawalEnabled,
    onWithdraw,
    ...identityProps
  } = props;

  return (
    <header className={`${CTV_MOBILE_SAFE} ${CTV_V2_DASHBOARD_HEADER_GRID}`} aria-label="Tổng quan tài khoản CTV">
      <CtvProfileIdentityCard {...identityProps} />
      <CtvRankPerformanceCard
        ctvRankRevenue={ctvRankRevenue}
        ctvRankRevenueLoading={ctvRankRevenueLoading}
        withdrawableBalance={withdrawableBalance}
        conversionRatePercent={conversionRatePercent}
        metrics={metrics}
        withdrawalEnabled={withdrawalEnabled}
        onWithdraw={onWithdraw}
      />
    </header>
  );
}

export const CtvProfileHeader = memo(CtvProfileHeaderInner);
