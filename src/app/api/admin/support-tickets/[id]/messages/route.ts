import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../../lib/auth";
import { clampTicketBody } from "../../../../../../lib/account-support-tickets";
import { isAdminSupportTicketRole } from "../../../../../../lib/admin-support-tickets";
import { triggerSupportTicketNewMessage } from "../../../../../../lib/support-ticket-pusher";

type ParamsInput = Promise<{ id: string }>;

export async function POST(
  request: Request,
  { params }: { params: ParamsInput },
): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !isAdminSupportTicketRole(session.user.role)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ message: "Service unavailable" }, { status: 503 });
    }

    const { id } = await Promise.resolve(params);
    if (!id?.trim()) {
      return NextResponse.json({ message: "Thiếu mã ticket." }, { status: 400 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ message: "Dữ liệu không hợp lệ." }, { status: 400 });
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ message: "Dữ liệu không hợp lệ." }, { status: 400 });
    }
    const rec = body as Record<string, unknown>;
    const textBody = clampTicketBody(rec.body);
    if (!textBody) {
      return NextResponse.json({ message: "Nội dung tin nhắn không được để trống." }, { status: 400 });
    }

    const { db } = await import("../../../../../../lib/db");
    const tid = id.trim();
    const now = new Date();

    const result = await db.$transaction(async (tx) => {
      const ticket = await tx.supportTicket.findUnique({
        where: { id: tid },
        select: { id: true, assignedAdminId: true },
      });
      if (!ticket) return null;

      const msg = await tx.supportTicketMessage.create({
        data: {
          ticketId: ticket.id,
          senderAdminId: session.user.id,
          senderRole: "ADMIN",
          body: textBody,
        },
        select: { id: true, createdAt: true, seenBy: true },
      });

      await tx.supportTicket.update({
        where: { id: ticket.id },
        data: {
          lastMessageAt: now,
          status: "WAITING_USER",
          customerUnreadCount: { increment: 1 },
          ...(ticket.assignedAdminId ? {} : { assignedAdminId: session.user.id }),
        },
      });

      const counts = await tx.supportTicket.findUnique({
        where: { id: ticket.id },
        select: { adminUnreadCount: true, customerUnreadCount: true },
      });

      return { msg, adminUnreadCount: counts?.adminUnreadCount ?? 0, customerUnreadCount: counts?.customerUnreadCount ?? 0 };
    });

    if (!result) {
      return NextResponse.json({ message: "Không tìm thấy ticket." }, { status: 404 });
    }

    triggerSupportTicketNewMessage(tid, {
      id: result.msg.id,
      body: textBody,
      fromAdmin: true,
      senderRole: "ADMIN",
      createdAt: result.msg.createdAt.toISOString(),
      seenBy: result.msg.seenBy,
      adminUnreadCount: result.adminUnreadCount,
      customerUnreadCount: result.customerUnreadCount,
    });

    return NextResponse.json(
      {
        ok: true,
        id: result.msg.id,
        messageId: result.msg.id,
        createdAt: result.msg.createdAt.toISOString(),
        adminUnreadCount: result.adminUnreadCount,
        customerUnreadCount: result.customerUnreadCount,
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json({ message: "Không gửi được tin nhắn." }, { status: 500 });
  }
}
