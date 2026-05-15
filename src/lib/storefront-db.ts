import { memoizePerRequest } from "./runtime/request-cache";

async function getStorefrontDbClientInternal(): Promise<
  typeof import("./db").db | null
> {
  if (!process.env.DATABASE_URL) return null;
  try {
    const dbModule = await import("./db");
    try {
      // Ping to avoid crashing build-time static generation when DB is down.
      await dbModule.db.$queryRaw`SELECT 1`;
      return dbModule.db;
    } catch {
      return null;
    }
  } catch {
    return null;
  }
}

/** Request-scoped Prisma client for storefront (shared by layout + pages). */
export const getStorefrontDbClient = memoizePerRequest(getStorefrontDbClientInternal);
