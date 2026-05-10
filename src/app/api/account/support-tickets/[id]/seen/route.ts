import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../../lib/auth";
import { markSupportTicketMessagesSeen } from "../../../../../../lib/support-ticket-seen";
import { triggerSupportTicketSeenUpdate } from "../../../../../../lib/support-ticket-pusher";

type ParamsInput = Promise<{ id: string }>;

export async function POST(_request: Request, segment: { params: ParamsInput }): Promise<NextResponse> {
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

    const { db } = await import("../../../../../../lib/db");
    const ticket = await db.supportTicket.findFirst({
      where: { id: ticketId.trim(), customerId: session.user.id },
      select: { id: true },
    });
    if (!ticket) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    const payload = await markSupportTicketMessagesSeen(ticket.id, session.user.id, "customer");
    triggerSupportTicketSeenUpdate(ticket.id, payload);

    return NextResponse.json({ ok: true, ...payload });
  } catch {
    return NextResponse.json({ message: "Không cập nhật trạng thái đã đọc." }, { status: 500 });
  }
}
