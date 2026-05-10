/** Chỉ role + Set — dùng được ở client bundle (không Prisma / DB / next-auth). */

export const ADMIN_SUPPORT_TICKET_ROLES = new Set(["SUPER_ADMIN", "ADMIN", "CONTENT_MANAGER"]);

export function isAdminSupportTicketRole(role: string | undefined): boolean {
  return ADMIN_SUPPORT_TICKET_ROLES.has(role ?? "");
}
