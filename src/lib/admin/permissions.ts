export type AdminRole = "SUPER_ADMIN" | "ADMIN" | "CONTENT_MANAGER";

const ADMIN_ROLES: readonly AdminRole[] = ["SUPER_ADMIN", "ADMIN", "CONTENT_MANAGER"] as const;

export function isAdminRole(role: unknown): role is AdminRole {
  return typeof role === "string" && (ADMIN_ROLES as readonly string[]).includes(role);
}

type MinimalSession = { user?: { id?: string; role?: unknown } } | null | undefined;

/**
 * Deny-by-default: if session/role is missing or unknown, return false.
 * NOTE: In this step we intentionally keep the existing role hierarchy unchanged.
 */
export function canAccessAdmin(session: MinimalSession): boolean {
  const userId = session?.user?.id;
  if (typeof userId !== "string" || !userId.trim()) return false;
  return isAdminRole(session?.user?.role);
}

export function canViewPayoutAccounts(session: MinimalSession): boolean {
  return canAccessAdmin(session);
}

export function canApprovePayoutAccount(session: MinimalSession): boolean {
  return canAccessAdmin(session);
}

export function canRejectPayoutAccount(session: MinimalSession): boolean {
  return canAccessAdmin(session);
}

export function canViewSensitiveKyc(session: MinimalSession): boolean {
  return canAccessAdmin(session);
}

export function canAccessAdminMediaProxy(session: MinimalSession): boolean {
  return canViewSensitiveKyc(session);
}

