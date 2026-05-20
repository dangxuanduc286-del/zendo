import "server-only";

import {
  ensureCtvTierHistoryConsistency,
  reconcileRevenueRewardWalletBalance,
} from "./ctv-data-integrity";
import { syncCtvRevenueRewardGrants } from "./ctv-revenue-reward-grants";
import { syncCtvTierForAffiliate } from "./ctv-tier-sync";
import { getCtvRankFromTiers, getNextCtvMembershipTier, resolveCtvMembershipTierForRevenue } from "./ctv-membership-tier-logic";
import { fetchCtvMembershipTiersFromDb } from "./ctv-membership-tier-repository";
import type { CtvMembershipTierRecord } from "./ctv-membership-tier-types";

export type CtvTierProgressSummary = {
  revenue30d: number;
  currentTierName: string;
  currentCommissionPercent: number;
  nextTierName: string | null;
  revenueTargetNext: number | null;
  remainingToNext: number;
  progressPercent: number;
  nextTierRewardAmount: number | null;
  isMaxRank: boolean;
};

export type CtvAffiliateLifecycleResult = {
  tier: Awaited<ReturnType<typeof syncCtvTierForAffiliate>>;
  rewards: Awaited<ReturnType<typeof syncCtvRevenueRewardGrants>>;
  progress: CtvTierProgressSummary;
};

function buildProgressSummary(revenue30d: number, tiers: readonly CtvMembershipTierRecord[]): CtvTierProgressSummary {
  const rank = getCtvRankFromTiers(revenue30d, tiers);
  const current = resolveCtvMembershipTierForRevenue(revenue30d, tiers);
  const nextTier = current ? getNextCtvMembershipTier(current, tiers) : null;

  return {
    revenue30d,
    currentTierName: rank.name,
    currentCommissionPercent: rank.commissionPercent,
    nextTierName: rank.nextTierName,
    revenueTargetNext: rank.nextThreshold,
    remainingToNext: rank.remaining,
    progressPercent: rank.progress,
    nextTierRewardAmount: nextTier?.rewardAmount ?? null,
    isMaxRank: rank.isMaxRank,
  };
}

/**
 * Luồng CTV end-to-end: xét hạng → thưởng → ví → (notification trong từng bước con).
 */
export async function runCtvAffiliateLifecycle(
  affiliateProfileId: string,
  qualifiedRevenue30d: number,
): Promise<CtvAffiliateLifecycleResult> {
  const tiers = await fetchCtvMembershipTiersFromDb(true);
  const tier = await syncCtvTierForAffiliate(affiliateProfileId, qualifiedRevenue30d);
  await ensureCtvTierHistoryConsistency(affiliateProfileId);
  const rewards = await syncCtvRevenueRewardGrants(affiliateProfileId, qualifiedRevenue30d);
  await reconcileRevenueRewardWalletBalance(affiliateProfileId);
  const progress = buildProgressSummary(qualifiedRevenue30d, tiers);
  return { tier, rewards, progress };
}
