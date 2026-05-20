import { NextResponse } from "next/server";
import { getCachedCtvMembershipTiers } from "@/lib/ctv/ctv-membership-tier-repository";

export async function GET(): Promise<NextResponse> {
  const tiers = await getCachedCtvMembershipTiers();
  return NextResponse.json({
    tiers: tiers.map((t) => ({
      id: t.id,
      code: t.code,
      name: t.name,
      revenueFrom: t.revenueFrom,
      revenueTo: t.revenueTo,
      rewardThreshold: t.rewardThreshold,
      rewardAmount: t.rewardAmount,
      commissionPercent: t.commissionPercent,
      sortOrder: t.sortOrder,
      badgeColor: t.badgeColor,
      icon: t.icon,
      isActive: t.isActive,
    })),
  });
}
