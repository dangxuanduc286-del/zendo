import { memoizePerRequest } from "./runtime/request-cache";

/**
 * Return the shared Prisma client for storefront queries.
 *
 * Previous implementation issued a `SELECT 1` ping on the first invocation to
 * verify connectivity. This added ~250ms of unnecessary latency because:
 * 1. The underlying `pg.Pool` validates connections on checkout automatically.
 * 2. If the database is unreachable, the first real query will surface the
 *    error anyway (callers already wrap queries in try/catch).
 * 3. On Neon, every extra round-trip costs ~250-270ms (Vietnam → US-East-1).
 *
 * By skipping the verification ping we eliminate one full network round-trip
 * from the critical path of every cold-start storefront request.
 */
async function getStorefrontDbClientInternal(): Promise<
  typeof import("./db").db | null
> {
  if (!process.env.DATABASE_URL) return null;
  try {
    const dbModule = await import("./db");
    return dbModule.db;
  } catch {
    return null;
  }
}

/** Request-scoped Prisma client for storefront (shared by layout + pages). */
export const getStorefrontDbClient = memoizePerRequest(getStorefrontDbClientInternal);
