import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../lib/auth";
import { getAdminSupportTicketUnreadTotalDb, isAdminSupportTicketRole } from "../../../../../lib/admin-support-tickets";

export async function GET(): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !isAdminSupportTicketRole(session.user.role)) {
      return NextResponse.json({ ok: false, count: 0, error: "UNAUTHORIZED" }, { status: 401 });
    }
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ ok: false, count: 0, error: "SERVICE_UNAVAILABLE" }, { status: 503 });
    }
    const count = await getAdminSupportTicketUnreadTotalDb();
    return NextResponse.json({ ok: true, count });
  } catch {
    return NextResponse.json({ ok: false, count: 0 }, { status: 500 });
  }
}
