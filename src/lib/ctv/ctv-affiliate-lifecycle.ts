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
import {
  endCtvLifecycleProfileSession,
  profileCtvLifecycleStep,
  startCtvLifecycleProfileSession,
} from "./ctv-lifecycle-profile-stats";

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
async function runCtvAffiliateLifecycleInternal(
  affiliateProfileId: string,
  qualifiedRevenue30d: number,
): Promise<CtvAffiliateLifecycleResult> {
  const tiers = await fetchCtvMembershipTiersFromDb(true);
  const tier = await syncCtvTierForAffiliate(affiliateProfileId, qualifiedRevenue30d, tiers);
  await ensureCtvTierHistoryConsistency(affiliateProfileId);
  const rewards = await syncCtvRevenueRewardGrants(affiliateProfileId, qualifiedRevenue30d, tiers);
  await reconcileRevenueRewardWalletBalance(affiliateProfileId, { paidRewardSum: rewards.paidRewardSum });
  const progress = buildProgressSummary(qualifiedRevenue30d, tiers);
  return { tier, rewards, progress };
}

export async function runCtvAffiliateLifecycle(
  affiliateProfileId: string,
  qualifiedRevenue30d: number,
): Promise<CtvAffiliateLifecycleResult> {
  return runCtvAffiliateLifecycleInternal(affiliateProfileId, qualifiedRevenue30d);
}

/** Đo từng bước — bật `CTV_LIFECYCLE_PROFILE=1` trước khi import `db`. */
export async function runCtvAffiliateLifecycleProfiled(
  affiliateProfileId: string,
  qualifiedRevenue30d: number,
): Promise<{
  result: CtvAffiliateLifecycleResult;
  profile: ReturnType<typeof endCtvLifecycleProfileSession>;
}> {
  startCtvLifecycleProfileSession();
  const tiers = await profileCtvLifecycleStep("fetchTiers", () => fetchCtvMembershipTiersFromDb(true));
  const tier = await profileCtvLifecycleStep("tierSync", () =>
    syncCtvTierForAffiliate(affiliateProfileId, qualifiedRevenue30d, tiers),
  );
  await profileCtvLifecycleStep("tierHistoryConsistency", () => ensureCtvTierHistoryConsistency(affiliateProfileId));
  const rewards = await profileCtvLifecycleStep("rewardGrantSync", () =>
    syncCtvRevenueRewardGrants(affiliateProfileId, qualifiedRevenue30d, tiers),
  );
  await profileCtvLifecycleStep("walletReconcile", () =>
    reconcileRevenueRewardWalletBalance(affiliateProfileId, { paidRewardSum: rewards.paidRewardSum }),
  );
  const progress = await profileCtvLifecycleStep("buildProgress", async () =>
    buildProgressSummary(qualifiedRevenue30d, tiers),
  );
  const profile = endCtvLifecycleProfileSession();
  return { result: { tier, rewards, progress }, profile };
}
