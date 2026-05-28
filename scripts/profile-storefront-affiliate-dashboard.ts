/**
 * Đo thời gian server `getStorefrontAffiliateDashboardForCustomer`.
 * npx tsx scripts/profile-storefront-affiliate-dashboard.ts
 */
import { performance } from "node:perf_hooks";
import { db } from "../src/lib/db";
import { getStorefrontAffiliateDashboardForCustomer } from "../src/lib/storefront-affiliate-dashboard";

const IDENT = process.env.PERF_IDENT ?? "isolation-ctv@test.local";

async function main(): Promise<void> {
  const user = await db.customer.findFirst({
    where: { OR: [{ email: IDENT }, { phone: IDENT }] },
    select: { id: true },
  });
  if (!user) {
    console.error("Customer not found:", IDENT);
    process.exit(1);
  }

  const runs: number[] = [];
  for (let i = 0; i < 3; i++) {
    const t0 = performance.now();
    const data = await getStorefrontAffiliateDashboardForCustomer(user.id);
    runs.push(Math.round(performance.now() - t0));
    if (!data) console.warn("null dashboard", i);
  }
  console.log(
    JSON.stringify({
      customerId: user.id,
      ident: IDENT,
      runsMs: runs,
      warmMs: runs[runs.length - 1],
    }),
  );
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
