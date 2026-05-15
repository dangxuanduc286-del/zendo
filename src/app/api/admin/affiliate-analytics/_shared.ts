import "server-only";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

type RateState = { windowStartMs: number; count: number };
const rate = new Map<string, RateState>();

export function isAdminStaffRole(role: string | undefined): boolean {
  return role === "SUPER_ADMIN" || role === "ADMIN" || role === "CONTENT_MANAGER";
}

export async function requireAdminAffiliateAnalyticsSession(): Promise<
  | { ok: true; adminId: string; role: string }
  | { ok: false; status: number; message: string }
> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { ok: false, status: 401, message: "Unauthorized" } as const;
  }
  if (!isAdminStaffRole(session.user.role)) {
    return { ok: false, status: 403, message: "Bạn không có quyền xem analytics affiliate." } as const;
  }
  return { ok: true, adminId: String(session.user.id), role: String(session.user.role ?? "") } as const;
}

export function isAdminAffiliateAuthErr(
  v: { ok: true; adminId: string; role: string } | { ok: false; status: number; message: string },
): v is { ok: false; status: number; message: string } {
  return v.ok === false;
}

export function applyAdminAffiliateAnalyticsRateLimit(args: {
  adminId: string;
  suffix: string;
  windowMs: number;
  max: number;
}): { ok: true } | { ok: false; retryAfterSec: number } {
  const key = `${args.adminId}:${args.suffix}`;
  const now = Date.now();
  const cur = rate.get(key);
  if (!cur || now - cur.windowStartMs >= args.windowMs) {
    rate.set(key, { windowStartMs: now, count: 1 });
    return { ok: true } as const;
  }
  if (cur.count >= args.max) {
    const leftMs = Math.max(0, args.windowMs - (now - cur.windowStartMs));
    return { ok: false, retryAfterSec: Math.ceil(leftMs / 1000) } as const;
  }
  cur.count += 1;
  return { ok: true } as const;
}

export function adminAffiliateRateLimitRetryAfter(rl: { ok: true } | { ok: false; retryAfterSec: number }): number {
  return "retryAfterSec" in rl ? rl.retryAfterSec : 1;
}

/** Optional affiliate scope for system-wide analytics; must be non-trivial length (cuid). */
export function parseAdminOptionalAffiliateId(searchParams: URLSearchParams): string | null {
  const v = searchParams.get("affiliateId")?.trim() ?? "";
  if (v.length < 16 || v.length > 40) return null;
  return v;
}
