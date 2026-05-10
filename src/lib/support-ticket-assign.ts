import type { Prisma } from "@prisma/client";

import { ADMIN_SUPPORT_TICKET_ROLES } from "./admin-support-ticket-roles";

/**
 * Chọn admin gán ticket (round-robin đơn giản theo tổng số ticket).
 * Chỉ admin ACTIVE + role.name thuộc nhóm xử lý support ticket.
 */
export async function pickRoundRobinSupportAssigneeId(
  tx: Prisma.TransactionClient,
): Promise<string | null> {
  const roleNames = [...ADMIN_SUPPORT_TICKET_ROLES];
  const admins = await tx.admin.findMany({
    where: {
      status: "ACTIVE",
      role: { name: { in: roleNames } },
    },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  if (admins.length === 0) return null;
  const total = await tx.supportTicket.count();
  const idx = total % admins.length;
  return admins[idx]?.id ?? null;
}
