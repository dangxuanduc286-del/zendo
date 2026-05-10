import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../lib/auth";
import { getSupportTicketUnreadTotalForCustomer } from "../../../../../lib/account-support-tickets";

export async function GET(): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "USER") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ ok: true, total: 0 });
    }

    const total = await getSupportTicketUnreadTotalForCustomer(session.user.id);
    return NextResponse.json({ ok: true, total });
  } catch {
    return NextResponse.json({ ok: true, total: 0 });
  }
}
