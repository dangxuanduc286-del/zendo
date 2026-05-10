import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../lib/auth";
import { parseDealsMetricEventFromAuditLogRow } from "../../../../../lib/deals/aggregation";

async function getDbClient() {
  if (!process.env.DATABASE_URL) return null;
  try {
    const dbModule = await import("../../../../../lib/db");
    return dbModule.db;
  } catch {
    return null;
  }
}

export async function GET(): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const isAdmin = session.user.role === "SUPER_ADMIN" || session.user.role === "ADMIN";
  if (!isAdmin) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const db = await getDbClient();
  if (!db) return NextResponse.json({ message: "Hệ thống chưa cấu hình cơ sở dữ liệu." }, { status: 503 });

  const rows = await db.auditLog.findMany({
    where: {
      entity: "ANALYTICS_EVENT",
      action: { in: ["event:deals_impression", "event:deals_section_view", "event:deals_click", "event:deals_coupon_usage"] },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: { action: true, createdAt: true, metadata: true },
  });

  const items = rows.map(parseDealsMetricEventFromAuditLogRow).filter(Boolean);
  return NextResponse.json({ items });
}

