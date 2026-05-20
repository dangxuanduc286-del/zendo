/**
 * Chứng minh Scenario 1 & 2 cho withdrawal ledger.
 * Chạy: npx tsx scripts/verify-withdrawal-ledger.ts
 * Yêu cầu: DATABASE_URL trỏ DB dev có thể ghi.
 */
import { db } from "../src/lib/db";
import {
  createAffiliateWithdrawalRequestInTransaction,
  loadAffiliatePayoutLedgerForProfile,
  markAffiliateWithdrawalPaidInTransaction,
} from "../src/lib/affiliate/affiliate-withdrawal-ledger";

function log(location: string, message: string, data: Record<string, unknown>): void {
  console.log(JSON.stringify({ location, message, data, timestamp: Date.now() }));
}

async function ensureTestProfile(): Promise<string> {
  const existing = await db.affiliateProfile.findFirst({
    where: { refCode: "DEBUG_WDL_TEST" },
    select: { id: true },
  });
  if (existing) return existing.id;

  const customer = await db.customer.create({
    data: {
      email: `debug-wdl-${Date.now()}@test.local`,
      passwordHash: "debug",
      fullName: "Debug Withdrawal",
    },
    select: { id: true },
  });

  const profile = await db.affiliateProfile.create({
    data: {
      customerId: customer.id,
      refCode: "DEBUG_WDL_TEST",
      status: "ACTIVE",
      revenueRewardWalletBalance: 0,
    },
    select: { id: true },
  });
  return profile.id;
}

async function resetProfile(profileId: string, commissionVnd: number, rewardWalletVnd: number): Promise<void> {
  await db.affiliateWithdrawalRequest.deleteMany({ where: { affiliateProfileId: profileId } });
  await db.affiliateCommission.deleteMany({ where: { affiliateProfileId: profileId } });

  await db.affiliateProfile.update({
    where: { id: profileId },
    data: { revenueRewardWalletBalance: rewardWalletVnd },
  });

  if (commissionVnd > 0) {
    const customerId = (
      await db.affiliateProfile.findUniqueOrThrow({
        where: { id: profileId },
        select: { customerId: true },
      })
    ).customerId!;
    const order = await db.order.create({
      data: {
        code: `DBG-WDL-${Date.now()}`,
        customerId,
        customerFullName: "Debug Withdrawal",
        customerPhone: "0900000000",
        shippingCity: "Hà Nội",
        shippingDistrict: "Ba Đình",
        shippingLine1: "1",
        subtotal: commissionVnd * 10,
        totalAmount: commissionVnd * 10,
        paymentMethod: "COD",
        paymentStatus: "PAID",
        orderStatus: "COMPLETED",
        affiliateProfileId: profileId,
      },
      select: { id: true },
    });
    await db.affiliateCommission.create({
      data: {
        affiliateProfileId: profileId,
        orderId: order.id,
        orderRevenue: commissionVnd * 10,
        commissionRate: 10,
        amount: commissionVnd,
        status: "AVAILABLE",
        availableAt: new Date(),
      },
    });
  }
}

async function scenario1(profileId: string): Promise<boolean> {
  await resetProfile(profileId, 1_000_000, 0);
  const before = await loadAffiliatePayoutLedgerForProfile(profileId);
  log("verify-withdrawal-ledger.ts:s1:start", "scenario1 initial ledger", { before });

  const w = await createAffiliateWithdrawalRequestInTransaction({
    affiliateProfileId: profileId,
    amountVnd: 1_000_000,
    paymentMethod: "BANK",
    paymentInfo: "{}",
  });

  await db.affiliateWithdrawalRequest.update({
    where: { id: w.id },
    data: { status: "APPROVED", approvedAt: new Date() },
  });

  await markAffiliateWithdrawalPaidInTransaction(w.id);
  const after = await loadAffiliatePayoutLedgerForProfile(profileId);
  log("verify-withdrawal-ledger.ts:s1:end", "scenario1 after PAID", { after });

  const ok = after.withdrawableBalance === 0 && after.commissionAvailable === 0 && after.revenueRewardWalletBalance === 0;
  console.log(`Scenario1 PASS=${ok}`, after);
  return ok;
}

async function scenario2(profileId: string): Promise<boolean> {
  await resetProfile(profileId, 1_000_000, 0);
  const before = await loadAffiliatePayoutLedgerForProfile(profileId);
  log("verify-withdrawal-ledger.ts:s2:start", "scenario2 initial ledger", { before });

  const results = await Promise.allSettled([
    createAffiliateWithdrawalRequestInTransaction({
      affiliateProfileId: profileId,
      amountVnd: 800_000,
      paymentMethod: "BANK",
      paymentInfo: '{"req":"A"}',
    }),
    createAffiliateWithdrawalRequestInTransaction({
      affiliateProfileId: profileId,
      amountVnd: 800_000,
      paymentMethod: "BANK",
      paymentInfo: '{"req":"B"}',
    }),
  ]);

  const successes = results.filter((r) => r.status === "fulfilled").length;
  const failures = results.filter((r) => r.status === "rejected").length;
  const after = await loadAffiliatePayoutLedgerForProfile(profileId);
  const pending = await db.affiliateWithdrawalRequest.count({
    where: { affiliateProfileId: profileId, status: { in: ["PENDING", "APPROVED"] } },
  });

  log("verify-withdrawal-ledger.ts:s2:end", "scenario2 parallel results", {
    successes,
    failures,
    pending,
    after,
    results: results.map((r) => (r.status === "fulfilled" ? "ok" : String((r as PromiseRejectedResult).reason))),
  });

  const ok = successes === 1 && failures === 1 && pending === 1 && after.withdrawableBalance === 200_000;
  console.log(`Scenario2 PASS=${ok}`, { successes, failures, pending, after });
  return ok;
}

async function main(): Promise<void> {
  try {
    const profileId = await ensureTestProfile();
    const s1 = await scenario1(profileId);
    const s2 = await scenario2(profileId);
    if (!s1 || !s2) process.exitCode = 1;
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
