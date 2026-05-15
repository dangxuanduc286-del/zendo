import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { isAdminSupportTicketRole } from "@/lib/admin-support-tickets";
import { getAdminSupportDmUnreadTotalDb } from "@/lib/admin-support-dm";
import { triggerSupportDmAdminInboxMessageCreated, triggerSupportDmAdminInboxTotals, triggerSupportDmNewMessage } from "@/lib/support-dm-pusher";

type ParamsInput = Promise<{ id: string }>;

export async function GET(_req: Request, segment: { params: ParamsInput }): Promise<NextResponse> {
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
    const conv = await db.supportDmConversation.findFirst({
      where: { id: conversationId },
      select: { id: true },
    });
    if (!conv) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }
    const rows = await db.supportDmMessage.findMany({
      where: { conversationId, deletedAt: null },
      orderBy: { createdAt: "asc" },
      take: 200,
      select: {
        id: true,
        body: true,
        senderType: true,
        createdAt: true,
        seenBy: true,
      },
    });
    const messages = rows.map((m) => ({
      id: m.id,
      body: m.body,
      fromAdmin: m.senderType === "ADMIN",
      createdAt: m.createdAt.toISOString(),
      seenBy: m.seenBy,
    }));
    return NextResponse.json({ ok: true, messages });
  } catch {
    return NextResponse.json({ message: "Không tải được tin nhắn." }, { status: 500 });
  }
}

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
    let bodyText = "";
    try {
      const j = (await req.json()) as { body?: unknown };
      bodyText = typeof j.body === "string" ? j.body.trim() : "";
    } catch {
      return NextResponse.json({ message: "Payload không hợp lệ." }, { status: 400 });
    }
    if (!bodyText || bodyText.length > 8000) {
      return NextResponse.json({ message: "Nội dung tin không hợp lệ." }, { status: 400 });
    }

    const { db } = await import("@/lib/db");
    const adminId = session.user.id;

    const result = await db.$transaction(async (tx) => {
      const conv = await tx.supportDmConversation.findFirst({
        where: { id: conversationId },
        select: {
          id: true,
          adminUnreadCount: true,
          customerUnreadCount: true,
        },
      });
      if (!conv) return { notFound: true as const };
      const msg = await tx.supportDmMessage.create({
        data: {
          conversationId: conv.id,
          senderType: "ADMIN",
          senderAdminId: adminId,
          body: bodyText,
          seenBy: [adminId],
        },
        select: { id: true, body: true, createdAt: true },
      });
      const nextCustomerUnread = conv.customerUnreadCount + 1;
      await tx.supportDmConversation.update({
        where: { id: conv.id },
        data: {
          customerUnreadCount: nextCustomerUnread,
          lastMessageAt: msg.createdAt,
        },
      });
      return {
        ok: true as const,
        conversationId: conv.id,
        message: msg,
        adminUnreadCount: conv.adminUnreadCount,
        customerUnreadCount: nextCustomerUnread,
      };
    });

    if ("notFound" in result && result.notFound) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }
    if (!("ok" in result) || !result.ok) {
      return NextResponse.json({ message: "Lỗi gửi tin." }, { status: 500 });
    }

    const createdAt = result.message.createdAt.toISOString();
    triggerSupportDmNewMessage(result.conversationId, {
      id: result.message.id,
      body: result.message.body,
      fromAdmin: true,
      createdAt,
      senderType: "ADMIN",
      adminUnreadCount: result.adminUnreadCount,
      customerUnreadCount: result.customerUnreadCount,
    });
    const totalAdminUnread = await getAdminSupportDmUnreadTotalDb();
    triggerSupportDmAdminInboxMessageCreated({
      totalAdminUnread,
      ticketId: result.conversationId,
      messageId: result.message.id,
      preview: bodyText.length > 120 ? `${bodyText.slice(0, 120)}…` : bodyText,
    });
    triggerSupportDmAdminInboxTotals({
      totalAdminUnread,
      ticketId: result.conversationId,
    });

    return NextResponse.json({
      ok: true,
      id: result.message.id,
      adminUnreadCount: result.adminUnreadCount,
      customerUnreadCount: result.customerUnreadCount,
    });
  } catch {
    return NextResponse.json({ message: "Không gửi được tin nhắn." }, { status: 500 });
  }
}
