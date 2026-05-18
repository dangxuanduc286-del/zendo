import type { LucideIcon } from "lucide-react";
import { CTV_RANK_THRESHOLDS, type CtvRankLevel, getCtvRank, formatCtvRankMoney } from "./ctv-rank";

export type CtvRevenueRewardTier = {
  level: Exclude<CtvRankLevel, "none">;
  name: string;
  badge: string;
  revenueThreshold: number;
  rewardAmount: number;
};

/** Mức thưởng một lần khi đạt hạng (theo doanh thu tích lũy đủ điều kiện). */
export const CTV_REVENUE_REWARD_TIERS: readonly CtvRevenueRewardTier[] = [
  {
    level: "bronze",
    name: "CTV Đồng",
    badge: "Đồng",
    revenueThreshold: CTV_RANK_THRESHOLDS.bronze,
    rewardAmount: 200_000,
  },
  {
    level: "silver",
    name: "CTV Bạc",
    badge: "Bạc",
    revenueThreshold: CTV_RANK_THRESHOLDS.silver,
    rewardAmount: 500_000,
  },
  {
    level: "gold",
    name: "CTV Vàng",
    badge: "Vàng",
    revenueThreshold: CTV_RANK_THRESHOLDS.gold,
    rewardAmount: 1_000_000,
  },
  {
    level: "diamond",
    name: "CTV Kim Cương",
    badge: "Kim Cương",
    revenueThreshold: CTV_RANK_THRESHOLDS.diamond,
    rewardAmount: 2_500_000,
  },
] as const;

const LEVEL_ORDER: Record<Exclude<CtvRankLevel, "none">, number> = {
  bronze: 1,
  silver: 2,
  gold: 3,
  diamond: 4,
};

export function isCtvRevenueRewardTierAchieved(
  totalRevenue: number,
  tier: CtvRevenueRewardTier,
): boolean {
  return Math.max(0, totalRevenue) >= tier.revenueThreshold;
}

export function getCtvRevenueRewardTierStatus(
  totalRevenue: number,
  tier: CtvRevenueRewardTier,
): {
  achieved: boolean;
  isCurrent: boolean;
  rankAtTier: ReturnType<typeof getCtvRank>;
  icon: LucideIcon;
} {
  const revenue = Math.max(0, totalRevenue);
  const rank = getCtvRank(revenue);
  const achieved = isCtvRevenueRewardTierAchieved(revenue, tier);
  const isCurrent = rank.level === tier.level;
  const rankAtTier = getCtvRank(tier.revenueThreshold);
  return { achieved, isCurrent, rankAtTier, icon: rankAtTier.icon };
}

export function formatRewardMoney(amount: number): string {
  return formatCtvRankMoney(amount);
}

export function compareRewardTiers(a: CtvRevenueRewardTier, b: CtvRevenueRewardTier): number {
  return LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level];
}
