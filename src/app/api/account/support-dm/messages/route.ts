import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { getAdminSupportDmUnreadTotalDb } from "@/lib/admin-support-dm";
import {
  triggerSupportDmAdminInboxMessageCreated,
  triggerSupportDmAdminInboxTotals,
  triggerSupportDmNewMessage,
} from "@/lib/support-dm-pusher";

const MAX_BODY = 8000;

export async function GET(): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "USER") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ message: "Service unavailable" }, { status: 503 });
    }
    const { db } = await import("@/lib/db");
    const conv = await db.supportDmConversation.findUnique({
      where: { customerId: session.user.id },
      select: { id: true },
    });
    if (!conv) {
      return NextResponse.json({ ok: true, messages: [] as unknown[] });
    }
    const rows = await db.supportDmMessage.findMany({
      where: { conversationId: conv.id, deletedAt: null },
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

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "USER") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ message: "Service unavailable" }, { status: 503 });
    }
    let bodyText = "";
    try {
      const j = (await req.json()) as { body?: unknown };
      bodyText = typeof j.body === "string" ? j.body.trim() : "";
    } catch {
      return NextResponse.json({ message: "Payload không hợp lệ." }, { status: 400 });
    }
    if (!bodyText || bodyText.length > MAX_BODY) {
      return NextResponse.json({ message: "Nội dung tin không hợp lệ." }, { status: 400 });
    }

    const { db } = await import("@/lib/db");
    const customerId = session.user.id;

    const result = await db.$transaction(async (tx) => {
      const conv = await tx.supportDmConversation.upsert({
        where: { customerId },
        create: { customerId, lastMessageAt: new Date() },
        update: { lastMessageAt: new Date() },
        select: {
          id: true,
          blockedAt: true,
          adminUnreadCount: true,
          customerUnreadCount: true,
        },
      });
      if (conv.blockedAt) {
        return { blocked: true as const };
      }
      const msg = await tx.supportDmMessage.create({
        data: {
          conversationId: conv.id,
          senderType: "USER",
          senderCustomerId: customerId,
          body: bodyText,
          seenBy: [customerId],
        },
        select: {
          id: true,
          body: true,
          createdAt: true,
          senderType: true,
        },
      });
      const nextAdminUnread = conv.adminUnreadCount + 1;
      await tx.supportDmConversation.update({
        where: { id: conv.id },
        data: {
          adminUnreadCount: nextAdminUnread,
          lastMessageAt: msg.createdAt,
          hiddenByAdminAt: null,
          hiddenByAdminId: null,
        },
      });
      return {
        blocked: false as const,
        conversationId: conv.id,
        message: msg,
        adminUnreadCount: nextAdminUnread,
        customerUnreadCount: conv.customerUnreadCount,
      };
    });

    if (result.blocked) {
      return NextResponse.json({ message: "Bạn đã bị chặn hỗ trợ." }, { status: 403 });
    }

    const totalAdminUnread = await getAdminSupportDmUnreadTotalDb();
    const createdAt = result.message.createdAt.toISOString();
    triggerSupportDmNewMessage(result.conversationId, {
      id: result.message.id,
      body: result.message.body,
      fromAdmin: false,
      createdAt,
      senderType: "USER",
      adminUnreadCount: result.adminUnreadCount,
      customerUnreadCount: result.customerUnreadCount,
    });
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

    void import("@/lib/admin/admin-operational-publish").then(({ notifyAdminSupportCustomerMessage }) =>
      notifyAdminSupportCustomerMessage({
        customerId,
        messageId: result.message.id,
        channel: "dm",
        preview: bodyText,
      }),
    );

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
