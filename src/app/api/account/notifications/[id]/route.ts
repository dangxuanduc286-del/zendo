import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hardDeleteCustomerNotificationById } from "@/lib/customer-account-notification-mutations";

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "USER") {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const customerId = String(session.user.id);
  const { id } = await ctx.params;
  const notificationId = typeof id === "string" ? id : "";

  try {
    const deleted = await hardDeleteCustomerNotificationById(customerId, notificationId);
    if (!deleted) {
      return NextResponse.json({ ok: false, message: "Không tìm thấy thông báo." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, message: "Không xóa được thông báo." }, { status: 500 });
  }
}
