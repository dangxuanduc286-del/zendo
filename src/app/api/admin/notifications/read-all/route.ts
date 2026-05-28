import { NextResponse } from "next/server";
import { assertAdminStaffAccess, markAllAdminNotificationsRead } from "@/lib/admin/admin-operational-events";

export async function POST(): Promise<NextResponse> {
  try {
    const { adminId } = await assertAdminStaffAccess();
    const count = await markAllAdminNotificationsRead(adminId);
    return NextResponse.json({ ok: true, count });
  } catch (e) {
    const code = e instanceof Error ? e.message : "ERROR";
    if (code === "UNAUTHORIZED") {
      return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ ok: false, message: "Không cập nhật được." }, { status: 500 });
  }
}
