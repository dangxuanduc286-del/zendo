"use client";

import { memo, useMemo } from "react";
import { getCtvRankFromTiers } from "@/lib/ctv/ctv-membership-tier-logic";
import { useCtvMembershipTiers } from "@/lib/ctv/use-ctv-membership-tiers";
import type { CtvProfileIdentityCardProps } from "./ctv-profile-identity-card";
import { CtvProfileIdentityCard } from "./ctv-profile-identity-card";
import { CtvCommissionHero } from "./ctv-commission-hero";
import { CtvMemberRankCard } from "./ctv-member-rank-card";
import { CtvPerformanceSection } from "./ctv-performance-section";
import { CtvTierProgressWidget } from "./ctv-tier-progress-widget";
import type { CtvTierProgressSummary } from "@/lib/ctv/ctv-affiliate-lifecycle";
import type { CtvAffiliateMetrics } from "@/lib/ctv/use-ctv-affiliate-metrics";
import {
  CTV_HUB_LAYOUT_STACK,
  CTV_HUB_MAIN_WRAP,
  CTV_HUB_MOBILE_ORDER_ACCOUNT,
  CTV_HUB_MOBILE_ORDER_PERFORMANCE,
  CTV_HUB_MOBILE_ORDER_WALLET,
  CTV_HUB_ROW_SPLIT,
  CTV_HUB_SECTION_SHELL,
} from "./ctv-ui-tokens";

export type CtvProfileHeaderProps = CtvProfileIdentityCardProps & {
  ctvRankRevenue: number;
  ctvRankRevenueLoading?: boolean;
  grantedCtvTierIds?: string[];
  withdrawableBalance: number;
  waitingReleaseCommission: number;
  conversionRatePercent: number | null;
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
    conversionRatePercent,
    metrics,
    withdrawalEnabled,
    onWithdraw,
    ctvTierProgress = null,
    ctvTierProgressLoading = false,
    ...identityProps
  } = props;

  const { tiers, loading: tiersLoading } = useCtvMembershipTiers();

  const rankCardGradient = useMemo(() => {
    if (tiers.length === 0) return "from-slate-100 via-slate-50 to-white";
    return getCtvRankFromTiers(ctvRankRevenue, tiers).color.gradient;
  }, [ctvRankRevenue, tiers]);

  return (
    <main className={CTV_HUB_MAIN_WRAP} aria-label="Trung tâm CTV — kiếm tiền và hiệu suất">
      <section className={CTV_HUB_SECTION_SHELL} aria-labelledby="ctv-hub-title">
        <header className="mb-6">
          <h1
            id="ctv-hub-title"
            className="text-lg font-semibold leading-tight tracking-tight text-[#111827] sm:text-xl"
          >
            Trung tâm CTV
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
            Xem hoa hồng, cấp bậc và hiệu suất kiếm tiền của bạn
          </p>
        </header>

        <div className={CTV_HUB_LAYOUT_STACK}>
          <div className={`${CTV_HUB_MOBILE_ORDER_ACCOUNT} ${CTV_HUB_ROW_SPLIT}`}>
            <CtvProfileIdentityCard {...identityProps} />
            <CtvMemberRankCard
              totalRevenue={ctvRankRevenue}
              tiers={tiers}
              grantedTierIds={grantedCtvTierIds}
              loading={ctvRankRevenueLoading}
              tiersLoading={tiersLoading}
            />
          </div>

          {ctvTierProgress ? (
            <CtvTierProgressWidget progress={ctvTierProgress} loading={ctvTierProgressLoading} />
          ) : null}

          <div className={CTV_HUB_MOBILE_ORDER_WALLET}>
            <CtvCommissionHero
              withdrawableBalance={withdrawableBalance}
              waitingReleaseCommission={waitingReleaseCommission}
              withdrawalEnabled={withdrawalEnabled}
              onWithdraw={onWithdraw}
              cardGradient={rankCardGradient}
            />
          </div>

          <div className={CTV_HUB_MOBILE_ORDER_PERFORMANCE}>
            <CtvPerformanceSection metrics={metrics} conversionRatePercent={conversionRatePercent} />
          </div>
        </div>
      </section>
    </main>
  );
}

export const CtvProfileHeader = memo(CtvProfileHeaderInner);
