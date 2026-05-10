import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../../lib/auth";
import { clampTicketBody, postSupportTicketMessageForCustomer } from "../../../../../../lib/account-support-tickets";
import { triggerSupportTicketNewMessage } from "../../../../../../lib/support-ticket-pusher";

type ParamsInput = Promise<{ id: string }>;

export async function POST(request: Request, segment: { params: ParamsInput }): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "USER") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ message: "Service unavailable" }, { status: 503 });
    }

    const { id: ticketId } = await segment.params;
    if (!ticketId?.trim()) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
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
    const textBody = clampTicketBody((body as Record<string, unknown>).body);
    if (!textBody) {
      return NextResponse.json({ message: "Nội dung tin nhắn không được để trống." }, { status: 400 });
    }

    try {
      const posted = await postSupportTicketMessageForCustomer(session.user.id, ticketId.trim(), textBody);
      if (!posted) {
        return NextResponse.json({ message: "Not found" }, { status: 404 });
      }
      const tid = ticketId.trim();
      const { db } = await import("../../../../../../lib/db");
      const row = await db.supportTicketMessage.findUnique({
        where: { id: posted.id },
        select: { createdAt: true, senderAdminId: true, senderRole: true, seenBy: true },
      });
      const counts = await db.supportTicket.findUnique({
        where: { id: tid },
        select: { adminUnreadCount: true, customerUnreadCount: true },
      });
      const ac = counts?.adminUnreadCount ?? posted.adminUnreadCount;
      const cc = counts?.customerUnreadCount ?? posted.customerUnreadCount;
      if (row) {
        triggerSupportTicketNewMessage(tid, {
          id: posted.id,
          body: textBody,
          fromAdmin: Boolean(row.senderAdminId),
          senderRole: row.senderRole,
          createdAt: row.createdAt.toISOString(),
          seenBy: row.seenBy,
          adminUnreadCount: ac,
          customerUnreadCount: cc,
        });
      }
      if (posted.autoReply) {
        const a = posted.autoReply;
        triggerSupportTicketNewMessage(tid, {
          id: a.id,
          body: a.body,
          fromAdmin: true,
          senderRole: "ADMIN",
          createdAt: a.createdAt.toISOString(),
          seenBy: a.seenBy,
          adminUnreadCount: a.adminUnreadCount,
          customerUnreadCount: a.customerUnreadCount,
        });
      }
      return NextResponse.json(
        {
          ok: true,
          messageId: posted.id,
          id: posted.id,
          adminUnreadCount: ac,
          customerUnreadCount: cc,
        },
        { status: 201 },
      );
    } catch (e) {
      if (e instanceof Error && e.message === "TICKET_CLOSED") {
        return NextResponse.json({ message: "Ticket đã đóng, không thể gửi thêm tin nhắn." }, { status: 409 });
      }
      throw e;
    }
  } catch {
    return NextResponse.json({ message: "Không gửi được tin nhắn." }, { status: 500 });
  }
}
