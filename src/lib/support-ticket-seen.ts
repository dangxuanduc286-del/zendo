import type { SupportTicketSeenUpdatePayload } from "./support-ticket-pusher";

/** Phía nào xem hội thoại → reset đúng bộ đếm unread trên ticket (không đụng bên kia). */
export type SupportTicketSeenClearSide = "customer" | "admin";

/**
 * Gắn viewerId vào `seenBy` của mọi tin trong ticket nếu chưa có (idempotent).
 * Reset `customerUnreadCount` hoặc `adminUnreadCount` về 0 theo vai trò người xem.
 */
export async function markSupportTicketMessagesSeen(
  ticketId: string,
  viewerId: string,
  clearUnread: SupportTicketSeenClearSide,
): Promise<SupportTicketSeenUpdatePayload> {
  const { db } = await import("./db");
  const tid = ticketId.trim();
  const vid = viewerId.trim();
  if (!tid || !vid) {
    return { updates: [], customerUnreadCount: 0, adminUnreadCount: 0 };
  }

  return db.$transaction(async (tx) => {
    const rows = await tx.supportTicketMessage.findMany({
      where: { ticketId: tid, NOT: { seenBy: { has: vid } } },
      select: { id: true, seenBy: true },
    });

    const updates: Array<{ id: string; seenBy: string[] }> = [];
    for (const row of rows) {
      const seenBy = [...row.seenBy, vid];
      await tx.supportTicketMessage.update({
        where: { id: row.id },
        data: { seenBy },
      });
      updates.push({ id: row.id, seenBy });
    }

    const countPatch =
      clearUnread === "admin" ? { adminUnreadCount: 0 } : { customerUnreadCount: 0 };

    await tx.supportTicket.update({
      where: { id: tid },
      data: countPatch,
    });

    const ticket = await tx.supportTicket.findUnique({
      where: { id: tid },
      select: { customerUnreadCount: true, adminUnreadCount: true },
    });

    return {
      updates,
      customerUnreadCount: ticket?.customerUnreadCount ?? 0,
      adminUnreadCount: ticket?.adminUnreadCount ?? 0,
    };
  });
}
