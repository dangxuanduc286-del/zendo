import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { getAdminSupportDmUnreadTotalDb } from "@/lib/admin-support-dm";
import { triggerSupportDmAdminInboxTotals, triggerSupportDmSeenUpdate } from "@/lib/support-dm-pusher";

export async function POST(): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "USER") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ message: "Service unavailable" }, { status: 503 });
    }
    const { db } = await import("@/lib/db");
    const customerId = session.user.id;

    const conv = await db.supportDmConversation.findUnique({
      where: { customerId },
      select: { id: true, customerUnreadCount: true, adminUnreadCount: true },
    });
    if (!conv) {
      return NextResponse.json({ ok: true, customerUnreadCount: 0, adminUnreadCount: 0 });
    }

    const unseen = await db.supportDmMessage.findMany({
      where: {
        conversationId: conv.id,
        senderType: "ADMIN",
        deletedAt: null,
        NOT: { seenBy: { has: customerId } },
      },
      select: { id: true, seenBy: true },
      take: 500,
    });
    for (const row of unseen) {
      await db.supportDmMessage.update({
        where: { id: row.id },
        data: { seenBy: [...row.seenBy, customerId] },
      });
    }

    const updated = await db.supportDmConversation.update({
      where: { id: conv.id },
      data: { customerUnreadCount: 0 },
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
