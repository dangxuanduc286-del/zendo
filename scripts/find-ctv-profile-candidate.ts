import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv(): void {
  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
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

async function main(): Promise<void> {
const { db } = await import("../src/lib/db");

const profiles = await db.affiliateProfile.findMany({
  where: { status: "ACTIVE" },
  select: {
    id: true,
    customer: { select: { email: true, phone: true } },
    _count: { select: { ctvRevenueRewardGrants: true, ctvTierHistory: true } },
  },
  take: 15,
  orderBy: { ctvRevenueRewardGrants: { _count: "desc" } },
});

for (const p of profiles) {
  const agg = await db.order.aggregate({
    where: {
      affiliateProfileId: p.id,
      paymentStatus: "PAID",
      orderStatus: { in: ["COMPLETED", "DELIVERED"] },
      createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    },
    _sum: { totalAmount: true },
  });
  const rev = Number(agg._sum.totalAmount ?? 0);
  console.log(
    JSON.stringify({
      id: p.id,
      ident: p.customer?.email ?? p.customer?.phone,
      revenue30d: rev,
      grants: p._count.ctvRevenueRewardGrants,
      tierHistory: p._count.ctvTierHistory,
    }),
  );
}

await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
