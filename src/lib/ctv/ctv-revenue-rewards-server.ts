import { fetchCtvMembershipTiersFromDb, getCachedCtvMembershipTiers } from "./ctv-membership-tier-repository";
import type { CtvMembershipTierRecord } from "./ctv-membership-tier-types";

export async function getCtvRevenueRewardTiers(): Promise<CtvMembershipTierRecord[]> {
  return getCachedCtvMembershipTiers();
}

export async function getCtvRevenueRewardTiersAdmin(): Promise<CtvMembershipTierRecord[]> {
  return fetchCtvMembershipTiersFromDb(false);
}
