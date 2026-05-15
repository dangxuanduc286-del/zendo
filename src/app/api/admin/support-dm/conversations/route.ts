import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { isAdminSupportTicketRole } from "@/lib/admin-support-tickets";

export async function GET(): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !isAdminSupportTicketRole(session.user.role)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ message: "Service unavailable" }, { status: 503 });
    }
    const { db } = await import("@/lib/db");
    const rows = await db.supportDmConversation.findMany({
      where: { hiddenByAdminAt: null },
      orderBy: { lastMessageAt: "desc" },
      take: 200,
      select: {
        id: true,
        lastMessageAt: true,
        adminUnreadCount: true,
        customerUnreadCount: true,
        blockedAt: true,
        customer: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            affiliateProfiles: { where: { status: "ACTIVE" }, take: 1, select: { refCode: true } },
          },
        },
      },
    });
    const conversations = rows.map((r) => {
      const ap = r.customer.affiliateProfiles[0];
      const participantKind = ap ? ("affiliate" as const) : ("customer" as const);
      const name =
        r.customer.fullName?.trim() ||
        r.customer.phone?.trim() ||
        r.customer.email?.trim() ||
        "Khách hàng";
      return {
        id: r.id,
        lastMessageAt: r.lastMessageAt.toISOString(),
        adminUnreadCount: r.adminUnreadCount,
        customerUnreadCount: r.customerUnreadCount,
        blockedAt: r.blockedAt ? r.blockedAt.toISOString() : null,
        participantKind,
        senderDisplayName: ap ? `${name} (CTV)` : name,
        displaySubject: "Hỗ trợ trực tiếp",
      };
    });
    return NextResponse.json({ ok: true, conversations });
  } catch {
    return NextResponse.json({ message: "Không tải được danh sách." }, { status: 500 });
  }
}
