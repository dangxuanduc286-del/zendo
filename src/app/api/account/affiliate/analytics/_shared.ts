import "server-only";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { applySharedRateLimit, rateLimitRetryAfter } from "@/lib/rate-limit-shared";

export type AffiliateAuthOk = { ok: true; affiliateProfileId: string; customerId: string };
export type AffiliateAuthErr = { ok: false; status: number; message: string };

export async function requireActiveAffiliateProfileId(): Promise<
  | AffiliateAuthOk
  | AffiliateAuthErr
> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "USER") {
    return { ok: false, status: 401, message: "Unauthorized" } as const;
  }
  const customerId = String(session.user.id);

  const profile = await db.affiliateProfile.findFirst({
    where: { customerId, status: "ACTIVE" },
    select: { id: true },
  });
  if (!profile) {
    return { ok: false, status: 403, message: "Bạn chưa có hồ sơ CTV đang hoạt động." } as const;
  }
  return { ok: true, affiliateProfileId: profile.id, customerId } as const;
}

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
