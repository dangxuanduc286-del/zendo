import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { fetchCtvMembershipTiersFromDb } from "./ctv-membership-tier-repository";
import { isCtvRevenueRewardAchieved } from "./ctv-membership-tier-logic";
import type { CtvMembershipTierRecord } from "./ctv-membership-tier-types";
import { isCtvLifecycleProfiling, profileCtvLifecycleStep } from "./ctv-lifecycle-profile-stats";

type Tx = Omit<
  Prisma.TransactionClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends" | "$use"
>;

function money(n: unknown): number {
  const v =
    typeof n === "object" && n != null && "toNumber" in n
      ? Number((n as { toNumber: () => number }).toNumber())
      : Number(n);
  return Number.isFinite(v) ? Math.max(0, Math.round(v)) : 0;
}

export type CtvRevenueRewardGrantRecord = {
  tierId: string;
  rewardAmount: number;
  grantedAt: Date;
  paidAt: Date | null;
  transactionId: string | null;
};

export type CtvRevenueRewardPayResult = "paid" | "already_paid" | "not_eligible";

const TX_OPTS: { isolationLevel: Prisma.TransactionIsolationLevel; maxWait: number; timeout: number } = {
  isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  maxWait: 8000,
  timeout: 20000,
};

/**
 * Cộng ví: paidAt + transactionId + tăng revenueRewardWalletBalance (chống cộng trùng).
 */
async function creditCtvRevenueRewardWallet(
  tx: Tx,
  grantId: string,
  affiliateProfileId: string,
  transactionId: string,
  rewardAmount: number,
  paidAt: Date,
): Promise<void> {
  const row = await tx.ctvRevenueRewardGrant.findUnique({
    where: { id: grantId },
    select: { paidAt: true, rewardAmount: true },
  });
  if (row?.paidAt != null) {
    throw new Error("CTV revenue reward already paid — wallet credit blocked");
  }

  const creditAmount = money(row?.rewardAmount ?? rewardAmount);
  if (creditAmount <= 0) return;

  await tx.ctvRevenueRewardGrant.update({
    where: { id: grantId },
    data: { transactionId, paidAt },
  });

  await tx.affiliateProfile.update({
    where: { id: affiliateProfileId },
    data: {
      revenueRewardWalletBalance: { increment: creditAmount },
    },
  });
}

async function writeCtvRevenueRewardAudit(
  tx: Tx,
  args: {
    affiliateProfileId: string;
    tierId: string;
    grantId: string;
    transactionId: string;
    rewardAmount: number;
    qualifiedRevenue30d: number;
  },
): Promise<void> {
  const existing = await tx.ctvRevenueRewardAuditLog.findUnique({
    where: { grantId: args.grantId },
    select: { id: true },
  });
  if (existing) return;

  await tx.ctvRevenueRewardAuditLog.create({
    data: {
      affiliateProfileId: args.affiliateProfileId,
      tierId: args.tierId,
      grantId: args.grantId,
      transactionId: args.transactionId,
      rewardAmount: args.rewardAmount,
      qualifiedRevenue30d: args.qualifiedRevenue30d,
    },
  });
}

/** Hoàn tất grant mồ côi (có grant nhưng chưa paidAt) trong cùng transaction. */
async function completeUnpaidGrantInTransaction(
  tx: Tx,
  grantId: string,
  affiliateProfileId: string,
  tier: CtvMembershipTierRecord,
  qualifiedRevenue30d: number,
  rewardAmount: number,
): Promise<CtvRevenueRewardPayResult> {
  const grant = await tx.ctvRevenueRewardGrant.findUnique({
    where: { id: grantId },
    select: { paidAt: true, transactionId: true },
  });
  if (!grant) return "not_eligible";
  if (grant.paidAt != null) return "already_paid";

  let transactionId = grant.transactionId;
  if (!transactionId) {
    const txn = await tx.ctvRevenueRewardTransaction.create({
      data: { affiliateProfileId, grantId, amount: rewardAmount },
    });
    transactionId = txn.id;
  }

  const paidAt = new Date();
  await creditCtvRevenueRewardWallet(tx, grantId, affiliateProfileId, transactionId, rewardAmount, paidAt);
  await writeCtvRevenueRewardAudit(tx, {
    affiliateProfileId,
    tierId: tier.id,
    grantId,
    transactionId,
    rewardAmount,
    qualifiedRevenue30d,
  });
  return "paid";
}

/**
 * Một DB transaction: Grant → Transaction → Cộng ví (paidAt) → Audit.
 * Unique (affiliateProfileId, tierId) + kiểm tra paidAt chống race / trùng.
 */
export async function payCtvRevenueRewardForTier(
  affiliateProfileId: string,
  tier: CtvMembershipTierRecord,
  qualifiedRevenue30d: number,
): Promise<CtvRevenueRewardPayResult> {
  if (!isCtvRevenueRewardAchieved(qualifiedRevenue30d, tier)) return "not_eligible";

  const rewardAmount = money(tier.rewardAmount);
  if (rewardAmount <= 0) return "not_eligible";

  const revenueSnapshot = money(qualifiedRevenue30d);

  try {
    return await db.$transaction(async (tx) => {
      const existing = await tx.ctvRevenueRewardGrant.findUnique({
        where: {
          affiliateProfileId_tierId: { affiliateProfileId, tierId: tier.id },
        },
        select: { id: true, paidAt: true },
      });

      if (existing) {
        if (existing.paidAt != null) return "already_paid";
        return completeUnpaidGrantInTransaction(
          tx,
          existing.id,
          affiliateProfileId,
          tier,
          revenueSnapshot,
          rewardAmount,
        );
      }

      const grant = await tx.ctvRevenueRewardGrant.create({
        data: {
          affiliateProfileId,
          tierId: tier.id,
          rewardAmount,
          qualifiedRevenue30d: revenueSnapshot,
        },
      });

      const txn = await tx.ctvRevenueRewardTransaction.create({
        data: {
          affiliateProfileId,
          grantId: grant.id,
          amount: rewardAmount,
        },
      });

      const paidAt = new Date();
      await creditCtvRevenueRewardWallet(tx, grant.id, affiliateProfileId, txn.id, rewardAmount, paidAt);
      await writeCtvRevenueRewardAudit(tx, {
        affiliateProfileId,
        tierId: tier.id,
        grantId: grant.id,
        transactionId: txn.id,
        rewardAmount,
        qualifiedRevenue30d: revenueSnapshot,
      });

      return "paid";
    }, TX_OPTS);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return "already_paid";
    }
    throw e;
  }
}

export async function fetchCtvRevenueRewardGrants(
  affiliateProfileId: string,
): Promise<CtvRevenueRewardGrantRecord[]> {
  const rows = await db.ctvRevenueRewardGrant.findMany({
    where: { affiliateProfileId },
    select: {
      tierId: true,
      rewardAmount: true,
      grantedAt: true,
      paidAt: true,
      transactionId: true,
    },
  });
  return rows.map((r) => ({
    tierId: r.tierId,
    rewardAmount: money(r.rewardAmount),
    grantedAt: r.grantedAt,
    paidAt: r.paidAt,
    transactionId: r.transactionId,
  }));
}

export async function fetchGrantedCtvTierIds(affiliateProfileId: string): Promise<Set<string>> {
  const rows = await db.ctvRevenueRewardGrant.findMany({
    where: { affiliateProfileId },
    select: { tierId: true },
  });
  return new Set(rows.map((r) => r.tierId));
}

/**
 * Đồng bộ thưởng theo tier đạt mốc. Mỗi tier tối đa một lần (lifetime).
 * Notification chỉ sau khi transaction commit và paidAt đã ghi.
 */
export async function syncCtvRevenueRewardGrants(
  affiliateProfileId: string,
  totalRevenue30d: number,
  tiersPrefetched?: readonly CtvMembershipTierRecord[],
): Promise<{ created: number; skipped: number; paidRewardSum: number }> {
  const tiers = tiersPrefetched ?? (await fetchCtvMembershipTiersFromDb(true));
  let created = 0;
  let skipped = 0;
  const revenue = money(totalRevenue30d);

  const loadGrantStatus = () =>
    db.ctvRevenueRewardGrant.findMany({
      where: { affiliateProfileId },
      select: { tierId: true, paidAt: true, rewardAmount: true },
    });
  const existingGrants = isCtvLifecycleProfiling()
    ? await profileCtvLifecycleStep("grantStatusPrefetch", loadGrantStatus)
    : await loadGrantStatus();
  const paidTierIds = new Set(existingGrants.filter((g) => g.paidAt != null).map((g) => g.tierId));
  let paidRewardSum = existingGrants
    .filter((g) => g.paidAt != null)
    .reduce((sum, g) => sum + money(g.rewardAmount), 0);

  for (const tier of tiers) {
    if (!isCtvRevenueRewardAchieved(revenue, tier) || money(tier.rewardAmount) <= 0) {
      skipped += 1;
      continue;
    }
    if (paidTierIds.has(tier.id)) {
      skipped += 1;
      continue;
    }

    const pay = () => payCtvRevenueRewardForTier(affiliateProfileId, tier, totalRevenue30d);
    const result = isCtvLifecycleProfiling()
      ? await profileCtvLifecycleStep(`grantPayout:${tier.code}`, pay)
      : await pay();
    if (result === "paid") {
      created += 1;
      paidRewardSum += money(tier.rewardAmount);
      if (!isCtvLifecycleProfiling()) {
        const { notifyCtvRevenueRewardGranted } = await import("./ctv-revenue-reward-notifications");
        await notifyCtvRevenueRewardGranted({
          affiliateProfileId,
          tierId: tier.id,
          tierName: tier.name,
          rewardAmount: money(tier.rewardAmount),
        }).catch((err) => {
          console.error("[ctv-revenue-reward] notification", err);
        });
      }
    } else {
      skipped += 1;
    }
  }

  return { created, skipped, paidRewardSum };
}

/** Tổng thưởng doanh thu đã cộng ví (chỉ grant có paidAt). */
export async function sumPaidCtvRevenueRewardAmount(affiliateProfileId: string): Promise<number> {
  const agg = await db.ctvRevenueRewardGrant.aggregate({
    where: { affiliateProfileId, paidAt: { not: null } },
    _sum: { rewardAmount: true },
  });
  return money(agg._sum.rewardAmount);
}

/** Đếm grant đã trả theo tier — dùng kiểm tra audit (tối đa 1 / tier). */
export async function countPaidCtvRevenueRewardsByTier(
  affiliateProfileId: string,
): Promise<Map<string, number>> {
  const rows = await db.ctvRevenueRewardGrant.groupBy({
    by: ["tierId"],
    where: { affiliateProfileId, paidAt: { not: null } },
    _count: { _all: true },
  });
  return new Map(rows.map((r) => [r.tierId, r._count._all]));
}
