import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";

/**
 * GET /api/account/reward-history?page=1&pageSize=20
 * Trả về lịch sử điểm thưởng (LoyaltyTransaction) của khách hàng đang đăng nhập.
 * Hỗ trợ pagination — không tải toàn bộ dữ liệu trong Dashboard.
 */
export async function GET(request: Request): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "USER") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const dbModule = await import("../../../../lib/db");
    const db = dbModule.db;

    const byId = await db.customer.findUnique({
      where: { id: session.user.id },
      select: { id: true },
    });
    let customerId = byId?.id ?? null;
    if (!customerId) {
      const email = String(session.user.email || "").trim().toLowerCase();
      if (email) {
        const byEmail = await db.customer.findFirst({
          where: { email },
          select: { id: true },
        });
        if (byEmail) customerId = byEmail.id;
      }
    }
    if (!customerId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const pageRaw = Number(url.searchParams.get("page") ?? "1");
    const pageSizeRaw = Number(url.searchParams.get("pageSize") ?? "20");
    const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;
    const pageSize = Number.isFinite(pageSizeRaw) && pageSizeRaw > 0
      ? Math.min(Math.floor(pageSizeRaw), 100)
      : 20;

    const [total, rows] = await Promise.all([
      db.loyaltyTransaction.count({ where: { customerId } }),
      db.loyaltyTransaction.findMany({
        where: { customerId },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          points: true,
          type: true,
          description: true,
          createdAt: true,
          order: { select: { code: true } },
        },
      }),
    ]);

    const items = rows.map((t) => ({
      id: t.id,
      points: t.points,
      type: t.type,
      description: t.description,
      createdAt: t.createdAt.toISOString(),
      orderCode: t.order?.code ?? null,
    }));

    return NextResponse.json({
      items,
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      hasMore: page * pageSize < total,
    });
  } catch {
    return NextResponse.json(
      { message: "Không thể tải lịch sử điểm thưởng." },
      { status: 500 },
    );
  }
}
