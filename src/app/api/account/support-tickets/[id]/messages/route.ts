import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../../lib/auth";
import { clampTicketBody, postSupportTicketMessageForCustomer } from "../../../../../../lib/account-support-tickets";
import { getAdminSupportTicketUnreadTotalDb } from "../../../../../../lib/admin-support-tickets";
import { deriveSupportTicketSenderDisplayName } from "../../../../../../lib/support-ticket-sender-display";
import {
  triggerSupportAdminInboxTicketMessageCreated,
  triggerSupportAdminInboxTicketRestored,
  triggerSupportTicketNewMessage,
  triggerSupportTicketTicketRestored,
} from "../../../../../../lib/support-ticket-pusher";

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
        void (async () => {
          const totalAdminUnread = await getAdminSupportTicketUnreadTotalDb();
          const ticketRow = await db.supportTicket.findUnique({
            where: { id: tid },
            select: {
              lastMessageAt: true,
              adminUnreadCount: true,
              customer: { select: { fullName: true, phone: true, email: true } },
              affiliateApplication: { select: { fullName: true, phone: true, email: true } },
            },
          });
          const app = ticketRow?.affiliateApplication;
          const affApp =
            app && (app.fullName?.trim() || app.phone?.trim() || app.email?.trim())
              ? {
                  fullName: app.fullName ?? "",
                  phone: app.phone ?? "",
                  email: app.email ?? null,
                }
              : null;
          const cust = ticketRow?.customer;
          const customerName = cust
            ? deriveSupportTicketSenderDisplayName(
                {
                  fullName: cust.fullName,
                  phone: cust.phone,
                  email: cust.email,
                },
                affApp,
              )
            : "Khách hàng";
          const preview = textBody.length > 200 ? `${textBody.slice(0, 200)}…` : textBody;
          triggerSupportAdminInboxTicketMessageCreated({
            totalAdminUnread,
            ticketId: tid,
            messageId: posted.id,
            preview,
            customerName,
            ticketAdminUnread: ticketRow?.adminUnreadCount ?? ac,
            lastMessageAt: ticketRow?.lastMessageAt?.toISOString(),
          });
        })();
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
      if (posted.reopened) {
        void getAdminSupportTicketUnreadTotalDb().then((totalAdminUnread) => {
          triggerSupportTicketTicketRestored(tid);
          triggerSupportAdminInboxTicketRestored({ totalAdminUnread, ticketId: tid });
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
      if (e instanceof Error && e.message === "TICKET_BLOCKED") {
        return NextResponse.json({ message: "Bạn đã bị chặn liên hệ hỗ trợ." }, { status: 403 });
      }
      throw e;
    }
  } catch {
    return NextResponse.json({ message: "Không gửi được tin nhắn." }, { status: 500 });
  }
}
