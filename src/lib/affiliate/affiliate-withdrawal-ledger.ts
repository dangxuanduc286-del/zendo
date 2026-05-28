import "server-only";

import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

type Tx = Omit<
  Prisma.TransactionClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends" | "$use"
>;

const TX_OPTS: { isolationLevel: Prisma.TransactionIsolationLevel; maxWait: number; timeout: number } = {
  isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  maxWait: 8000,
  timeout: 20000,
};

function money(v: { toString(): string } | null | undefined): number {
  if (v == null) return 0;
  const n = Number(v.toString());
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

function roundVnd(n: number): number {
  return Math.max(0, Math.floor(n));
}

export type AffiliatePayoutLedger = {
  commissionAvailable: number;
  revenueRewardWalletBalance: number;
  commissionApprovedPool: number;
  reservedForWithdrawals: number;
  withdrawableBalance: number;
};

export class AffiliateWithdrawalInsufficientBalanceError extends Error {
  readonly ledger: AffiliatePayoutLedger;

  constructor(ledger: AffiliatePayoutLedger) {
    super("Số tiền vượt quá số dư có thể rút hiện tại.");
    this.name = "AffiliateWithdrawalInsufficientBalanceError";
    this.ledger = ledger;
  }
}

/** Đọc ledger trong transaction — nguồn duy nhất cho validate rút tiền. */
export async function loadAffiliatePayoutLedger(
  tx: Tx,
  affiliateProfileId: string,
): Promise<AffiliatePayoutLedger> {
  const [profile, commissionSum, withdrawalsSum] = await Promise.all([
    tx.affiliateProfile.findUnique({
      where: { id: affiliateProfileId },
      select: { revenueRewardWalletBalance: true },
    }),
    tx.affiliateCommission.aggregate({
      where: {
        affiliateProfileId,
        status: { in: ["AVAILABLE", "APPROVED"] },
      },
      _sum: { amount: true },
    }),
    tx.affiliateWithdrawalRequest.aggregate({
      where: {
        affiliateProfileId,
        status: { in: ["PENDING", "APPROVED"] },
      },
      _sum: { amount: true },
    }),
  ]);

  const commissionAvailable = money(commissionSum._sum.amount);
  const revenueRewardWalletBalance = money(profile?.revenueRewardWalletBalance);
  const reservedForWithdrawals = money(withdrawalsSum._sum.amount);
  const commissionApprovedPool = commissionAvailable + revenueRewardWalletBalance;
  const withdrawableBalance = Math.max(0, commissionApprovedPool - reservedForWithdrawals);

  return {
    commissionAvailable,
    revenueRewardWalletBalance,
    commissionApprovedPool,
    reservedForWithdrawals,
    withdrawableBalance,
  };
}

/**
 * Tiêu thụ pool khi withdrawal PAID: trừ ví thưởng trước, sau đó HH AVAILABLE/APPROVED (FIFO).
 * Hỗ trợ cắt một phần dòng HH cuối nếu số rút không trùng khối nguyên.
 */
export async function consumeAffiliatePayoutForWithdrawal(
  tx: Tx,
  affiliateProfileId: string,
  amountVnd: number,
): Promise<{ fromRewardWallet: number; fromCommission: number }> {
  let remaining = roundVnd(amountVnd);
  if (remaining <= 0) {
    throw new Error("Số tiền rút không hợp lệ.");
  }

  const profile = await tx.affiliateProfile.findUnique({
    where: { id: affiliateProfileId },
    select: { revenueRewardWalletBalance: true },
  });
  if (!profile) throw new Error("Không tìm thấy hồ sơ CTV.");

  const walletBefore = money(profile.revenueRewardWalletBalance);
  const fromRewardWallet = Math.min(remaining, walletBefore);
  if (fromRewardWallet > 0) {
    await tx.affiliateProfile.update({
      where: { id: affiliateProfileId },
      data: { revenueRewardWalletBalance: walletBefore - fromRewardWallet },
    });
    remaining -= fromRewardWallet;
  }

  const now = new Date();
  if (remaining > 0) {
    const commissionRows = await tx.affiliateCommission.findMany({
      where: {
        affiliateProfileId,
        status: { in: ["AVAILABLE", "APPROVED"] },
      },
      orderBy: [{ availableAt: "asc" }, { createdAt: "asc" }],
      select: { id: true, amount: true },
    });

    for (const row of commissionRows) {
      if (remaining <= 0) break;
      const rowAmount = money(row.amount);
      if (rowAmount <= 0) continue;

      if (rowAmount <= remaining) {
        await tx.affiliateCommission.update({
          where: { id: row.id },
          data: { status: "PAID", paidAt: now },
        });
        remaining -= rowAmount;
      } else {
        await tx.affiliateCommission.update({
          where: { id: row.id },
          data: { amount: new Prisma.Decimal(rowAmount - remaining) },
        });
        remaining = 0;
      }
    }
  }

  if (remaining > 0) {
    throw new Error("Số dư không đủ để hoàn tất chi trả (ledger lệch).");
  }

  return { fromRewardWallet, fromCommission: roundVnd(amountVnd) - fromRewardWallet };
}

export type CreateAffiliateWithdrawalResult = {
  id: string;
  createdAt: Date;
  ledgerAfter: AffiliatePayoutLedger;
};

/** Tạo yêu cầu rút trong Serializable tx — không dùng snapshot ngoài transaction. */
export async function createAffiliateWithdrawalRequestInTransaction(args: {
  affiliateProfileId: string;
  amountVnd: number;
  paymentMethod: string;
  paymentInfo: string;
}): Promise<CreateAffiliateWithdrawalResult> {
  const amount = roundVnd(args.amountVnd);

  return db.$transaction(async (tx) => {
    const ledgerBefore = await loadAffiliatePayoutLedger(tx, args.affiliateProfileId);

    if (amount <= 0) {
      throw new Error("Số tiền không hợp lệ.");
    }
    if (amount > ledgerBefore.withdrawableBalance) {
      throw new AffiliateWithdrawalInsufficientBalanceError(ledgerBefore);
    }

    const created = await tx.affiliateWithdrawalRequest.create({
      data: {
        affiliateProfileId: args.affiliateProfileId,
        amount,
        availableAmount: ledgerBefore.withdrawableBalance,
        paymentMethod: args.paymentMethod,
        paymentInfo: args.paymentInfo,
      },
      select: { id: true, createdAt: true },
    });

    const ledgerAfter = await loadAffiliatePayoutLedger(tx, args.affiliateProfileId);

    return { id: created.id, createdAt: created.createdAt, ledgerAfter };
  }, TX_OPTS);
}

/** Đánh dấu PAID + tiêu thụ pool thực (Serializable). */
export async function markAffiliateWithdrawalPaidInTransaction(withdrawalId: string): Promise<void> {
  await db.$transaction(async (tx) => {
    const row = await tx.affiliateWithdrawalRequest.findUnique({
      where: { id: withdrawalId },
      select: { id: true, affiliateProfileId: true, amount: true, status: true },
    });
    if (!row) throw new Error("Không tìm thấy yêu cầu rút tiền.");
    if (row.status !== "APPROVED") {
      throw new Error("Chỉ có thể đánh dấu đã thanh toán sau khi yêu cầu đã được duyệt.");
    }

    const amount = money(row.amount);
    await consumeAffiliatePayoutForWithdrawal(tx, row.affiliateProfileId, amount);
    const now = new Date();
    await tx.affiliateWithdrawalRequest.update({
      where: { id: withdrawalId },
      data: { status: "PAID", paidAt: now },
    });
  }, TX_OPTS);
}

/** Ledger đọc ngoài transaction (dashboard / API read-only). */
export async function loadAffiliatePayoutLedgerForProfile(
  affiliateProfileId: string,
): Promise<AffiliatePayoutLedger> {
  return loadAffiliatePayoutLedger(db, affiliateProfileId);
}
