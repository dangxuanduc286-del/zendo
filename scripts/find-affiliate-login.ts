import { db } from "../src/lib/db";

async function main() {
  const rows = await db.affiliateProfile.findMany({
    where: { customerId: { not: null }, status: "ACTIVE" },
    take: 5,
    select: { refCode: true, customer: { select: { email: true, phone: true, fullName: true } } },
  });
  console.log(JSON.stringify(rows, null, 2));
  await db.$disconnect();
}

main();
