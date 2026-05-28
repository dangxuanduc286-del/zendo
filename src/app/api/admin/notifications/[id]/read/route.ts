import { NextResponse } from "next/server";
import { assertAdminStaffAccess, markAdminNotificationRead } from "@/lib/admin/admin-operational-events";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const { adminId } = await assertAdminStaffAccess();
    const { id } = await context.params;
    await markAdminNotificationRead(id, adminId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const code = e instanceof Error ? e.message : "ERROR";
    if (code === "UNAUTHORIZED") {
      return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ ok: false, message: "Không cập nhật được." }, { status: 500 });
  }
}
