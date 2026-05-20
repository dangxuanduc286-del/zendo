"use client";

import { Check, Lock } from "lucide-react";
import { memo, useMemo } from "react";
import { useAffiliateDashboardApi } from "@/components/storefront/use-affiliate-dashboard-api";
import {
  formatCtvRevenueRangeLine,
  formatCtvRevenueRewardAmount,
  getCtvRankFromTiers,
  getCtvRevenueRewardTierStatus,
} from "@/lib/ctv/ctv-revenue-rewards";
import { formatCtvRankMoney } from "@/lib/ctv/ctv-membership-tier-logic";
import { useCtvMembershipTiers } from "@/lib/ctv/use-ctv-membership-tiers";
import { useCtvRankRevenue } from "@/lib/ctv/use-ctv-rank-revenue";
import { resolveCtvTierIcon } from "@/lib/ctv/ctv-membership-tier-icons";
import type { CtvMembershipTierRecord } from "@/lib/ctv/ctv-membership-tier-types";
import { CTV_V2_MOTION, CTV_V2_PANEL_INSET } from "./ctv-ui-tokens";

type CtvRevenueRewardsPanelProps = {
  affiliateProfileEnabled: boolean;
};

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

  return (
    <article
      className={[
        "group relative flex min-w-0 flex-col overflow-hidden rounded-2xl border p-4",
        "bg-gradient-to-br ring-1 transition-[transform,box-shadow] duration-200 ease-out",
        rankAtTier.color.gradient,
        milestone !== "not_achieved" ? rankAtTier.color.glow : "border-black/[0.05] shadow-[0_4px_18px_rgba(0,0,0,0.04)]",
        isCurrent ? "ring-2 ring-blue-500/35" : "ring-black/[0.04]",
        CTV_V2_MOTION,
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-2">
        <div
          className={[
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br shadow-inner ring-1 ring-white/70",
            rankAtTier.color.iconBg,
          ].join(" ")}
          aria-hidden
        >
          <Icon className={`h-5 w-5 ${rankAtTier.color.iconText}`} strokeWidth={1.6} />
        </div>
      </div>

      <h4 className="mt-3 text-base font-bold leading-tight text-[#0f172a]">
        {tier.name}
        <span className="ml-1.5 text-sm font-semibold text-slate-500">| {tier.commissionPercent}%</span>
      </h4>
      <p className="mt-1 text-[12px] font-medium text-slate-500">
        Doanh thu:{" "}
        <span className="font-semibold text-slate-700">{formatCtvRevenueRangeLine(tier, isFirst)}</span>
      </p>
      <p className="mt-2 text-xl font-black tabular-nums tracking-tight text-[#0f172a]">
        Thưởng: <span className={tier.badgeColor.amountText}>{formatCtvRevenueRewardAmount(tier)}</span>
      </p>

      <div className="mt-auto pt-3">
        {milestone === "granted" ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 ring-1 ring-emerald-200/80">
            <Check className="h-3.5 w-3.5" aria-hidden />
            Đã nhận thưởng
          </span>
        ) : milestone === "eligible_pending" ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-900 ring-1 ring-amber-200/80">
            <span aria-hidden>❌</span> Chưa nhận thưởng
          </span>
        ) : isCurrent ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-800 ring-1 ring-blue-200/80">
            Đang ở hạng này · Chưa đạt mốc
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200/80">
            <span aria-hidden>❌</span>
            <Lock className="h-3.5 w-3.5" aria-hidden />
            Chưa đạt
          </span>
        )}
      </div>
    </article>
  );
}

function CtvRevenueRewardsPanelInner({ affiliateProfileEnabled }: CtvRevenueRewardsPanelProps): JSX.Element {
  const affDash = useAffiliateDashboardApi(affiliateProfileEnabled);
  const { totalRevenue, loading: revenueLoading } = useCtvRankRevenue(affDash);
  const { tiers, loading: tiersLoading } = useCtvMembershipTiers();
  const loading = revenueLoading || tiersLoading;

  const grantedTierIds = useMemo(
    () => new Set(affDash.data?.summary.grantedCtvTierIds ?? []),
    [affDash.data?.summary.grantedCtvTierIds],
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

      <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
