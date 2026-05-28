import { db } from "@/lib/db";
import { resolveCtvMembershipTierForRevenue } from "./ctv-membership-tier-logic";
import { fetchCtvMembershipTiersFromDb } from "./ctv-membership-tier-repository";
import { sumPaidCtvRevenueRewardAmount } from "./ctv-revenue-reward-grants";

function money(n: unknown): number {
  const v =
    typeof n === "object" && n != null && "toNumber" in n
      ? Number((n as { toNumber: () => number }).toNumber())
      : Number(n);
  return Number.isFinite(v) ? Math.max(0, Math.round(v)) : 0;
}

export type CtvIntegrityIssue = {
  code: string;
  severity: "error" | "warn";
  affiliateProfileId?: string;
  message: string;
  details?: Record<string, unknown>;
};

export type CtvProfileIntegrityReport = {
  affiliateProfileId: string;
  ok: boolean;
  issues: CtvIntegrityIssue[];
  wallet: {
    commissionAvailable: number;
    revenueRewardWalletBalance: number;
    withdrawableBalance: number;
    reservedWithdrawals: number;
    formulaCheck: boolean;
  };
  rewards: {
    grantPaidSum: number;
    transactionSum: number;
    auditSum: number;
    walletBalance: number;
    aligned: boolean;
  };
  tier: {
    currentCtvTierId: string | null;
    latestHistoryToTierId: string | null;
    revenueResolvedTierId: string | null;
    aligned: boolean;
  };
};

/** Đồng bộ ví thưởng từ grant paid nếu lệch (sửa under/over credit do migrate thủ công). */
export async function reconcileRevenueRewardWalletBalance(
  affiliateProfileId: string,
  opts?: { paidRewardSum?: number },
): Promise<{ before: number; after: number; fixed: boolean }> {
  const expected =
    opts?.paidRewardSum != null ? money(opts.paidRewardSum) : await sumPaidCtvRevenueRewardAmount(affiliateProfileId);
  const profile = await db.affiliateProfile.findUnique({
    where: { id: affiliateProfileId },
    select: { revenueRewardWalletBalance: true },
  });
  const before = money(profile?.revenueRewardWalletBalance);
  if (before === expected) return { before, after: before, fixed: false };
  await db.affiliateProfile.update({
    where: { id: affiliateProfileId },
    data: { revenueRewardWalletBalance: expected },
  });
  return { before, after: expected, fixed: true };
}

/** `currentCtvTierId` phải khớp bản ghi history mới nhất. */
export async function ensureCtvTierHistoryConsistency(affiliateProfileId: string): Promise<boolean> {
  const latest = await db.ctvTierHistory.findFirst({
    where: { affiliateProfileId },
    orderBy: { createdAt: "desc" },
    select: { toTierId: true },
  });
  if (!latest) return false;

  const profile = await db.affiliateProfile.findUnique({
    where: { id: affiliateProfileId },
    select: { currentCtvTierId: true },
  });
  if (profile?.currentCtvTierId === latest.toTierId) return false;

  await db.affiliateProfile.update({
    where: { id: affiliateProfileId },
    data: { currentCtvTierId: latest.toTierId },
  });
  return true;
}

export async function auditCtvProfileIntegrity(
  affiliateProfileId: string,
  snapshot?: {
    commissionAvailable: number;
    revenueRewardWalletBalance: number;
    withdrawableBalance: number;
    reservedWithdrawals: number;
    qualifiedReferralRevenue: number;
  },
): Promise<CtvProfileIntegrityReport> {
  const issues: CtvIntegrityIssue[] = [];

  const [profile, grantAgg, txnAgg, auditAgg, duplicateTiers, paidWithoutTxn, latestHistory, tiers] =
    await Promise.all([
      db.affiliateProfile.findUnique({
        where: { id: affiliateProfileId },
        select: { currentCtvTierId: true, revenueRewardWalletBalance: true },
      }),
      db.ctvRevenueRewardGrant.aggregate({
        where: { affiliateProfileId, paidAt: { not: null } },
        _sum: { rewardAmount: true },
      }),
      db.ctvRevenueRewardTransaction.aggregate({
        where: { affiliateProfileId },
        _sum: { amount: true },
      }),
      db.ctvRevenueRewardAuditLog.aggregate({
        where: { affiliateProfileId },
        _sum: { rewardAmount: true },
      }),
      db.ctvRevenueRewardGrant.groupBy({
        by: ["tierId"],
        where: { affiliateProfileId },
        _count: { _all: true },
      }),
      db.ctvRevenueRewardGrant.count({
        where: { affiliateProfileId, paidAt: { not: null }, transactionId: null },
      }),
      db.ctvTierHistory.findFirst({
        where: { affiliateProfileId },
        orderBy: { createdAt: "desc" },
        select: { toTierId: true },
      }),
      fetchCtvMembershipTiersFromDb(true),
    ]);

  const grantPaidSum = money(grantAgg._sum.rewardAmount);
  const transactionSum = money(txnAgg._sum.amount);
  const auditSum = money(auditAgg._sum.rewardAmount);
  const walletBalance = money(profile?.revenueRewardWalletBalance);

  for (const row of duplicateTiers) {
    if (row._count._all > 1) {
      issues.push({
        code: "REWARD_DUPLICATE_TIER",
        severity: "error",
        affiliateProfileId,
        message: `Tier ${row.tierId} có ${row._count._all} grant (max 1).`,
      });
    }
  }

  if (paidWithoutTxn > 0) {
    issues.push({
      code: "REWARD_PAID_WITHOUT_TXN",
      severity: "error",
      affiliateProfileId,
      message: `${paidWithoutTxn} grant paid nhưng thiếu transactionId.`,
    });
  }

  if (grantPaidSum !== transactionSum) {
    issues.push({
      code: "REWARD_GRANT_TXN_MISMATCH",
      severity: "error",
      affiliateProfileId,
      message: "Tổng grant paid ≠ tổng transaction thưởng.",
      details: { grantPaidSum, transactionSum },
    });
  }

  if (grantPaidSum !== auditSum) {
    issues.push({
      code: "REWARD_GRANT_AUDIT_MISMATCH",
      severity: "error",
      affiliateProfileId,
      message: "Tổng grant paid ≠ tổng audit log.",
      details: { grantPaidSum, auditSum },
    });
  }

  if (walletBalance !== grantPaidSum) {
    issues.push({
      code: "REWARD_WALLET_DRIFT",
      severity: "error",
      affiliateProfileId,
      message: "revenueRewardWalletBalance ≠ tổng grant paid.",
      details: { walletBalance, grantPaidSum },
    });
  }

  const revenueResolved = snapshot?.qualifiedReferralRevenue ?? 0;
  const resolvedTier = resolveCtvMembershipTierForRevenue(revenueResolved, tiers);
  const revenueResolvedTierId = resolvedTier?.id ?? null;
  const latestHistoryToTierId = latestHistory?.toTierId ?? null;
  const currentCtvTierId = profile?.currentCtvTierId ?? null;

  if (latestHistoryToTierId && currentCtvTierId !== latestHistoryToTierId) {
    issues.push({
      code: "TIER_CURRENT_HISTORY_MISMATCH",
      severity: "error",
      affiliateProfileId,
      message: "currentCtvTierId ≠ toTierId bản ghi history mới nhất.",
      details: { currentCtvTierId, latestHistoryToTierId },
    });
  }

  const commissionAvailable = snapshot?.commissionAvailable ?? 0;
  const revenueRewardWalletBalance = snapshot?.revenueRewardWalletBalance ?? walletBalance;
  const reservedWithdrawals = snapshot?.reservedWithdrawals ?? 0;
  const withdrawableBalance = snapshot?.withdrawableBalance ?? 0;
  const expectedWithdrawable = Math.max(0, commissionAvailable + revenueRewardWalletBalance - reservedWithdrawals);
  const formulaCheck = withdrawableBalance === expectedWithdrawable;

  if (!formulaCheck) {
    issues.push({
      code: "WALLET_FORMULA_MISMATCH",
      severity: "error",
      affiliateProfileId,
      message: "withdrawableBalance ≠ commissionAvailable + revenueRewardWalletBalance - reserved.",
      details: {
        withdrawableBalance,
        expectedWithdrawable,
        commissionAvailable,
        revenueRewardWalletBalance,
        reservedWithdrawals,
      },
    });
  }

  return {
    affiliateProfileId,
    ok: issues.length === 0,
    issues,
    wallet: {
      commissionAvailable,
      revenueRewardWalletBalance,
      withdrawableBalance,
      reservedWithdrawals,
      formulaCheck,
    },
    rewards: {
      grantPaidSum,
      transactionSum,
      auditSum,
      walletBalance,
      aligned: grantPaidSum === transactionSum && grantPaidSum === auditSum && walletBalance === grantPaidSum,
    },
    tier: {
      currentCtvTierId,
      latestHistoryToTierId,
      revenueResolvedTierId,
      aligned: !latestHistoryToTierId || currentCtvTierId === latestHistoryToTierId,
    },
  };
}

export async function auditCtvSystemSample(limit = 50): Promise<{
  profilesChecked: number;
  errorCount: number;
  issues: CtvIntegrityIssue[];
}> {
  const profiles = await db.affiliateProfile.findMany({
    where: { status: "ACTIVE" },
    take: limit,
    select: { id: true },
    orderBy: { updatedAt: "desc" },
  });

  const issues: CtvIntegrityIssue[] = [];
  for (const p of profiles) {
    const report = await auditCtvProfileIntegrity(p.id);
    issues.push(...report.issues);
  }

  return {
    profilesChecked: profiles.length,
    errorCount: issues.filter((i) => i.severity === "error").length,
    issues,
  };
}
