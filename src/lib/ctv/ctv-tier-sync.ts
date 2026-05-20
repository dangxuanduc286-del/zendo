import { db } from "@/lib/db";
import { fetchCtvMembershipTiersFromDb } from "./ctv-membership-tier-repository";
import { getCtvRankFromTiers, resolveCtvMembershipTierForRevenue } from "./ctv-membership-tier-logic";
import { notifyCtvTierDemoted, notifyCtvTierPromoted } from "./ctv-tier-notifications";

function money(n: unknown): number {
  const v =
    typeof n === "object" && n != null && "toNumber" in n
      ? Number((n as { toNumber: () => number }).toNumber())
      : Number(n);
  return Number.isFinite(v) ? Math.max(0, Math.round(v)) : 0;
}

export type CtvTierSyncResult = {
  currentTierId: string | null;
  currentTierName: string | null;
  changed: boolean;
  direction: "up" | "down" | "none";
};

/** Ghi lịch sử khi cấp thay đổi; gửi notification lên/xuống hạng (mỗi lần chuyển tier một bản ghi). */
export async function syncCtvTierForAffiliate(
  affiliateProfileId: string,
  qualifiedRevenue30d: number,
): Promise<CtvTierSyncResult> {
  const tiers = await fetchCtvMembershipTiersFromDb(true);
  const revenue = money(qualifiedRevenue30d);
  const resolved = resolveCtvMembershipTierForRevenue(revenue, tiers);
  const toTierId = resolved?.id ?? null;

  const profile = await db.affiliateProfile.findUnique({
    where: { id: affiliateProfileId },
    select: { currentCtvTierId: true },
  });
  const fromTierId = profile?.currentCtvTierId ?? null;

  if (toTierId === fromTierId) {
    return {
      currentTierId: toTierId,
      currentTierName: resolved?.name ?? null,
      changed: false,
      direction: "none",
    };
  }

  if (!toTierId) {
    await db.affiliateProfile.update({
      where: { id: affiliateProfileId },
      data: { currentCtvTierId: null },
    });
    return { currentTierId: null, currentTierName: null, changed: fromTierId != null, direction: "down" };
  }

  const fromTier = fromTierId ? tiers.find((t) => t.id === fromTierId) : null;
  const direction: "up" | "down" =
    !fromTier || !resolved
      ? "up"
      : resolved.sortOrder > fromTier.sortOrder
        ? "up"
        : resolved.sortOrder < fromTier.sortOrder
          ? "down"
          : "up";

  const history = await db.ctvTierHistory.create({
    data: {
      affiliateProfileId,
      fromTierId,
      toTierId,
      revenue,
    },
  });

  await db.affiliateProfile.update({
    where: { id: affiliateProfileId },
    data: { currentCtvTierId: toTierId },
  });

  /** Lần đầu gán hạng (baseline) — không gửi notification hàng loạt sau migrate. */
  if (fromTierId == null) {
    return {
      currentTierId: toTierId,
      currentTierName: resolved.name,
      changed: true,
      direction: "none",
    };
  }

  const rank = getCtvRankFromTiers(revenue, tiers);
  if (direction === "up") {
    await notifyCtvTierPromoted({
      affiliateProfileId,
      toTierId,
      toTierName: resolved.name,
      commissionPercent: rank.commissionPercent,
    }).catch((err) => console.error("[ctv-tier] promote notify", err));
  } else {
    await notifyCtvTierDemoted({
      affiliateProfileId,
      toTierId,
      toTierName: resolved.name,
      commissionPercent: rank.commissionPercent,
      historyId: history.id,
    }).catch((err) => console.error("[ctv-tier] demote notify", err));
  }

  return {
    currentTierId: toTierId,
    currentTierName: resolved.name,
    changed: true,
    direction,
  };
}
