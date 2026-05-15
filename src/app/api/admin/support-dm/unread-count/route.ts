import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { getAdminSupportDmUnreadTotalDb } from "@/lib/admin-support-dm";
import { isAdminSupportTicketRole } from "@/lib/admin-support-tickets";

export async function GET(): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !isAdminSupportTicketRole(session.user.role)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const count = await getAdminSupportDmUnreadTotalDb();
    return NextResponse.json({ count });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
