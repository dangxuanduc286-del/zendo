import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../lib/auth";
import { isAdminSupportTicketRole, getAdminSupportTicketUnreadTotalDb } from "../../../../../lib/admin-support-tickets";
import {
  triggerSupportAdminInboxMessageDeleted,
  triggerSupportTicketMessageDeleted,
} from "../../../../../lib/support-ticket-pusher";
import { recalculateSupportTicketUnreadCounts } from "../../../../../lib/support-ticket-unread-recount";

type ParamsInput = Promise<{ id: string }>;

export async function PATCH(
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
    const mid = id?.trim();
    if (!mid) {
      return NextResponse.json({ message: "Thiếu mã tin nhắn." }, { status: 400 });
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
    if (rec.deleted !== true) {
      return NextResponse.json({ message: "Chỉ hỗ trợ { \"deleted\": true }." }, { status: 400 });
    }

    const { db } = await import("../../../../../lib/db");
    const adminId = session.user.id.trim();
    const now = new Date();

    const result = await db.$transaction(async (tx) => {
      const msg = await tx.supportTicketMessage.findUnique({
        where: { id: mid },
        select: {
          id: true,
          ticketId: true,
          deletedAt: true,
          ticket: { select: { id: true } },
        },
      });
      if (!msg) return { ok: "not_found" as const };
      if (msg.deletedAt) return { ok: "already" as const };

      await tx.supportTicketMessage.update({
        where: { id: mid },
        data: { deletedAt: now, deletedByAdminId: adminId },
      });

      const counts = await recalculateSupportTicketUnreadCounts(tx, msg.ticketId);
      return { ok: "ok" as const, ticketId: msg.ticketId, counts };
    });

    if (result.ok === "not_found") {
      return NextResponse.json({ message: "Không tìm thấy tin nhắn." }, { status: 404 });
    }
    if (result.ok === "already") {
      return NextResponse.json({ message: "Tin nhắn đã được xóa trước đó." }, { status: 400 });
    }

    const ticketId = result.ticketId;
    const counts = result.counts;
    const deletedAtIso = now.toISOString();

    triggerSupportTicketMessageDeleted(ticketId, {
      id: mid,
      deletedAt: deletedAtIso,
      adminUnreadCount: counts.adminUnreadCount,
      customerUnreadCount: counts.customerUnreadCount,
    });

    const totalAdminUnread = await getAdminSupportTicketUnreadTotalDb();
    triggerSupportAdminInboxMessageDeleted({
      totalAdminUnread,
      ticketId,
      messageId: mid,
    });

    return NextResponse.json({
      ok: true,
      id: mid,
      deletedAt: deletedAtIso,
      adminUnreadCount: counts.adminUnreadCount,
      customerUnreadCount: counts.customerUnreadCount,
      totalAdminUnread,
    });
  } catch {
    return NextResponse.json({ message: "Không cập nhật được tin nhắn." }, { status: 500 });
  }
}
