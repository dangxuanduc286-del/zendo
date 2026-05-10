import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import {
  buildAdminSupportTicketWhere,
  isAdminSupportTicketRole,
  parseAdminSupportTicketListFilter,
  parseAdminSupportTicketListTag,
} from "../../../../lib/admin-support-tickets";
import {
  adminSupportTicketListSelect,
  serializeAdminSupportTicketListRow,
} from "../../../../lib/support-ticket-api-serializers";

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !isAdminSupportTicketRole(session.user.role)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ message: "Service unavailable" }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const filter = parseAdminSupportTicketListFilter(searchParams.get("filter"));
    const tag = parseAdminSupportTicketListTag(searchParams.get("tag"));

    const { db } = await import("../../../../lib/db");
    const where = buildAdminSupportTicketWhere(filter, tag);

    const rows = await db.supportTicket.findMany({
      where,
      orderBy: { lastMessageAt: "desc" },
      take: 200,
      select: adminSupportTicketListSelect,
    });

    const tickets = rows.map((r) => serializeAdminSupportTicketListRow(r));

    return NextResponse.json({ ok: true, tickets });
  } catch {
    return NextResponse.json({ message: "Không tải được danh sách ticket." }, { status: 500 });
  }
}
