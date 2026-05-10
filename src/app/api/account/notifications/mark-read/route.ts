import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(request: Request): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "USER") {
    return NextResponse.json({ ok: false, message: "Không xác thực." }, { status: 401 });
  }

  let body: { ids?: unknown } | undefined;
  try {
    body = (await request.json()) as { ids?: unknown };
  } catch {
    return NextResponse.json({ ok: false, message: "Dữ liệu không hợp lệ." }, { status: 400 });
  }

  const raw = Array.isArray(body?.ids) ? body.ids : [];
  const ids = raw
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .map((id) => id.trim())
    .slice(0, 50);

  if (!ids.length) {
    return NextResponse.json({ ok: false, message: "Thiếu id thông báo." }, { status: 400 });
  }

  const now = new Date();
  try {
    await db.customerAccountNotification.updateMany({
      where: {
        id: { in: ids },
        customerId: session.user.id,
        readAt: null,
      },
      data: { readAt: now },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, message: "Không thể cập nhật." }, { status: 500 });
  }
}
