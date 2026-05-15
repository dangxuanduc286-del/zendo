import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";

export async function GET(): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "USER") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ message: "Service unavailable" }, { status: 503 });
    }
    const { db } = await import("@/lib/db");
    const customerId = session.user.id;
    const conv = await db.supportDmConversation.upsert({
      where: { customerId },
      create: {
        customerId,
        lastMessageAt: new Date(),
      },
      update: {},
      select: {
        id: true,
        customerUnreadCount: true,
        adminUnreadCount: true,
        blockedAt: true,
        blockReason: true,
        lastMessageAt: true,
      },
    });
    return NextResponse.json({ ok: true, conversation: conv });
  } catch {
    return NextResponse.json({ message: "Không tải được hội thoại." }, { status: 500 });
  }
}
