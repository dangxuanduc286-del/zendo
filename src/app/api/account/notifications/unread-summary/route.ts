import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/** Polling nhẹ: chỉ đếm unread — không tải full danh sách. */
export async function GET(): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "USER") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const customerId = String(session.user.id);

  try {
    const [total, byCategory] = await Promise.all([
      db.customerAccountNotification.count({ where: { customerId, readAt: null } }),
      db.customerAccountNotification.groupBy({
        by: ["category"],
        where: { customerId, readAt: null },
        _count: { _all: true },
      }),
    ]);

    const groups = { order: 0, promotion: 0, system: 0, commission: 0 };
    for (const row of byCategory) {
      const n = row._count._all;
      if (row.category === "ORDER") groups.order += n;
      else if (row.category === "PROMOTION") groups.promotion += n;
      else if (row.category === "SYSTEM") groups.system += n;
      else if (row.category === "COMMISSION") groups.commission += n;
    }

    return NextResponse.json(
      { unread: total, groups },
      { status: 200, headers: { "Cache-Control": "private, no-store, max-age=0" } },
    );
  } catch {
    return NextResponse.json({ message: "Không tải được." }, { status: 500 });
  }
}
