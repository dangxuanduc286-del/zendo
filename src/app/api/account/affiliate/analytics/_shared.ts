import "server-only";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { resolveCustomerAffiliateProfile } from "@/lib/affiliate-customer-status";
import { memoizePerRequest } from "@/lib/runtime/request-cache";
import { applySharedRateLimit, rateLimitRetryAfter } from "@/lib/rate-limit-shared";

export type AffiliateAuthOk = { ok: true; affiliateProfileId: string; customerId: string };
export type AffiliateAuthErr = { ok: false; status: number; message: string };

async function requireActiveAffiliateProfileIdInternal(): Promise<AffiliateAuthOk | AffiliateAuthErr> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "USER") {
    return { ok: false, status: 401, message: "Unauthorized" } as const;
  }
  const customerId = String(session.user.id);
  const profile = await resolveCustomerAffiliateProfile(customerId);
  if (!profile.active || !profile.profileId) {
    return { ok: false, status: 403, message: "Bạn chưa có hồ sơ CTV đang hoạt động." } as const;
  }
  return { ok: true, affiliateProfileId: profile.profileId, customerId } as const;
}

/** Một lần auth + profile ACTIVE mỗi request (tránh query lặp trong cùng handler). */
export const requireActiveAffiliateProfileId = memoizePerRequest(requireActiveAffiliateProfileIdInternal);

export function isAffiliateAuthErr(v: AffiliateAuthOk | AffiliateAuthErr): v is AffiliateAuthErr {
  return v.ok === false;
}

export async function applyAnalyticsRateLimit(args: {
  key: string;
  windowMs: number;
  max: number;
}): Promise<{ ok: true } | { ok: false; retryAfterSec: number }> {
  return applySharedRateLimit({
    scope: "affiliate-analytics",
    key: args.key.slice(0, 200),
    windowMs: args.windowMs,
    max: args.max,
  });
}

export { rateLimitRetryAfter };
