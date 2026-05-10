import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../lib/auth";
import {
  aggregateDealsMetrics,
  attachConversionSignals,
  parseDealsMetricEventFromAuditLogRow,
} from "../../../../../lib/deals/aggregation";
import { buildDealsPerformanceSummary } from "../../../../../lib/deals/performance";

async function getDbClient() {
  if (!process.env.DATABASE_URL) return null;
  try {
    const dbModule = await import("../../../../../lib/db");
    return dbModule.db;
  } catch {
    return null;
  }
}

export async function GET(request: Request): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const isAdmin = session.user.role === "SUPER_ADMIN" || session.user.role === "ADMIN";
  if (!isAdmin) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const db = await getDbClient();
  if (!db) return NextResponse.json({ message: "Hệ thống chưa cấu hình cơ sở dữ liệu." }, { status: 503 });

  const url = new URL(request.url);
  const days = Math.max(1, Math.min(30, Number(url.searchParams.get("days") ?? "7") || 7));
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const rows = await db.auditLog.findMany({
    where: {
      entity: "ANALYTICS_EVENT",
      action: {
        in: [
          "event:deals_impression",
          "event:deals_section_view",
          "event:deals_click",
          "event:deals_coupon_usage",
          "event:add_to_cart",
          "event:begin_checkout",
        ],
      },
      createdAt: { gte: since },
    },
    orderBy: { createdAt: "desc" },
    take: 4000,
    select: { action: true, createdAt: true, metadata: true },
  });

  const tAgg0 = Date.now();
  const dealsEvents = rows.map(parseDealsMetricEventFromAuditLogRow).filter(Boolean) as import("../../../../../lib/deals/aggregation").DealsMetricEvent[];
  const enriched = attachConversionSignals({ dealsEvents, conversionRows: rows });
  const agg = aggregateDealsMetrics(enriched);
  void (Date.now() - tAgg0);
  const perf = buildDealsPerformanceSummary(agg.bySection);

  return NextResponse.json({ windowDays: days, since: since.toISOString(), totals: agg.totals, performance: perf });
}

