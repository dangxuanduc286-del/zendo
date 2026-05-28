/** Chỉ import từ server (API, RSC). Không import file này từ component client. */

import type { AffiliateStatus, Prisma } from "@prisma/client";
import { memoizePerRequest } from "./runtime/request-cache";

export type CustomerAffiliateProfileSnapshot = {
  active: boolean;
  profileId: string | null;
  refCode: string | null;
};

/** Hồ sơ CTV mới nhất theo customer (mọi status) — dùng cho API dashboard CTV. */
export type CustomerAffiliateProfileLatestSnapshot = {
  id: string;
  refCode: string;
  status: AffiliateStatus;
  revenueRewardWalletBalance: Prisma.Decimal | null;
};

async function resolveCustomerAffiliateProfileInternal(
  customerId: string | null | undefined,
): Promise<CustomerAffiliateProfileSnapshot> {
  if (!customerId?.trim()) return { active: false, profileId: null, refCode: null };
  try {
    const { db } = await import("./db");
    const row = await db.affiliateProfile.findFirst({
      where: { customerId: customerId.trim(), status: "ACTIVE" },
      select: { id: true, refCode: true },
    });
    const rc = row?.refCode?.trim();
    return {
      active: Boolean(row?.id),
      profileId: row?.id ?? null,
      refCode: rc && rc.length > 0 ? rc : null,
    };
  } catch {
    return { active: false, profileId: null, refCode: null };
  }
}

async function resolveCustomerAffiliateActiveDbInternal(customerId: string | null | undefined): Promise<boolean> {
  return (await resolveCustomerAffiliateProfile(customerId)).active;
}

export const resolveCustomerAffiliateActiveDb = memoizePerRequest(resolveCustomerAffiliateActiveDbInternal);

export const resolveCustomerAffiliateProfile = memoizePerRequest(resolveCustomerAffiliateProfileInternal);

/** profileId ACTIVE — tái sử dụng snapshot request-scoped, không query lại. */
export async function getActiveAffiliateProfileId(
  customerId: string | null | undefined,
): Promise<string | null> {
  return (await resolveCustomerAffiliateProfile(customerId)).profileId;
}

async function resolveCustomerAffiliateProfileLatestInternal(
  customerId: string | null | undefined,
): Promise<CustomerAffiliateProfileLatestSnapshot | null> {
  if (!customerId?.trim()) return null;
  try {
    const { db } = await import("./db");
    const row = await db.affiliateProfile.findFirst({
      where: { customerId: customerId.trim() },
      orderBy: { updatedAt: "desc" },
      select: { id: true, refCode: true, status: true, revenueRewardWalletBalance: true },
    });
    return row ?? null;
  } catch {
    return null;
  }
}

export const resolveCustomerAffiliateProfileLatest = memoizePerRequest(
  resolveCustomerAffiliateProfileLatestInternal,
);

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
