import type { Prisma } from "@prisma/client";
import { fetchCtvMembershipTiersFromDb } from "./ctv-membership-tier-repository";
import { resolveCtvMembershipTierForRevenue } from "./ctv-membership-tier-logic";
import { computeCtvQualifiedRevenue30d } from "./ctv-qualified-revenue";

type DbLike = Pick<Prisma.TransactionClient, "order">;

export type CtvCommissionRateResolution = {
  commissionPercent: number;
  tierId: string | null;
  tierName: string | null;
  tierCode: string | null;
  qualifiedRevenue30d: number;
};

/**
 * % hoa hồng đơn hàng = commissionPercent của cấp CTV hiện tại (SSOT CtvMembershipTier).
 * Không dùng affiliate.commissionRate hay website default.
 */
export async function resolveCtvCommissionRateForAffiliate(
  affiliateProfileId: string,
  options?: { excludeOrderId?: string; asOf?: Date; dbClient?: DbLike },
): Promise<CtvCommissionRateResolution> {
  const tiers = await fetchCtvMembershipTiersFromDb(true);
  const qualifiedRevenue30d = await computeCtvQualifiedRevenue30d(affiliateProfileId, options);
  const tier = resolveCtvMembershipTierForRevenue(qualifiedRevenue30d, tiers);

  if (!tier) {
    const fallback = tiers.filter((t) => t.isActive).sort((a, b) => a.sortOrder - b.sortOrder)[0];
    return {
      commissionPercent: fallback?.commissionPercent ?? 0,
      tierId: fallback?.id ?? null,
      tierName: fallback?.name ?? null,
      tierCode: fallback?.code ?? null,
      qualifiedRevenue30d,
    };
  }

  return {
    commissionPercent: tier.commissionPercent,
    tierId: tier.id,
    tierName: tier.name,
    tierCode: tier.code,
    qualifiedRevenue30d,
  };
}
