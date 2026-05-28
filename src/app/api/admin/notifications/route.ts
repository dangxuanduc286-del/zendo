import { NextResponse } from "next/server";
import { listAdminNotifications } from "@/lib/admin/admin-operational-events";

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const url = new URL(request.url);
    const unreadOnly = url.searchParams.get("unreadOnly") === "1";
    const limit = Number(url.searchParams.get("limit") ?? "20");
    const items = await listAdminNotifications({ unreadOnly, limit });
    return NextResponse.json({ ok: true, items });
  } catch (e) {
    const code = e instanceof Error ? e.message : "ERROR";
    if (code === "UNAUTHORIZED") {
      return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }
    console.error("[admin/notifications]", e);
    return NextResponse.json({ ok: false, message: "Không tải được thông báo." }, { status: 500 });
  }
}
