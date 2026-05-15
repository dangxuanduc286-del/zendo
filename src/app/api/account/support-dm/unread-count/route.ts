import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";

export async function GET(): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "USER") {
      return NextResponse.json({ ok: true, total: 0, conversationId: null as string | null });
    }
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ message: "Service unavailable" }, { status: 503 });
    }
    const { db } = await import("@/lib/db");
    const row = await db.supportDmConversation.findUnique({
      where: { customerId: session.user.id },
      select: { id: true, customerUnreadCount: true },
    });
    const total =
      row && typeof row.customerUnreadCount === "number" && Number.isFinite(row.customerUnreadCount)
        ? Math.max(0, Math.floor(row.customerUnreadCount))
        : 0;
    return NextResponse.json({ ok: true, total, conversationId: row?.id ?? null });
  } catch {
    return NextResponse.json({ ok: true, total: 0, conversationId: null });
  }
}
