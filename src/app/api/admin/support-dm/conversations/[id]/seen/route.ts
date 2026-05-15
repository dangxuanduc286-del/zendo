import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { isAdminSupportTicketRole } from "@/lib/admin-support-tickets";
import { getAdminSupportDmUnreadTotalDb } from "@/lib/admin-support-dm";
import { triggerSupportDmAdminInboxTotals, triggerSupportDmSeenUpdate } from "@/lib/support-dm-pusher";

type ParamsInput = Promise<{ id: string }>;

export async function POST(_req: Request, segment: { params: ParamsInput }): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !isAdminSupportTicketRole(session.user.role)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ message: "Service unavailable" }, { status: 503 });
    }
    const { id } = await segment.params;
    const conversationId = id?.trim();
    if (!conversationId) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }
    const { db } = await import("@/lib/db");
    const adminId = session.user.id;

    const conv = await db.supportDmConversation.findFirst({
      where: { id: conversationId },
      select: { id: true, adminUnreadCount: true, customerUnreadCount: true },
    });
    if (!conv) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    const unseen = await db.supportDmMessage.findMany({
      where: {
        conversationId: conv.id,
        senderType: "USER",
        deletedAt: null,
        NOT: { seenBy: { has: adminId } },
      },
      select: { id: true, seenBy: true },
      take: 500,
    });
    for (const row of unseen) {
      await db.supportDmMessage.update({
        where: { id: row.id },
        data: { seenBy: [...row.seenBy, adminId] },
      });
    }

    const updated = await db.supportDmConversation.update({
      where: { id: conv.id },
      data: { adminUnreadCount: 0 },
      select: { customerUnreadCount: true, adminUnreadCount: true },
    });

    triggerSupportDmSeenUpdate(conv.id, {
      customerUnreadCount: updated.customerUnreadCount,
      adminUnreadCount: updated.adminUnreadCount,
    });

    const totalAdminUnread = await getAdminSupportDmUnreadTotalDb();
    triggerSupportDmAdminInboxTotals({
      totalAdminUnread,
      ticketId: conv.id,
    });

    return NextResponse.json({
      ok: true,
      customerUnreadCount: updated.customerUnreadCount,
      adminUnreadCount: updated.adminUnreadCount,
    });
  } catch {
    return NextResponse.json({ message: "Không cập nhật trạng thái đã đọc." }, { status: 500 });
  }
}
