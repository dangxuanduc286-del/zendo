"use client";

import { Check, Lock } from "lucide-react";
import { memo, useMemo } from "react";
import { useAffiliateDashboardApi } from "@/components/storefront/use-affiliate-dashboard-api";
import {
  CTV_REVENUE_REWARD_TIERS,
  formatRewardMoney,
  getCtvRevenueRewardTierStatus,
  type CtvRevenueRewardTier,
} from "@/lib/ctv/ctv-revenue-rewards";
import { useCtvRankRevenue } from "@/lib/ctv/use-ctv-rank-revenue";
import { CTV_V2_MOTION, CTV_V2_PANEL_INSET } from "./ctv-ui-tokens";

type CtvRevenueRewardsPanelProps = {
  affiliateProfileEnabled: boolean;
};

function RewardTierCard({
  tier,
  totalRevenue,
}: {
  tier: CtvRevenueRewardTier;
  totalRevenue: number;
}): JSX.Element {
  const { achieved, isCurrent, rankAtTier, icon: Icon } = getCtvRevenueRewardTierStatus(totalRevenue, tier);

  return (
    <article
      className={[
        "group relative flex min-w-0 flex-col overflow-hidden rounded-2xl border p-4",
        "bg-gradient-to-br ring-1 transition-[transform,box-shadow] duration-200 ease-out",
        "hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(15,23,42,0.08)]",
        rankAtTier.color.gradient,
        achieved ? rankAtTier.color.glow : "border-black/[0.05] shadow-[0_4px_18px_rgba(0,0,0,0.04)]",
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
        <span
          className={[
            "inline-flex h-7 items-center rounded-full px-2 text-[10px] font-bold uppercase tracking-wide ring-1",
            rankAtTier.color.badge,
          ].join(" ")}
        >
          {tier.badge}
        </span>
      </div>

      <h4 className="mt-3 text-base font-bold leading-tight text-[#0f172a]">{tier.name}</h4>
      <p className="mt-1 text-[12px] font-medium text-slate-500">
        Doanh thu yêu cầu:{" "}
        <span className="font-semibold text-slate-700">{formatRewardMoney(tier.revenueThreshold)}</span>
      </p>
      <p className="mt-2 text-xl font-black tabular-nums tracking-tight text-[#0f172a]">
        Thưởng: <span className="text-blue-700">{formatRewardMoney(tier.rewardAmount)}</span>
      </p>

      <div className="mt-auto pt-3">
        {achieved ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 ring-1 ring-emerald-200/80">
            <Check className="h-3.5 w-3.5" aria-hidden />
            {isCurrent ? "Đang ở hạng này" : "Đã đạt"}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200/80">
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
  const { totalRevenue, loading } = useCtvRankRevenue(affDash);

  const tiers = useMemo(() => [...CTV_REVENUE_REWARD_TIERS], []);

  return (
    <section className="min-w-0 space-y-4" aria-labelledby="ctv-revenue-rewards-heading">
      <header className={CTV_V2_PANEL_INSET}>
        <h3 id="ctv-revenue-rewards-heading" className="text-base font-bold text-[#0f172a]">
          Thưởng doanh thu theo hạng CTV
        </h3>
        <p className="mt-1 text-[13px] leading-relaxed text-slate-600">
          Khi tổng doanh thu đơn giới thiệu (đã thanh toán &amp; hoàn thành) đạt mốc, bạn được hưởng mức thưởng tương ứng.
          Tiền thưởng do chương trình quy định — liên hệ hỗ trợ nếu đã đạt mốc mà chưa nhận.
        </p>
        {loading ? (
          <div className="mt-3 h-6 w-48 animate-pulse rounded-lg bg-slate-200/80" aria-hidden />
        ) : (
          <p className="mt-2 text-sm text-slate-500">
            Doanh thu tích lũy hiện tại:{" "}
            <strong className="font-black text-[#0f172a]">{formatRewardMoney(totalRevenue)}</strong>
          </p>
        )}
      </header>

      <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {tiers.map((tier) => (
          <RewardTierCard key={tier.level} tier={tier} totalRevenue={loading ? 0 : totalRevenue} />
        ))}
      </div>
    </section>
  );
}

export const CtvRevenueRewardsPanel = memo(CtvRevenueRewardsPanelInner);
