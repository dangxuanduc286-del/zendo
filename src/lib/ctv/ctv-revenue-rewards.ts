import {
  formatCtvRankMoney,
  formatCtvRevenueRewardAmount,
  formatCtvRevenueRangeLine,
  getCtvRankCardRewardFocus,
  getCtvRankFromTiers,
  isCtvRevenueRewardAchieved,
  resolveCtvMembershipTierForRevenue,
} from "./ctv-membership-tier-logic";
import type { CtvMembershipTierRecord } from "./ctv-membership-tier-types";

export type { CtvMembershipTierRecord as CtvRevenueRewardTier };

export function formatRewardMoney(amount: number): string {
  return formatCtvRankMoney(amount);
}

export { formatCtvRankMoney };

export {
  formatCtvRevenueRewardAmount,
  formatCtvRevenueRangeLine,
  getCtvRankCardRewardFocus,
  getCtvRankFromTiers,
  isCtvRevenueRewardAchieved,
  resolveCtvMembershipTierForRevenue,
};

export type CtvRevenueRewardMilestoneStatus = "granted" | "eligible_pending" | "not_achieved";

export function getCtvRevenueRewardMilestoneStatus(
  totalRevenue: number,
  tier: CtvMembershipTierRecord,
  grantedTierIds: ReadonlySet<string>,
): CtvRevenueRewardMilestoneStatus {
  if (grantedTierIds.has(tier.id)) return "granted";
  if (isCtvRevenueRewardAchieved(totalRevenue, tier)) return "eligible_pending";
  return "not_achieved";
}

export function getCtvRevenueRewardTierStatus(
  totalRevenue: number,
  tier: CtvMembershipTierRecord,
  tiers: readonly CtvMembershipTierRecord[],
  grantedTierIds: ReadonlySet<string> = new Set(),
): {
  milestone: CtvRevenueRewardMilestoneStatus;
  achieved: boolean;
  granted: boolean;
  isCurrent: boolean;
  rankAtTier: ReturnType<typeof getCtvRankFromTiers>;
  iconKey: string;
} {
  const revenue = Math.max(0, totalRevenue);
  const rank = getCtvRankFromTiers(revenue, tiers);
  const milestone = getCtvRevenueRewardMilestoneStatus(revenue, tier, grantedTierIds);
  const achieved = milestone !== "not_achieved";
  const granted = milestone === "granted";
  const isCurrent = rank.tierId === tier.id;
  const rankAtTier = getCtvRankFromTiers(tier.rewardThreshold, tiers);
  return { milestone, achieved, granted, isCurrent, rankAtTier, iconKey: tier.icon };
}
