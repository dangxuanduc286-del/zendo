import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../lib/auth";
import { getSupportTicketDetailForCustomer } from "../../../../../lib/account-support-tickets";
import { serializeCustomerSupportTicketApi } from "../../../../../lib/support-ticket-api-serializers";

type ParamsInput = Promise<{ id: string }>;

export async function GET(_request: Request, segment: { params: ParamsInput }): Promise<NextResponse> {
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

    const detail = await getSupportTicketDetailForCustomer(session.user.id, ticketId.trim());
    if (!detail) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      ticket: serializeCustomerSupportTicketApi(detail.ticket),
      messages: detail.messages,
    });
  } catch {
    return NextResponse.json({ message: "Không đọc được ticket." }, { status: 500 });
  }
}
