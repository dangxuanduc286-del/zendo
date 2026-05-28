import { NextResponse } from "next/server";
import { getAdminNotificationUnreadCount } from "@/lib/admin/admin-operational-events";

export async function GET(): Promise<NextResponse> {
  try {
    const count = await getAdminNotificationUnreadCount();
    return NextResponse.json({ ok: true, count });
  } catch (e) {
    const code = e instanceof Error ? e.message : "ERROR";
    if (code === "UNAUTHORIZED") {
      return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ ok: true, count: 0 });
  }
}
