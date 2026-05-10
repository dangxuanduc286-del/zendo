import { hash } from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

process.loadEnvFile?.(".env");

const ADMIN_PHONE = "0564162222";
const ADMIN_EMAIL = "admin@zendo.vn";
const ADMIN_PASSWORD = "duc120897";

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured.");
  }
  const databaseHost = (() => {
    try {
      const parsed = new URL(databaseUrl);
      return `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
    } catch {
      return "invalid-database-url";
    }
  })();
  console.log("[reset-admin] databaseHost", databaseHost);

  const pool = new Pool({ connectionString: databaseUrl });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const adminRole = await prisma.role.findFirst({
      where: {
        OR: [{ slug: "admin" }, { name: "ADMIN" }],
      },
      select: { id: true, slug: true, name: true },
    });

    if (!adminRole) {
      throw new Error("Role ADMIN not found. Run seed first to create roles.");
    }

    const passwordHash = await hash(ADMIN_PASSWORD, 12);
    const existing = await prisma.admin.findFirst({
      where: {
        OR: [{ username: ADMIN_PHONE }, { email: ADMIN_EMAIL }],
      },
      select: { id: true },
    });

    const admin = existing
      ? await prisma.admin.update({
          where: { id: existing.id },
          data: {
            email: ADMIN_EMAIL,
            username: ADMIN_PHONE,
            fullName: "Zendo Admin",
            passwordHash,
            status: "ACTIVE",
            roleId: adminRole.id,
          },
          select: { id: true, email: true, username: true, status: true },
        })
      : await prisma.admin.create({
          data: {
            email: ADMIN_EMAIL,
            username: ADMIN_PHONE,
            fullName: "Zendo Admin",
            passwordHash,
            status: "ACTIVE",
            roleId: adminRole.id,
          },
          select: { id: true, email: true, username: true, status: true },
        });

    const disabled = await prisma.admin.updateMany({
      where: {
        id: { not: admin.id },
        OR: [{ username: ADMIN_PHONE }, { email: ADMIN_EMAIL }],
      },
      data: {
        status: "INACTIVE",
      },
    });

    console.log("[reset-admin] PASS");
    console.log("[reset-admin] admin", {
      id: admin.id,
      email: admin.email,
      username: admin.username,
      status: admin.status,
      role: "ADMIN",
    });
    console.log("[reset-admin] deactivatedAdmins", disabled.count);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error("[reset-admin] FAIL", error);
  process.exitCode = 1;
});
