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
      connectionTimeoutMillis: 10_000,
    });
  globalForPrisma.prismaPool = pool;

  // Eagerly establish one connection so the pool is warm when the first
  // query arrives. This moves the ~1600ms Neon cold-start from the request
  // critical path into the module-load phase (which runs during Vercel
  // function init, before the request timer starts).
  pool.connect().then(
    (client) => client.release(),
    () => {/* swallow – first real query will surface the error */},
  );

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

// Persist singleton for the lifetime of the process in all environments.
// In serverless (Vercel/Neon), the process may serve multiple requests before
// being recycled — reusing the client avoids repeated connection acquisition.
globalForPrisma.prisma = db;
