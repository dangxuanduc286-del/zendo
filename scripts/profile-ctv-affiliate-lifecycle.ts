/**
 * Profile runCtvAffiliateLifecycle — từng bước ms / query / write.
 * npx tsx scripts/profile-ctv-affiliate-lifecycle.ts
 */
process.env.CTV_LIFECYCLE_PROFILE = "1";

import { performance } from "node:perf_hooks";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv(): void {
  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return;
  const raw = readFileSync(envPath, "utf8");
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const key = t.slice(0, i).trim();
    const val = t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnv();

const IDENT = process.env.PERF_IDENT ?? "isolation-ctv@test.local";

async function main(): Promise<void> {
  const { db } = await import("../src/lib/db");
  const { fetchCtvMembershipTiersFromDb } = await import("../src/lib/ctv/ctv-membership-tier-repository");
  const { syncCtvTierForAffiliate } = await import("../src/lib/ctv/ctv-tier-sync");
  const { ensureCtvTierHistoryConsistency, reconcileRevenueRewardWalletBalance } = await import(
    "../src/lib/ctv/ctv-data-integrity"
  );
  const { syncCtvRevenueRewardGrants } = await import("../src/lib/ctv/ctv-revenue-reward-grants");
  const {
    endCtvLifecycleProfileSession,
    profileCtvLifecycleStep,
    startCtvLifecycleProfileSession,
  } = await import("../src/lib/ctv/ctv-lifecycle-profile-stats");
  const { getCtvRankFromTiers, getNextCtvMembershipTier, resolveCtvMembershipTierForRevenue } = await import(
    "../src/lib/ctv/ctv-membership-tier-logic"
  );

  const customer = await db.customer.findFirst({
    where: { OR: [{ email: IDENT }, { phone: IDENT }] },
    select: { id: true },
  });
  if (!customer) {
    console.error("Customer not found:", IDENT);
    process.exit(1);
  }

  const profileRow = await db.affiliateProfile.findFirst({
    where: { customerId: customer.id, status: "ACTIVE" },
    select: { id: true },
  });
  if (!profileRow) {
    console.error("No ACTIVE affiliate profile for", IDENT);
    process.exit(1);
  }

  const qualifiedAgg = await db.order.aggregate({
    where: {
      affiliateProfileId: profileRow.id,
      paymentStatus: "PAID",
      orderStatus: { in: ["COMPLETED", "DELIVERED"] },
      createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    },
    _sum: { totalAmount: true },
  });
  const qualifiedRevenue30d = Number(qualifiedAgg._sum.totalAmount ?? 0);

  startCtvLifecycleProfileSession();
  const t0 = performance.now();

  const tiers = await profileCtvLifecycleStep("fetchTiers", () => fetchCtvMembershipTiersFromDb(true));
  const tier = await profileCtvLifecycleStep("tierSync", () =>
    syncCtvTierForAffiliate(profileRow.id, qualifiedRevenue30d, tiers),
  );
  await profileCtvLifecycleStep("tierHistoryConsistency", () => ensureCtvTierHistoryConsistency(profileRow.id));
  const rewards = await profileCtvLifecycleStep("rewardGrantSync", () =>
    syncCtvRevenueRewardGrants(profileRow.id, qualifiedRevenue30d, tiers),
  );
  await profileCtvLifecycleStep("walletReconcile", () =>
    reconcileRevenueRewardWalletBalance(profileRow.id, { paidRewardSum: rewards.paidRewardSum }),
  );
  await profileCtvLifecycleStep("buildProgress", async () => {
    const rank = getCtvRankFromTiers(qualifiedRevenue30d, tiers);
    const current = resolveCtvMembershipTierForRevenue(qualifiedRevenue30d, tiers);
    const nextTier = current ? getNextCtvMembershipTier(current, tiers) : null;
    return {
      revenue30d: qualifiedRevenue30d,
      currentTierName: rank.name,
      nextTierName: rank.nextTierName,
      nextTierRewardAmount: nextTier?.rewardAmount ?? null,
    };
  });

  const profile = endCtvLifecycleProfileSession();
  const lifecycleMs = Math.round(performance.now() - t0);

  const flat = flattenSteps(profile.steps);
  const stepAliases: Record<string, string> = {
    fetchTiers: "tierCatalog",
    tierSync: "tierSync",
    tierHistoryConsistency: "tierHistorySync",
    grantStatusPrefetch: "grantSync (prefetch)",
    rewardGrantSync: "rewardSync",
    walletReconcile: "walletSync",
    buildProgress: "progressBuild",
  };
  const labeled = flat.map((s) => {
    const root = s.name.split("/")[0] ?? s.name;
    const alias = stepAliases[root] ?? (root.startsWith("grantPayout:") ? `payoutSync (${root})` : root);
    return { ...s, label: alias };
  });
  const report = {
    capturedAt: new Date().toISOString(),
    affiliateProfileId: profileRow.id,
    customerId: customer.id,
    qualifiedRevenue30d,
    lifecycleWallMs: lifecycleMs,
    tierCount: tiers.length,
    lifecycleResult: {
      tierChanged: tier.changed,
      tierDirection: tier.direction,
      rewardsCreated: rewards.created,
      rewardsSkipped: rewards.skipped,
    },
    totals: {
      profileStepsMs: profile.totalMs,
      queryCount: profile.queryCount,
      writeCount: profile.writeCount,
    },
    steps: labeled,
    slowestQueries: profile.slowestQueries,
    bottleneckStep: labeled.sort((a, b) => b.ms - a.ms)[0] ?? null,
    optimizations: [
      "tierCatalog: 1 fetch/tiersPrefetched (bỏ lặp trong tierSync + rewardSync)",
      "grantSync: 1 findMany paidAt trước vòng tier — bỏ Serializable tx cho tier đã paid",
    ],
  };

  console.log(JSON.stringify(report, null, 2));
  await db.$disconnect();
}

function flattenSteps(
  steps: Array<{
    name: string;
    ms: number;
    queryCount: number;
    writeCount: number;
    children?: Array<{ name: string; ms: number; queryCount: number; writeCount: number }>;
  }>,
): Array<{ name: string; ms: number; queryCount: number; writeCount: number }> {
  const out: Array<{ name: string; ms: number; queryCount: number; writeCount: number }> = [];
  for (const s of steps) {
    out.push({ name: s.name, ms: s.ms, queryCount: s.queryCount, writeCount: s.writeCount });
    for (const c of s.children ?? []) {
      out.push({
        name: `${s.name}/${c.name}`,
        ms: c.ms,
        queryCount: c.queryCount,
        writeCount: c.writeCount,
      });
    }
  }
  return out;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
