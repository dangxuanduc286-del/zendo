import "server-only";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { applySharedRateLimit, rateLimitRetryAfter } from "@/lib/rate-limit-shared";

export function isAdminStaffRole(role: string | undefined): boolean {
  return role === "SUPER_ADMIN" || role === "ADMIN" || role === "CONTENT_MANAGER";
}

/** Chỉ SUPER_ADMIN / ADMIN được POST thao tác vận hành (không CONTENT_MANAGER). */
export function canAdminMutateSystemOperations(role: string | undefined): boolean {
  return role === "SUPER_ADMIN" || role === "ADMIN";
}

export async function requireAdminSystemSession(): Promise<
  | { ok: true; adminId: string; role: string }
  | { ok: false; status: number; message: string }
> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { ok: false, status: 401, message: "Unauthorized" } as const;
  }
  if (!isAdminStaffRole(session.user.role)) {
    return { ok: false, status: 403, message: "Bạn không có quyền." } as const;
  }
  return { ok: true, adminId: String(session.user.id), role: String(session.user.role ?? "") } as const;
}

export function isAdminSystemAuthErr(
  v: { ok: true; adminId: string; role: string } | { ok: false; status: number; message: string },
): v is { ok: false; status: number; message: string } {
  return v.ok === false;
}

export async function applySystemOpsRateLimit(args: {
  adminId: string;
  suffix: string;
  windowMs: number;
  max: number;
}): Promise<{ ok: true } | { ok: false; retryAfterSec: number }> {
  return applySharedRateLimit({
    scope: "admin-system-ops",
    key: `${args.adminId}:${args.suffix}`.slice(0, 200),
    windowMs: args.windowMs,
    max: args.max,
  });
}

export { rateLimitRetryAfter };
