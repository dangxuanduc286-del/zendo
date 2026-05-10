import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

function mapCategory(
  c: "ORDER" | "PROMOTION" | "SYSTEM" | "COMMISSION",
): "order" | "promotion" | "system" | "commission" {
  if (c === "ORDER") return "order";
  if (c === "PROMOTION") return "promotion";
  if (c === "COMMISSION") return "commission";
  return "system";
}

/** Polling thông báo tài khoản — chỉ trả dữ liệu của user đăng nhập. */
export async function GET(request: Request): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "USER") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const customerId = String(session.user.id);
  const { searchParams } = new URL(request.url);
  const take = Math.min(80, Math.max(1, Number(searchParams.get("take")) || 60));

  try {
    const [unreadTotal, unreadByCategory, notifRows] = await Promise.all([
      db.customerAccountNotification.count({ where: { customerId, readAt: null } }),
      db.customerAccountNotification.groupBy({
        by: ["category"],
        where: { customerId, readAt: null },
        _count: { _all: true },
      }),
      db.customerAccountNotification.findMany({
        where: { customerId },
        orderBy: { createdAt: "desc" },
        take,
        select: {
          id: true,
          category: true,
          title: true,
          body: true,
          actionHref: true,
          readAt: true,
          createdAt: true,
          metadata: true,
        },
      }),
    ]);

    const groups = { order: 0, promotion: 0, system: 0, commission: 0 };
    for (const row of unreadByCategory) {
      const n = row._count._all;
      if (row.category === "ORDER") groups.order += n;
      else if (row.category === "PROMOTION") groups.promotion += n;
      else if (row.category === "COMMISSION") groups.commission += n;
      else groups.system += n;
    }

    return NextResponse.json(
      {
        unread: unreadTotal,
        groups,
        items: notifRows.map((r) => ({
          id: r.id,
          category: mapCategory(r.category),
          title: r.title,
          body: r.body,
          read: r.readAt != null,
          createdAt: r.createdAt.toISOString(),
          actionHref: r.actionHref,
          metadata:
            r.metadata && typeof r.metadata === "object" && !Array.isArray(r.metadata)
              ? (r.metadata as Record<string, unknown>)
              : null,
        })),
      },
      {
        status: 200,
        headers: { "Cache-Control": "private, no-store, max-age=0" },
      },
    );
  } catch {
    return NextResponse.json({ message: "Không tải được thông báo." }, { status: 500 });
  }
}
