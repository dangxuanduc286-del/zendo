/** Chỉ import từ server (API, RSC). Không import file này từ component client. */

import { memoizePerRequest } from "./runtime/request-cache";

async function resolveCustomerAffiliateActiveDbInternal(customerId: string | null | undefined): Promise<boolean> {
  if (!customerId?.trim()) return false;
  try {
    const { db } = await import("./db");
    const row = await db.affiliateProfile.findFirst({
      where: { customerId: customerId.trim(), status: "ACTIVE" },
      select: { id: true },
    });
    return Boolean(row);
  } catch {
    return false;
  }
}

export const resolveCustomerAffiliateActiveDb = memoizePerRequest(resolveCustomerAffiliateActiveDbInternal);

async function resolveCustomerAffiliateProfileInternal(customerId: string | null | undefined): Promise<{
  active: boolean;
  refCode: string | null;
}> {
  if (!customerId?.trim()) return { active: false, refCode: null };
  try {
    const { db } = await import("./db");
    const row = await db.affiliateProfile.findFirst({
      where: { customerId: customerId.trim(), status: "ACTIVE" },
      select: { id: true, refCode: true },
    });
    const rc = row?.refCode?.trim();
    return { active: Boolean(row?.id), refCode: rc && rc.length > 0 ? rc : null };
  } catch {
    return { active: false, refCode: null };
  }
}

export const resolveCustomerAffiliateProfile = memoizePerRequest(resolveCustomerAffiliateProfileInternal);

async function resolveAffiliateProfileByRefCodeInternal(refCode: string | null | undefined): Promise<{
  id: string;
  refCode: string;
} | null> {
  const cand = String(refCode ?? "").trim();
  if (!cand) return null;
  try {
    const { db } = await import("./db");
    const hit = await db.affiliateProfile.findFirst({
      where: { refCode: { equals: cand, mode: "insensitive" }, status: "ACTIVE" },
      select: { id: true, refCode: true },
    });
    const rc = hit?.refCode?.trim();
    return hit?.id && rc ? { id: hit.id, refCode: rc } : null;
  } catch {
    return null;
  }
}

export const resolveAffiliateProfileByRefCode = memoizePerRequest(resolveAffiliateProfileByRefCodeInternal);
