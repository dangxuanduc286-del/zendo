"use client";

import { Check } from "lucide-react";
import { memo, useMemo } from "react";
import { useAffiliateDashboardApi } from "@/components/storefront/use-affiliate-dashboard-api";
import { useCtvAffiliateDashboardModel } from "./ctv-affiliate-dashboard-context";
import {
  formatCtvRevenueRewardAmount,
  getCtvRankFromTiers,
  getCtvRevenueRewardTierStatus,
} from "@/lib/ctv/ctv-revenue-rewards";
import { formatCtvRankMoney } from "@/lib/ctv/ctv-membership-tier-logic";
import { useCtvMembershipTiers } from "@/lib/ctv/use-ctv-membership-tiers";
import { useCtvRankRevenue } from "@/lib/ctv/use-ctv-rank-revenue";
import { resolveCtvTierIcon } from "@/lib/ctv/ctv-membership-tier-icons";
import type { CtvMembershipTierRecord } from "@/lib/ctv/ctv-membership-tier-types";
import { CtvFormattedValue } from "./ctv-formatted-value";
import {
  CTV_GRID_TIER_REWARDS,
  CTV_TIER_REWARD_BADGE,
  CTV_TIER_REWARD_BADGE_SLOT,
  CTV_TIER_REWARD_STATUS_GRID_MOBILE,
  CTV_TIER_REWARD_STATUS_MOBILE,
  CTV_TIER_REWARD_STATUS_SLOT_MOBILE,
  CTV_TIER_REWARD_BORDER_BY_CODE,
  CTV_TIER_REWARD_BORDER_FALLBACK,
  CTV_TIER_REWARD_CARD_ACTIVE,
  CTV_TIER_REWARD_CARD_BASE,
  CTV_TIER_REWARD_ICON_GLYPH,
  CTV_TIER_REWARD_ICON_WRAP,
  CTV_TIER_REWARD_REVENUE_LABEL,
  CTV_TIER_REWARD_REVENUE_MOBILE,
  CTV_TIER_REWARD_REVENUE_MOBILE_VALUE,
  CTV_TIER_REWARD_REVENUE_VALUE,
  CTV_TIER_REWARD_REWARD_LABEL,
  CTV_TIER_REWARD_REWARD_ROW,
  CTV_TIER_REWARD_TITLE_COMMISSION,
  CTV_TIER_REWARD_TITLE_NAME,
  CTV_TIER_REWARD_TITLE_ROW,
  CTV_V2_PANEL_INSET,
} from "./ctv-ui-tokens";

type CtvRevenueRewardsPanelProps = {
  affiliateProfileEnabled: boolean;
  affiliateDashboard?: ReturnType<typeof useAffiliateDashboardApi>;
};

/** Hiển thị desktop — UI only, không đổi `formatCtvRevenueRangeLine` (mobile). */
function formatCtvRevenueRangeDesktop(tier: CtvMembershipTierRecord): string {
  return `${formatCtvRankMoney(tier.revenueFrom)} → ${formatCtvRankMoney(tier.revenueTo)}`;
}

/** Hiển thị mobile — giữ format hiện tại. */
function formatCtvRevenueRangeMobile(tier: CtvMembershipTierRecord, isFirst: boolean): string {
  const from = formatCtvRankMoney(tier.revenueFrom);
  const to = formatCtvRankMoney(tier.revenueTo);
  if (isFirst) return `${from} - ${to} / 30 ngày`;
  return `> ${formatCtvRankMoney(tier.revenueFrom)} - ${to} / 30 ngày`;
}

function tierRewardBorderClass(code: string): string {
  return CTV_TIER_REWARD_BORDER_BY_CODE[code] ?? CTV_TIER_REWARD_BORDER_FALLBACK;
}

function RewardTierCard({
  tier,
  tiers,
  totalRevenue,
  grantedTierIds,
  index,
}: {
  tier: CtvMembershipTierRecord;
  tiers: readonly CtvMembershipTierRecord[];
  totalRevenue: number;
  grantedTierIds: ReadonlySet<string>;
  index: number;
}): JSX.Element {
  const { milestone, isCurrent, rankAtTier } = getCtvRevenueRewardTierStatus(
    totalRevenue,
    tier,
    tiers,
    grantedTierIds,
  );
  const Icon = resolveCtvTierIcon(tier.icon);
  const isFirst = index === 0;
  const revenueDesktop = formatCtvRevenueRangeDesktop(tier);
  const revenueMobile = formatCtvRevenueRangeMobile(tier, isFirst);

  return (
    <article
      className={[
        CTV_TIER_REWARD_CARD_BASE,
        tierRewardBorderClass(tier.code),
        rankAtTier.color.gradient,
        isCurrent ? CTV_TIER_REWARD_CARD_ACTIVE : "",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-2">
        <div className={[CTV_TIER_REWARD_ICON_WRAP, rankAtTier.color.iconBg].join(" ")} aria-hidden>
          <Icon className={[CTV_TIER_REWARD_ICON_GLYPH, rankAtTier.color.iconText].join(" ")} strokeWidth={1.6} />
        </div>
      </div>

      <h4 className={CTV_TIER_REWARD_TITLE_ROW}>
        <span className={CTV_TIER_REWARD_TITLE_NAME}>{tier.name}</span>
        <span className={CTV_TIER_REWARD_TITLE_COMMISSION}>| {tier.commissionPercent}%</span>
      </h4>

      <p className={CTV_TIER_REWARD_REVENUE_MOBILE}>
        Doanh thu: <span className={CTV_TIER_REWARD_REVENUE_MOBILE_VALUE}>{revenueMobile}</span>
      </p>
      <div className="mt-1.5 hidden min-w-0 lg:block">
        <p className={CTV_TIER_REWARD_REVENUE_LABEL}>Doanh thu (30 ngày)</p>
        <div className={CTV_TIER_REWARD_REVENUE_VALUE} title={revenueDesktop}>
          <CtvFormattedValue value={revenueDesktop} variant="money-sm" />
        </div>
      </div>

      <p className={CTV_TIER_REWARD_REWARD_ROW}>
        <span className={CTV_TIER_REWARD_REWARD_LABEL}>Thưởng:</span>{" "}
        <CtvFormattedValue
          value={formatCtvRevenueRewardAmount(tier)}
          variant="money-sm"
          className={tier.badgeColor.amountText}
        />
      </p>

      <div
        className={`${CTV_TIER_REWARD_BADGE_SLOT} ${CTV_TIER_REWARD_STATUS_SLOT_MOBILE} !items-center lg:!min-h-[2rem]`}
      >
        {milestone === "granted" ? (
          <div className="flex w-full min-w-0 items-center justify-center max-lg:px-0.5">
            <span
              className={`${CTV_TIER_REWARD_BADGE} ${CTV_TIER_REWARD_STATUS_MOBILE} bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80`}
            >
              <Check className="h-3.5 w-3.5 shrink-0 max-lg:h-4 max-lg:w-4" aria-hidden />
              Đã nhận thưởng
            </span>
          </div>
        ) : (
          <div
            className={[
              "grid w-full min-w-0 grid-cols-2 items-center gap-x-1.5 sm:gap-x-2",
              CTV_TIER_REWARD_STATUS_GRID_MOBILE,
            ].join(" ")}
            role="group"
            aria-label="Trạng thái hạng"
          >
            <div className="flex min-h-0 min-w-0 items-center justify-start max-lg:min-h-[1.875rem]">
              {isCurrent ? (
                <span
                  className={`${CTV_TIER_REWARD_BADGE} ${CTV_TIER_REWARD_STATUS_MOBILE} bg-blue-50 text-blue-800 ring-1 ring-blue-200/80`}
                >
                  Đang ở hạng này
                </span>
              ) : null}
            </div>
            <div className="flex min-h-0 min-w-0 items-center justify-end max-lg:min-h-[1.875rem]">
              <span
                className={`${CTV_TIER_REWARD_BADGE} ${CTV_TIER_REWARD_STATUS_MOBILE} bg-slate-100 text-slate-600 ring-1 ring-slate-200/80`}
              >
                <span className="shrink-0" aria-hidden>
                  ❌
                </span>{" "}
                Chưa đạt
              </span>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

function CtvRevenueRewardsPanelInner({ affiliateProfileEnabled, affiliateDashboard }: CtvRevenueRewardsPanelProps): JSX.Element {
  const sharedModel = useCtvAffiliateDashboardModel();
  const localAffDash = useAffiliateDashboardApi(affiliateProfileEnabled && !affiliateDashboard && !sharedModel, { runLifecycle: true });
  const affDash = affiliateDashboard ?? sharedModel?.affDash ?? localAffDash;
  const { totalRevenue, loading: revenueLoading } = useCtvRankRevenue(affDash);
  const { tiers, loading: tiersLoading } = useCtvMembershipTiers();
  const loading = revenueLoading || tiersLoading;

  const grantedTierIds = useMemo(
    () => new Set(affDash.data?.summary?.grantedCtvTierIds ?? []),
    [affDash.data?.summary?.grantedCtvTierIds],
  );

  const currentRank = useMemo(
    () => (tiers.length > 0 ? getCtvRankFromTiers(totalRevenue, tiers) : null),
    [totalRevenue, tiers],
  );

  return (
    <section className="min-w-0 space-y-4" aria-labelledby="ctv-revenue-rewards-heading">
      <header className={CTV_V2_PANEL_INSET}>
        <h3 id="ctv-revenue-rewards-heading" className="text-base font-bold text-[#0f172a]">
          Thưởng doanh thu theo hạng CTV
        </h3>
        <p className="mt-1 text-[13px] leading-relaxed text-slate-600">
          Mỗi hạng chỉ nhận thưởng một lần trong suốt vòng đời tài khoản (kể cả khi hạ hạng rồi lên lại). Mức thưởng và %
          hoa hồng do admin cấu hình. Doanh thu tính trên đơn giới thiệu đã thanh toán trong 30 ngày gần nhất.
        </p>
        {loading ? (
          <div className="mt-3 h-6 w-48 animate-pulse rounded-lg bg-slate-200/80" aria-hidden />
        ) : (
          <p className="mt-2 text-sm text-slate-500">
            Doanh thu tích lũy (30 ngày):{" "}
            <strong className="font-black text-[#0f172a]">{formatCtvRankMoney(totalRevenue)}</strong>
            {currentRank ? (
              <>
                {" "}
                · Hạng hiện tại: <strong className="text-[#0f172a]">{currentRank.name}</strong>
              </>
            ) : null}
          </p>
        )}
      </header>

      <div className={CTV_GRID_TIER_REWARDS}>
        {tiers.map((tier, index) => (
          <RewardTierCard
            key={tier.id}
            tier={tier}
            tiers={tiers}
            totalRevenue={loading ? 0 : totalRevenue}
            grantedTierIds={grantedTierIds}
            index={index}
          />
        ))}
      </div>
    </section>
  );
}

export const CtvRevenueRewardsPanel = memo(CtvRevenueRewardsPanelInner);
