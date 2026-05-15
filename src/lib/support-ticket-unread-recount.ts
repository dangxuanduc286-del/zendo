import type { Prisma } from "@prisma/client";

/**
 * Đồng bộ lại `adminUnreadCount` / `customerUnreadCount` trên ticket từ DB
 * (tin đã soft-delete không tính; tin chưa đọc theo `seenBy`).
 */
export async function recalculateSupportTicketUnreadCounts(
  tx: Prisma.TransactionClient,
  ticketId: string,
): Promise<{ adminUnreadCount: number; customerUnreadCount: number }> {
  const tid = ticketId.trim();
  const ticket = await tx.supportTicket.findUnique({
    where: { id: tid },
    select: { id: true, customerId: true },
  });
  if (!ticket) {
    return { adminUnreadCount: 0, customerUnreadCount: 0 };
  }

  const admins = await tx.admin.findMany({ select: { id: true } });
  const adminIds = admins.map((a) => a.id);

  const baseCustomerMsg = {
    ticketId: tid,
    deletedAt: null,
    senderRole: { in: ["CUSTOMER", "AFFILIATE"] as const },
    senderCustomerId: { not: null },
  } satisfies Prisma.SupportTicketMessageWhereInput;

  let adminUnreadCount: number;
  if (adminIds.length === 0) {
    adminUnreadCount = await tx.supportTicketMessage.count({ where: baseCustomerMsg });
  } else {
    adminUnreadCount = await tx.supportTicketMessage.count({
      where: {
        ...baseCustomerMsg,
        AND: adminIds.map((id) => ({ NOT: { seenBy: { has: id } } })),
      },
    });
  }

  const customerUnreadCount = await tx.supportTicketMessage.count({
    where: {
      ticketId: tid,
      deletedAt: null,
      senderAdminId: { not: null },
      NOT: { seenBy: { has: ticket.customerId } },
    },
  });

  await tx.supportTicket.update({
    where: { id: tid },
    data: { adminUnreadCount, customerUnreadCount },
  });

  return { adminUnreadCount, customerUnreadCount };
}
