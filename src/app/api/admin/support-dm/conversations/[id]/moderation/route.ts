import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { getAdminSupportDmUnreadTotalDb } from "@/lib/admin-support-dm";
import { isAdminSupportTicketRole } from "@/lib/admin-support-tickets";
import { triggerSupportDmAdminInboxTotals } from "@/lib/support-dm-pusher";

type ParamsInput = Promise<{ id: string }>;

type ModerationAction = "block" | "unblock" | "hide";

export async function POST(req: Request, segment: { params: ParamsInput }): Promise<NextResponse> {
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

    let action: ModerationAction | null = null;
    let blockReason = "";
    try {
      const j = (await req.json()) as { action?: unknown; blockReason?: unknown };
      const a = typeof j.action === "string" ? j.action.trim() : "";
      if (a === "block" || a === "unblock" || a === "hide") action = a;
      blockReason = typeof j.blockReason === "string" ? j.blockReason.trim().slice(0, 500) : "";
    } catch {
      return NextResponse.json({ message: "Payload không hợp lệ." }, { status: 400 });
    }
    if (!action) {
      return NextResponse.json({ message: "Thiếu action hợp lệ." }, { status: 400 });
    }

    const { db } = await import("@/lib/db");
    const adminId = session.user.id;

    if (action === "block") {
      await db.supportDmConversation.update({
        where: { id: conversationId },
        data: {
          blockedAt: new Date(),
          blockedByAdminId: adminId,
          blockReason: blockReason || null,
        },
      });
    } else if (action === "unblock") {
      await db.supportDmConversation.update({
        where: { id: conversationId },
        data: {
          blockedAt: null,
          blockedByAdminId: null,
          blockReason: null,
        },
      });
    } else if (action === "hide") {
      await db.supportDmConversation.update({
        where: { id: conversationId },
        data: {
          hiddenByAdminAt: new Date(),
          hiddenByAdminId: adminId,
        },
      });
    }

    const totalAdminUnread = await getAdminSupportDmUnreadTotalDb();
    triggerSupportDmAdminInboxTotals({
      totalAdminUnread,
      ticketId: conversationId,
    });

    return NextResponse.json({ ok: true, action, totalAdminUnread });
  } catch {
    return NextResponse.json({ message: "Không cập nhật được." }, { status: 500 });
  }
}
