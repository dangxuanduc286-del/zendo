import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hardDeleteCustomerNotificationsByIds } from "@/lib/customer-account-notification-mutations";

export async function DELETE(request: Request): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "USER") {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const customerId = String(session.user.id);

  let body: { ids?: unknown } | undefined;
  try {
    body = (await request.json()) as { ids?: unknown };
  } catch {
    return NextResponse.json({ ok: false, message: "Dữ liệu không hợp lệ." }, { status: 400 });
  }

  const raw = Array.isArray(body?.ids) ? body.ids : [];
  const ids = raw
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .map((value) => value.trim());

  if (!ids.length) {
    return NextResponse.json({ ok: false, message: "Thiếu id thông báo." }, { status: 400 });
  }

  try {
    const deleted = await hardDeleteCustomerNotificationsByIds(customerId, ids);
    return NextResponse.json({ ok: true, deleted });
  } catch {
    return NextResponse.json({ ok: false, message: "Không xóa được thông báo." }, { status: 500 });
  }
}
