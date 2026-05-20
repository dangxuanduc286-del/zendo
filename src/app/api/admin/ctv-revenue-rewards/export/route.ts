import { NextResponse } from "next/server";
import {
  formatCtvRevenueRewardAuditCsv,
  getCtvRevenueRewardAuditCsvRows,
} from "@/lib/admin/ctv-revenue-reward-audit";

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const rows = await getCtvRevenueRewardAuditCsvRows({
      query: searchParams.get("q") ?? undefined,
      tierId: searchParams.get("tierId") ?? undefined,
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
    });
    const csv = formatCtvRevenueRewardAuditCsv(rows);
    const stamp = new Date().toISOString().slice(0, 10);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="ctv-revenue-rewards-${stamp}.csv"`,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unauthorized";
    const status = msg === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ ok: false, message: msg }, { status });
  }
}
