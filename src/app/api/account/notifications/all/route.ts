import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hardDeleteAllCustomerNotifications } from "@/lib/customer-account-notification-mutations";

export async function DELETE(): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "USER") {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const customerId = String(session.user.id);

  try {
    const deleted = await hardDeleteAllCustomerNotifications(customerId);
    return NextResponse.json({ ok: true, deleted });
  } catch {
    return NextResponse.json({ ok: false, message: "Không xóa được thông báo." }, { status: 500 });
  }
}
