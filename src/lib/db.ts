import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { wrapPrismaForLifecycleProfile } from "@/lib/ctv/ctv-lifecycle-profile-stats";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaPool?: Pool;
};

const databaseUrl = process.env.DATABASE_URL;

function createPrismaClient(): PrismaClient {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const pool =
    globalForPrisma.prismaPool ??
    new Pool({
      connectionString: databaseUrl,
      max: Math.max(4, Number(process.env.PG_POOL_MAX) || 12),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 15_000,
    });
  globalForPrisma.prismaPool = pool;

  const adapter = new PrismaPg(pool);

  return wrapPrismaForLifecycleProfile(
    new PrismaClient({
      adapter,
      log:
        process.env.NODE_ENV === "development" && process.env.PRISMA_QUERY_DEBUG === "1"
          ? ["query", "warn", "error"]
          : ["error"],
    }),
  );
}

export const db =
  globalForPrisma.prisma ??
  createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
