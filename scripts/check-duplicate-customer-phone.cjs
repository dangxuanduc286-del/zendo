const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient({});

async function main() {
  const duplicates = await prisma.$queryRaw`
    SELECT phone, COUNT(*)::int AS count
    FROM "Customer"
    WHERE phone IS NOT NULL
    GROUP BY phone
    HAVING COUNT(*) > 1
    ORDER BY count DESC
    LIMIT 50
  `;

  if (!duplicates.length) {
    console.log("PASS: Không có Customer.phone bị trùng.");
  } else {
    console.table(duplicates);
    console.log("FAIL: Có phone trùng. Chưa được db push.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
