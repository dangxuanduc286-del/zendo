import { NextResponse } from "next/server";
import { formatCtvTierHistoryCsv, getCtvTierHistoryList } from "@/lib/admin/ctv-tier-history-admin";

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const { rows } = await getCtvTierHistoryList({
      query: searchParams.get("q") ?? undefined,
      tierId: searchParams.get("tierId") ?? undefined,
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
      limit: 5000,
    });
    const csv = formatCtvTierHistoryCsv(rows);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="ctv-tier-history.csv"`,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unauthorized";
    return NextResponse.json({ ok: false, message: msg }, { status: msg === "Unauthorized" ? 401 : 500 });
  }
}
