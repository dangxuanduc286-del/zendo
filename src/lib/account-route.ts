const ADMIN_ROLES = new Set(["SUPER_ADMIN", "CONTENT_MANAGER", "ADMIN"]);

/** Minimal session shape for routing (RSC + client). */
export type AccountRouteSession = {
  user?: { id?: string | null; role?: string | null } | null;
} | null;

/**
 * Href «Tài khoản» trên storefront header (mobile + desktop menu).
 * — Khách: `/dang-nhap` (alias → `/tai-khoan`).
 * — Admin: `/admin` (không dùng dashboard khách).
 * — Khách / CTV (USER): `/tai-khoan`.
 */
export function getAccountRoute(session: AccountRouteSession): string {
  const user = session?.user;
  if (!user?.id) return "/dang-nhap";
  if (user.role && ADMIN_ROLES.has(user.role)) return "/admin";
  return "/tai-khoan";
}
