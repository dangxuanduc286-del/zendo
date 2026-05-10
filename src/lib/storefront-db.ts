import { memoizePerRequest } from "./runtime/request-cache";

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
