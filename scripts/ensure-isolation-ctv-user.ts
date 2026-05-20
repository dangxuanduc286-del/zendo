import { hash } from "bcryptjs";
import { db } from "../src/lib/db";

const EMAIL = "isolation-ctv@test.local";
const PASSWORD = "Customer@123";

async function main() {
  const passwordHash = await hash(PASSWORD, 10);
  const customer = await db.customer.upsert({
    where: { email: EMAIL },
    update: { passwordHash, fullName: "Isolation CTV" },
    create: { email: EMAIL, passwordHash, fullName: "Isolation CTV", isGuest: false },
  });

  await db.affiliateProfile.upsert({
    where: { refCode: "ISOLATIONCTV01" },
    update: { customerId: customer.id, status: "ACTIVE" },
    create: {
      refCode: "ISOLATIONCTV01",
      customerId: customer.id,
      status: "ACTIVE",
    },
  });

  console.log(JSON.stringify({ email: EMAIL, password: PASSWORD }));
  await db.$disconnect();
}

main();
