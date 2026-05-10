import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../lib/auth";
import { ensureDefaultGeneralSupportTicketForCustomer } from "../../../../../lib/account-support-tickets";

/**
 * POST: đảm bảo có đúng một ticket GENERAL chat mặc định (không đơn / không affiliateApplication).
 * Idempotent — gọi nhiều lần không tạo ticket trùng.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    void request;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "USER") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ message: "Service unavailable" }, { status: 503 });
    }

    const row = await ensureDefaultGeneralSupportTicketForCustomer(session.user.id);
    if (!row?.id) {
      return NextResponse.json({ ok: false, error: "FAILED_TO_CREATE_TICKET" }, { status: 500 });
    }
    return NextResponse.json({ ok: true, id: row.id });
  } catch (error) {
    const e = error as { message?: unknown; code?: unknown; name?: unknown } | null;
    const message = typeof e?.message === "string" ? e.message : "Không khởi tạo được hội thoại.";
    console.error("ENSURE DEFAULT ERROR:", error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
